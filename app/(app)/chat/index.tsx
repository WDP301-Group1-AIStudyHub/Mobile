import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
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
  Info,
} from 'lucide-react-native'
import { FontSize, Radius, Spacing } from '../../../constants/colors'
import { useColors } from '../../../contexts/ThemeContext'
import { listDocuments } from '../../../services/documentApi'
import { askQuestion, deleteChatHistory, getChatHistory, listChatHistory } from '../../../services/chatApi'
import type { ChatHistoryItem } from '../../../types/chat'
import type { DocumentItem } from '../../../types/document'
import { getSubjectName, getSemesterLabel, groupDocsBySemester, type SemesterGroup } from '../../../utils/chatHelpers'

const DRAWER_WIDTH = 300

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

// Info banner at the top of the chat list
function PageDescription() {
  const C = useColors()
  return (
    <View style={{ paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: C.primaryDim, borderRadius: Radius.md, marginHorizontal: Spacing.md, marginBottom: Spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Info size={14} color={C.primary} />
        <Text style={{ fontSize: FontSize.xs, color: C.primary, flex: 1, lineHeight: 18 }}>
          Chat with AI to ask questions about your documents. Select a specific document to get more accurate answers.
        </Text>
      </View>
    </View>
  )
}

export default function ChatIndexPage() {
  const C = useColors()

  const [messages, setMessages] = useState<Message[]>([WELCOME_MSG])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef<FlatList>(null)
  const isMountedRef = useRef(true)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [histories, setHistories] = useState<ChatHistoryItem[]>([])
  const [histLoading, setHistLoading] = useState(false)

  const [docs, setDocs] = useState<DocumentItem[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [showDocPanel, setShowDocPanel] = useState(false)
  const [pinnedDoc, setPinnedDoc] = useState<DocumentItem | null>(null)
  const [expandedSem, setExpandedSem] = useState<string | null>(null)

  const semesterGroups = groupDocsBySemester(docs)

  const loadDocs = async () => {
    setDocsLoading(true)
    try {
      const result = await listDocuments()
      const list = Array.isArray(result) ? result : []
      if (isMountedRef.current) setDocs(list)
      if (isMountedRef.current && list.length > 0) setExpandedSem(getSemesterLabel(list[0].createdAt))
    } catch {
      if (isMountedRef.current) setDocs([])
    } finally {
      if (isMountedRef.current) setDocsLoading(false)
    }
  }

  useEffect(() => { isMountedRef.current = true; loadDocs(); return () => { isMountedRef.current = false } }, [])
  useEffect(() => { if (showDocPanel) loadDocs() }, [showDocPanel])

  const loadHistory = useCallback(async () => {
    setHistLoading(true)
    try {
      const result = await listChatHistory()
      if (isMountedRef.current) setHistories(Array.isArray(result.histories) ? result.histories : [])
    } catch {
      if (isMountedRef.current) setHistories([])
    } finally {
      if (isMountedRef.current) setHistLoading(false)
    }
  }, [])

  const openDrawer = () => {
    loadHistory()
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
  }

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

  const openSavedChat = (item: ChatHistoryItem) => {
    closeDrawer()
    try {
      const detail = { createdAt: item.createdAt, question: item.question, answer: item.answer }
      const time = new Date(detail.createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
      setMessages([
        { id: 'user-0', role: 'user', content: detail.question, time },
        { id: 'ai-0', role: 'assistant', content: detail.answer, time },
      ])
    } catch {
      const time = new Date(item.createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
      setMessages([
        { id: 'user-0', role: 'user', content: item.question, time },
        { id: 'ai-0', role: 'assistant', content: item.answer, time },
      ])
    }
  }

  const newChat = () => {
    closeDrawer()
    setMessages([WELCOME_MSG])
    setInput('')
    setPinnedDoc(null)
  }

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
        subject: getSubjectName(pinnedDoc?.subject, ''),
        mode: 'basic',
      })
      if (!isMountedRef.current) return
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
      if (!isMountedRef.current) return
      const rawMsg = e instanceof Error ? e.message : 'Something went wrong.'
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
      if (isMountedRef.current) setSending(false)
    }
  }

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user'
    return (
      <View style={[S.msgRow, isUser ? S.msgRowUser : S.msgRowAi]}>
        {!isUser && (
          <View style={[S.aiAvatar, { backgroundColor: C.primary }]}>
            <Sparkles size={14} color="#fff" />
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

  const S = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1 },
        flex: { flex: 1 },

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

        msgList: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xl },
        msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
        msgRowUser: { justifyContent: 'flex-end' },
        msgRowAi: { justifyContent: 'flex-start' },
        aiAvatar: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
        bubble: { maxWidth: '78%', borderRadius: 16, padding: Spacing.md, gap: 6 },
        bubbleUser: { backgroundColor: C.primary, borderBottomRightRadius: 4 },
        bubbleAi: { backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderBottomLeftRadius: 4 },
        bubbleTextUser: { fontSize: FontSize.sm, color: '#fff', lineHeight: 20 },
        bubbleTextAi: { fontSize: FontSize.sm, color: C.text, lineHeight: 20 },
        msgTime: { fontSize: 10, alignSelf: 'flex-end' },
        msgTimeUser: { color: 'rgba(255,255,255,0.55)' },
        msgTimeAi: { color: C.muted },
        typingDot: { color: C.muted, fontSize: FontSize.sm, letterSpacing: 3 },

        inputArea: { borderTopWidth: 1, borderTopColor: C.cardBorder, backgroundColor: 'transparent' },
        pinnedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: 4 },
        pinnedText: { flex: 1, fontSize: FontSize.xs, color: C.primary, fontWeight: '600' },
        inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
        attachBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: C.primaryDim, borderWidth: 1, borderColor: C.primary, alignItems: 'center', justifyContent: 'center' },
        attachBtnActive: { backgroundColor: C.primary },
        textInput: { flex: 1, minHeight: 42, maxHeight: 120, backgroundColor: C.cardElevated, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 14, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: FontSize.sm, color: C.text },
        sendBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
        sendBtnDisabled: { backgroundColor: C.cardElevated, borderWidth: 1, borderColor: C.cardBorder },

        drawerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 100 },
        drawer: {
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: DRAWER_WIDTH,
          backgroundColor: C.card,
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
        newChatBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginHorizontal: Spacing.md, marginTop: Spacing.md, marginBottom: Spacing.sm, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: 12, backgroundColor: C.primary },
        newChatText: { fontSize: FontSize.sm, fontWeight: '700', color: '#fff' },
        sectionLabel: { fontSize: FontSize.xs, fontWeight: '700', color: C.muted, letterSpacing: 0.8, textTransform: 'uppercase', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
        histItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.cardBorder },
        histIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.primaryDim, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
        histInfo: { flex: 1, gap: 2 },
        histTitle: { fontSize: FontSize.sm, fontWeight: '600', color: C.text },
        histMeta: { fontSize: FontSize.xs, color: C.muted },
        histDeleteBtn: { padding: 6 },
        emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingTop: 48 },
        emptyText: { fontSize: FontSize.sm, color: C.muted, textAlign: 'center' },

        panelOverlay: { flex: 1, backgroundColor: 'rgba(10,14,26,0.55)', justifyContent: 'flex-end' },
        panelSheet: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: Spacing.xxl, maxHeight: '80%', minHeight: 320 },
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
    <View style={{ flex: 1 }}>
      <SafeAreaView style={S.safe}>
        <KeyboardAvoidingView style={S.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

          {/* Header */}
          <View style={S.header}>
            <Pressable onPress={openDrawer} style={S.headerBtn}>
              <AlignLeft size={20} color={C.mutedLight} />
            </Pressable>
            <View style={S.headerCenter}>
              <View style={S.aiDot} />
              <Text style={S.headerTitle}>AI Assistant</Text>
            </View>
            <Pressable onPress={newChat} style={S.headerBtn}>
              <Plus size={20} color={C.mutedLight} />
            </Pressable>
          </View>

          {/* Page Description */}
          <PageDescription />

          {/* Messages */}
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
                    <Sparkles size={14} color="#fff" />
                  </View>
                  <View style={[S.bubble, S.bubbleAi]}>
                    <Text style={S.typingDot}>...</Text>
                  </View>
                </View>
              ) : null
            }
          />

          {/* Input area */}
          <View style={S.inputArea}>
            {pinnedDoc && (
              <View style={S.pinnedRow}>
                <FileText size={13} color={C.primary} />
                <Text style={S.pinnedText} numberOfLines={1}>
                  {pinnedDoc.title}
                  {getSubjectName(pinnedDoc.subject, '') ? ` · ${getSubjectName(pinnedDoc.subject, '')}` : ''}
                </Text>
                <Pressable onPress={() => setPinnedDoc(null)} hitSlop={8}>
                  <X size={13} color={C.muted} />
                </Pressable>
              </View>
            )}
            <View style={S.inputBar}>
              <Pressable style={[S.attachBtn, showDocPanel && S.attachBtnActive]} onPress={() => setShowDocPanel(true)}>
                <Paperclip size={20} color={showDocPanel ? '#fff' : C.primary} />
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
              <Pressable
                onPress={sendMessage}
                disabled={!input.trim() || sending}
                style={[S.sendBtn, (!input.trim() || sending) && S.sendBtnDisabled]}
              >
                <Send size={18} color={input.trim() && !sending ? '#fff' : C.muted} />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* History Drawer */}
      {drawerOpen && (
        <>
          <Pressable style={S.drawerOverlay} onPress={() => closeDrawer()} />
          <View style={S.drawer}>
            <View style={S.drawerHeader}>
              <Text style={S.drawerTitle}>History</Text>
              <Pressable onPress={() => closeDrawer()} style={S.drawerCloseBtn}>
                <X size={18} color={C.muted} />
              </Pressable>
            </View>

            <Pressable style={S.newChatBtn} onPress={newChat}>
              <Plus size={16} color="#fff" />
              <Text style={S.newChatText}>New Chat</Text>
            </Pressable>

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
                        <Text style={S.histMeta}>{timeAgo(item.createdAt)}</Text>
                      </View>
                      <Pressable style={S.histDeleteBtn} onPress={() => handleDelete(item)} hitSlop={8}>
                        <Trash2 size={15} color={C.muted} />
                      </Pressable>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}
          </View>
        </>
      )}

      {/* Document Selector Panel */}
      <Modal visible={showDocPanel} transparent animationType="slide" onRequestClose={() => setShowDocPanel(false)}>
        <Pressable style={S.panelOverlay} onPress={() => setShowDocPanel(false)}>
          <View style={S.panelSheet} onStartShouldSetResponder={() => true}>
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
                                  <Text style={S.pinnedBadgeText}>Pinned</Text>
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
          </View>
        </Pressable>
      </Modal>
    </View>
  )
}
