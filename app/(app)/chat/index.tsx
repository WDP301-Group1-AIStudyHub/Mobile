import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  AlignLeft,
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  MessageCircle,
  Paperclip,
  Plus,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import VideoBg from '../../../components/ui/VideoBg'
import { FontSize, Radius, Spacing } from '../../../constants/colors'
import { useColors } from '../../../contexts/ThemeContext'
import { listDocuments } from '../../../services/documentApi'
import { askQuestion, deleteChatHistory, getChatHistory, listChatHistory } from '../../../services/chatApi'
import type { ChatHistoryItem } from '../../../types/chat'
import type { DocumentItem } from '../../../types/document'

const DRAWER_WIDTH = Dimensions.get('window').width * 0.82

// ── Helpers ───────────────────────────────────────────────────────────────────

type Message = { id: string; role: 'user' | 'assistant'; content: string; time: string }

const WELCOME_MSG: Message = {
  id: 'welcome',
  role: 'assistant',
  content: 'Hello! I am your AI study assistant. Ask me anything about your documents or any academic topic!',
  time: '',
}

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

function getSemesterLabel(isoDate: string | undefined): string {
  if (!isoDate) return 'Unknown'
  const d = new Date(isoDate)
  if (isNaN(d.getTime())) return 'Unknown'
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  if (month >= 9 || month <= 1) return `Semester 1 - ${year}`
  if (month >= 2 && month <= 5) return `Semester 2 - ${year}`
  return `Summer - ${year}`
}

type SemesterGroup = { label: string; subjects: { subject: string; docs: DocumentItem[] }[] }

function groupDocsBySemester(docs: DocumentItem[]): SemesterGroup[] {
  const map = new Map<string, Map<string, DocumentItem[]>>()
  for (const doc of docs) {
    const sem = getSemesterLabel(doc.createdAt)
    const subj = doc.subject?.trim() || 'Uncategorized'
    if (!map.has(sem)) map.set(sem, new Map())
    const subjMap = map.get(sem)!
    if (!subjMap.has(subj)) subjMap.set(subj, [])
    subjMap.get(subj)!.push(doc)
  }
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([label, subjMap]) => ({
      label,
      subjects: Array.from(subjMap.entries()).map(([subject, docs]) => ({ subject, docs })),
    }))
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChatIndexPage() {
  const C = useColors()

  // ── Chat state ──────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>([WELCOME_MSG])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef<FlatList>(null)

  // ── History drawer ──────────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false)
  const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current
  const [histories, setHistories] = useState<ChatHistoryItem[]>([])
  const [histLoading, setHistLoading] = useState(false)

  // ── Doc panel ───────────────────────────────────────────────────────────────
  const [docs, setDocs] = useState<DocumentItem[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [showDocPanel, setShowDocPanel] = useState(false)
  const [pinnedDoc, setPinnedDoc] = useState<DocumentItem | null>(null)
  const [expandedSem, setExpandedSem] = useState<string | null>(null)

  const semesterGroups = groupDocsBySemester(docs)

  // ── Load docs ────────────────────────────────────────────────────────────────
  const loadDocs = async () => {
    setDocsLoading(true)
    try {
      const result = await listDocuments()
      const list = Array.isArray(result) ? result : []
      setDocs(list)
      if (list.length > 0) setExpandedSem(getSemesterLabel(list[0].createdAt))
    } catch {
      setDocs([])
    } finally {
      setDocsLoading(false)
    }
  }

  useEffect(() => { loadDocs() }, [])
  useEffect(() => { if (showDocPanel) loadDocs() }, [showDocPanel])

  // ── Load history ─────────────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    setHistLoading(true)
    try {
      const result = await listChatHistory()
      setHistories(Array.isArray(result.histories) ? result.histories : [])
    } catch {
      setHistories([])
    } finally {
      setHistLoading(false)
    }
  }, [])

  // ── Drawer animation ─────────────────────────────────────────────────────────
  const openDrawer = () => {
    loadHistory()
    setDrawerOpen(true)
    Animated.spring(drawerAnim, {
      toValue: 0,
      useNativeDriver: true,
      damping: 20,
      stiffness: 180,
    }).start()
  }

  const closeDrawer = (onDone?: () => void) => {
    Animated.timing(drawerAnim, {
      toValue: -DRAWER_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setDrawerOpen(false)
      onDone?.()
    })
  }

  // ── Delete history item ───────────────────────────────────────────────────────
  const handleDelete = (item: ChatHistoryItem) => {
    Alert.alert('Delete Conversation', 'Are you sure you want to delete this conversation?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteChatHistory(item.id)
            setHistories((prev) => prev.filter((h) => h.id !== item.id))
          } catch {
            Alert.alert('Error', 'Could not delete this conversation.')
          }
        },
      },
    ])
  }

  // ── Open saved chat ───────────────────────────────────────────────────────────
  const openSavedChat = (item: ChatHistoryItem) => {
    // Đóng drawer TRƯỚC, sau khi animation xong mới fetch + set state
    // Tránh crash do state update khi component đang re-render từ animation
    closeDrawer(async () => {
      try {
        const detail = await getChatHistory(item.id)
        const time = new Date(detail.createdAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
        setMessages([
          { id: 'user-0', role: 'user', content: detail.question, time },
          { id: 'ai-0', role: 'assistant', content: detail.answer, time },
        ])
      } catch {
        // Nếu API lỗi → hiển thị nội dung có sẵn từ list (không navigate)
        const time = new Date(item.createdAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
        setMessages([
          { id: 'user-0', role: 'user', content: item.question, time },
          { id: 'ai-0', role: 'assistant', content: item.answer, time },
        ])
      }
    })
  }

  // ── New chat ──────────────────────────────────────────────────────────────────
  const newChat = () => {
    if (drawerOpen) {
      closeDrawer(() => {
        setMessages([WELCOME_MSG])
        setInput('')
        setPinnedDoc(null)
      })
    } else {
      setMessages([WELCOME_MSG])
      setInput('')
      setPinnedDoc(null)
    }
  }

  // ── Send message ──────────────────────────────────────────────────────────────
  const sendMessage = async () => {
    const text = input.trim()
    if (!text || sending) return

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, time: now }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setSending(true)

    try {
      const result = await askQuestion({
        question: text,
        documentId: pinnedDoc?.id,
        subject: pinnedDoc?.subject,
        mode: 'basic',
      })
      setPinnedDoc(null)
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.answer,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } catch (e) {
      const rawMsg = e instanceof Error ? e.message : 'Có lỗi xảy ra.'
      const isIndexError =
        rawMsg.toLowerCase().includes('pinecone') ||
        rawMsg.toLowerCase().includes('dimension') ||
        rawMsg.toLowerCase().includes('index') ||
        rawMsg.toLowerCase().includes('embed')
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: isIndexError
            ? 'The AI document search feature is currently under maintenance. You can still ask general knowledge questions!'
            : rawMsg,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setSending(false)
    }
  }

  // ── Render message ─────────────────────────────────────────────────────────────
  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user'
    return (
      <View style={[S.msgRow, isUser ? S.msgRowUser : S.msgRowAi]}>
        {!isUser && (
          <View style={S.aiAvatar}>
            <LinearGradient colors={C.gradientPrimary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.aiAvatarGrad}>
              <Sparkles size={14} color="#fff" />
            </LinearGradient>
          </View>
        )}
        <View style={[S.bubble, isUser ? S.bubbleUser : S.bubbleAi]}>
          <Text style={isUser ? S.bubbleTextUser : S.bubbleTextAi}>{item.content}</Text>
          {item.time ? (
            <Text style={[S.msgTime, isUser ? S.msgTimeUser : S.msgTimeAi]}>{item.time}</Text>
          ) : null}
        </View>
      </View>
    )
  }

  // ── Styles ──────────────────────────────────────────────────────────────────
  const S = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1 },
        flex: { flex: 1 },

        // Header
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: C.cardBorder,
          backgroundColor: 'transparent',
          gap: Spacing.sm,
        },
        headerBtn: {
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: C.primaryDim,
          alignItems: 'center',
          justifyContent: 'center',
        },
        headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
        aiDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.success },
        headerTitle: { fontSize: FontSize.base, fontWeight: '700', color: C.text },

        // Messages
        msgList: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xl },
        msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
        msgRowUser: { justifyContent: 'flex-end' },
        msgRowAi: { justifyContent: 'flex-start' },
        aiAvatar: { width: 30, height: 30, borderRadius: 10, overflow: 'hidden', flexShrink: 0 },
        aiAvatarGrad: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
        bubble: { maxWidth: '78%', borderRadius: 16, padding: Spacing.md, gap: 6 },
        bubbleUser: { backgroundColor: C.primary, borderBottomRightRadius: 4 },
        bubbleAi: { backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderBottomLeftRadius: 4 },
        bubbleTextUser: { fontSize: FontSize.sm, color: '#fff', lineHeight: 20 },
        bubbleTextAi: { fontSize: FontSize.sm, color: C.text, lineHeight: 20 },
        msgTime: { fontSize: 10, alignSelf: 'flex-end' },
        msgTimeUser: { color: 'rgba(255,255,255,0.55)' },
        msgTimeAi: { color: C.muted },
        typingDot: { color: C.muted, fontSize: FontSize.sm, letterSpacing: 3 },

        // Input
        inputArea: { borderTopWidth: 1, borderTopColor: C.cardBorder, backgroundColor: 'transparent' },
        pinnedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: 4 },
        pinnedText: { flex: 1, fontSize: FontSize.xs, color: C.primary, fontWeight: '600' },
        inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
        attachBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: C.primaryDim, borderWidth: 1, borderColor: `${C.primary}30`, alignItems: 'center', justifyContent: 'center' },
        attachBtnActive: { borderColor: C.primary },
        textInput: { flex: 1, minHeight: 42, maxHeight: 120, backgroundColor: C.cardElevated, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 14, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: FontSize.sm, color: C.text },
        sendBtn: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

        // Drawer
        drawerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 100 },
        drawer: {
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: DRAWER_WIDTH,
          backgroundColor: C.background,
          zIndex: 101,
          paddingTop: Platform.OS === 'ios' ? 54 : 36,
          shadowColor: '#000',
          shadowOffset: { width: 4, height: 0 },
          shadowOpacity: 0.25,
          shadowRadius: 20,
          elevation: 24,
        },
        drawerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: C.cardBorder },
        drawerTitle: { fontSize: FontSize.lg, fontWeight: '800', color: C.text },
        drawerCloseBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.primaryDim, alignItems: 'center', justifyContent: 'center' },
        newChatBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginHorizontal: Spacing.md, marginTop: Spacing.md, marginBottom: Spacing.sm, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: 12, overflow: 'hidden' },
        newChatGrad: { ...StyleSheet.absoluteFillObject, borderRadius: 12 },
        newChatText: { fontSize: FontSize.sm, fontWeight: '700', color: '#fff' },
        sectionLabel: { fontSize: FontSize.xs, fontWeight: '700', color: C.muted, letterSpacing: 0.8, textTransform: 'uppercase', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
        histItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: `${C.cardBorder}60` },
        histIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.primaryDim, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
        histInfo: { flex: 1, gap: 2 },
        histTitle: { fontSize: FontSize.sm, fontWeight: '600', color: C.text },
        histMeta: { fontSize: FontSize.xs, color: C.muted },
        histDeleteBtn: { padding: 6 },
        emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingTop: 48 },
        emptyText: { fontSize: FontSize.sm, color: C.muted, textAlign: 'center' },

        // Doc panel
        panelOverlay: { flex: 1, backgroundColor: 'rgba(10,14,26,0.55)', justifyContent: 'flex-end' },
        panelSheet: { backgroundColor: C.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: Spacing.xxl, maxHeight: '80%', minHeight: 320 },
        sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.cardBorder, marginBottom: Spacing.sm },
        panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
        panelHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
        panelTitle: { fontSize: FontSize.lg, fontWeight: '800', color: C.text },
        panelSubtitle: { fontSize: FontSize.xs, color: C.muted, marginBottom: Spacing.md },
        panelEmpty: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
        panelEmptyText: { fontSize: FontSize.sm, color: C.muted },
        panelScroll: { flex: 1, minHeight: 120 },
        semSection: { marginBottom: Spacing.sm },
        semHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm, backgroundColor: C.primaryDim, borderRadius: Radius.md, marginBottom: 4 },
        semHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        semDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary },
        semLabel: { fontSize: FontSize.sm, fontWeight: '700', color: C.primary },
        semCountBadge: { backgroundColor: C.primary, borderRadius: Radius.full, paddingHorizontal: 6, paddingVertical: 1 },
        semCountText: { fontSize: 10, fontWeight: '700', color: '#fff' },
        subjSection: { marginLeft: Spacing.md, marginBottom: Spacing.sm },
        subjHeader: { paddingVertical: 4, paddingHorizontal: 6, marginBottom: 4, borderLeftWidth: 2, borderLeftColor: C.accent },
        subjLabel: { fontSize: FontSize.xs, fontWeight: '700', color: C.accent, textTransform: 'uppercase', letterSpacing: 0.5 },
        docRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm, borderRadius: Radius.md, marginBottom: 2, backgroundColor: C.cardElevated, borderWidth: 1, borderColor: C.cardBorder },
        docRowActive: { borderColor: C.primary, backgroundColor: C.primaryDim },
        docRowInfo: { flex: 1, gap: 2 },
        docRowTitle: { fontSize: FontSize.sm, fontWeight: '600', color: C.text },
        docRowTitleActive: { color: C.primary },
        docRowMeta: { fontSize: FontSize.xs, color: C.muted },
        pinnedBadge: { backgroundColor: C.primary, borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2 },
        pinnedBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
      }),
    [C],
  )

  return (
    <VideoBg>
      <SafeAreaView style={S.safe}>
        <KeyboardAvoidingView style={S.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

          {/* ── Header ── */}
          <View style={S.header}>
            {/* History menu button */}
            <Pressable onPress={openDrawer} style={S.headerBtn}>
              <AlignLeft size={20} color={C.mutedLight} />
            </Pressable>

            {/* Title */}
            <View style={S.headerCenter}>
              <View style={S.aiDot} />
              <Text style={S.headerTitle}>AI Assistant</Text>
            </View>

            {/* New chat button */}
            <Pressable onPress={newChat} style={S.headerBtn}>
              <Plus size={20} color={C.mutedLight} />
            </Pressable>
          </View>

          {/* ── Messages ── */}
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderMessage}
            contentContainerStyle={S.msgList}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              sending ? (
                <View style={[S.msgRow, S.msgRowAi]}>
                  <View style={S.aiAvatar}>
                    <LinearGradient colors={C.gradientPrimary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.aiAvatarGrad}>
                      <Sparkles size={14} color="#fff" />
                    </LinearGradient>
                  </View>
                  <View style={[S.bubble, S.bubbleAi]}>
                    <Text style={S.typingDot}>●●●</Text>
                  </View>
                </View>
              ) : null
            }
          />

          {/* ── Input area ── */}
          <View style={S.inputArea}>
            {pinnedDoc && (
              <View style={S.pinnedRow}>
                <FileText size={13} color={C.primary} />
                <Text style={S.pinnedText} numberOfLines={1}>
                  {pinnedDoc.title}{pinnedDoc.subject ? ` · ${pinnedDoc.subject}` : ''}
                </Text>
                <Pressable onPress={() => setPinnedDoc(null)} hitSlop={8}>
                  <X size={13} color={C.muted} />
                </Pressable>
              </View>
            )}
            <View style={S.inputBar}>
              <Pressable style={[S.attachBtn, showDocPanel && S.attachBtnActive]} onPress={() => setShowDocPanel(true)}>
                <Paperclip size={20} color={showDocPanel ? C.primary : C.muted} />
              </Pressable>
              <TextInput
                style={S.textInput}
                placeholder="Ask AI anything..."
                placeholderTextColor={C.muted}
                value={input}
                onChangeText={(t) => { if (t.length <= 2000) setInput(t) }}
                multiline
                onSubmitEditing={sendMessage}
              />
              <Pressable onPress={sendMessage} disabled={!input.trim() || sending}>
                <LinearGradient
                  colors={input.trim() && !sending ? C.gradientPrimary : [C.cardBorder, C.cardBorder]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={S.sendBtn}
                >
                  <Send size={18} color={input.trim() && !sending ? '#fff' : C.muted} />
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* ── History Drawer ── */}
      {drawerOpen && (
        <>
          {/* Overlay */}
          <Pressable style={S.drawerOverlay} onPress={() => closeDrawer()} />

          {/* Drawer panel */}
          <Animated.View style={[S.drawer, { transform: [{ translateX: drawerAnim }] }]}>
            {/* Drawer Header */}
            <View style={S.drawerHeader}>
              <Text style={S.drawerTitle}>History</Text>
              <Pressable onPress={() => closeDrawer()} style={S.drawerCloseBtn}>
                <X size={18} color={C.muted} />
              </Pressable>
            </View>

            {/* New Chat button */}
            <Pressable style={S.newChatBtn} onPress={newChat}>
              <LinearGradient colors={C.gradientPrimary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.newChatGrad} />
              <Plus size={16} color="#fff" />
              <Text style={S.newChatText}>New Chat</Text>
            </Pressable>

            {/* History list */}
            {histLoading ? (
              <View style={S.emptyBox}>
                <ActivityIndicator size="small" color={C.primary} />
                <Text style={S.emptyText}>Loading history...</Text>
              </View>
            ) : histories.length === 0 ? (
              <View style={S.emptyBox}>
                <MessageCircle size={36} color={C.muted} strokeWidth={1.5} />
                <Text style={S.emptyText}>No conversations yet</Text>
              </View>
            ) : (
              <>
                <Text style={S.sectionLabel}>Recent</Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {histories.map((item) => (
                    <Pressable
                      key={item.id}
                      style={({ pressed }) => [S.histItem, pressed && { opacity: 0.7 }]}
                      onPress={() => openSavedChat(item)}
                    >
                      <View style={S.histIcon}>
                        <MessageCircle size={16} color={C.primaryLight} />
                      </View>
                      <View style={S.histInfo}>
                        <Text style={S.histTitle} numberOfLines={1}>{item.question}</Text>
                        <Text style={S.histMeta}>{timeAgo(item.createdAt)} · {item.mode === 'corrective' ? 'Corrective RAG' : 'Basic RAG'}</Text>
                      </View>
                      <Pressable style={S.histDeleteBtn} onPress={() => handleDelete(item)} hitSlop={8}>
                        <Trash2 size={15} color={C.muted} />
                      </Pressable>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}
          </Animated.View>
        </>
      )}

      {/* ── Document Selector Panel ── */}
      <Modal visible={showDocPanel} transparent animationType="slide" onRequestClose={() => setShowDocPanel(false)}>
        <Pressable style={S.panelOverlay} onPress={() => setShowDocPanel(false)}>
          <Pressable style={S.panelSheet} onPress={(e) => e.stopPropagation()}>
            <View style={S.sheetHandle} />
            <View style={S.panelHeader}>
              <View style={S.panelHeaderLeft}>
                <BookOpen size={18} color={C.primary} />
                <Text style={S.panelTitle}>Select Document</Text>
              </View>
              <Pressable onPress={() => setShowDocPanel(false)} hitSlop={8}>
                <X size={20} color={C.muted} />
              </Pressable>
            </View>
            <Text style={S.panelSubtitle}>Select a document to pin to your chat</Text>

            {docsLoading ? (
              <View style={S.panelEmpty}>
                <ActivityIndicator size="small" color={C.primary} />
                <Text style={S.panelEmptyText}>Loading documents...</Text>
              </View>
            ) : docs.length === 0 ? (
              <View style={S.panelEmpty}>
                <FileText size={32} color={C.muted} strokeWidth={1.5} />
                <Text style={S.panelEmptyText}>No documents yet</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={S.panelScroll}>
                {semesterGroups.map((semGroup) => (
                  <View key={semGroup.label} style={S.semSection}>
                    <Pressable
                      onPress={() => setExpandedSem(expandedSem === semGroup.label ? null : semGroup.label)}
                      style={S.semHeader}
                    >
                      <View style={S.semHeaderLeft}>
                        <View style={S.semDot} />
                        <Text style={S.semLabel}>{semGroup.label}</Text>
                        <View style={S.semCountBadge}>
                          <Text style={S.semCountText}>
                            {semGroup.subjects.reduce((s, g) => s + g.docs.length, 0)}
                          </Text>
                        </View>
                      </View>
                      {expandedSem === semGroup.label
                        ? <ChevronDown size={16} color={C.muted} />
                        : <ChevronRight size={16} color={C.muted} />}
                    </Pressable>
                    {(expandedSem === semGroup.label || semesterGroups.length === 1) &&
                      semGroup.subjects.map((subjGroup) => (
                        <View key={subjGroup.subject} style={S.subjSection}>
                          <View style={S.subjHeader}>
                            <Text style={S.subjLabel}>{subjGroup.subject}</Text>
                          </View>
                          {subjGroup.docs.map((doc) => (
                            <Pressable
                              key={doc.id}
                              onPress={() => { setPinnedDoc(doc); setShowDocPanel(false) }}
                              style={({ pressed }) => [S.docRow, pinnedDoc?.id === doc.id && S.docRowActive, pressed && { opacity: 0.7 }]}
                            >
                              <FileText size={15} color={pinnedDoc?.id === doc.id ? C.primary : C.muted} />
                              <View style={S.docRowInfo}>
                                <Text style={[S.docRowTitle, pinnedDoc?.id === doc.id && S.docRowTitleActive]} numberOfLines={1}>{doc.title}</Text>
                                <Text style={S.docRowMeta} numberOfLines={1}>{doc.fileName}</Text>
                              </View>
                              {pinnedDoc?.id === doc.id && (
                                <View style={S.pinnedBadge}>
                                  <Text style={S.pinnedBadgeText}>Đã ghim</Text>
                                </View>
                              )}
                            </Pressable>
                          ))}
                        </View>
                      ))}
                  </View>
                ))}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </VideoBg>
  )
}
