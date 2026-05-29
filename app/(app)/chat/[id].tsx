import { useEffect, useMemo, useRef, useState } from 'react'
import {
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
import { router, useLocalSearchParams } from 'expo-router'
import { ArrowLeft, BookOpen, ChevronDown, ChevronRight, FileText, Paperclip, Send, Sparkles, X } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import VideoBg from '../../../components/ui/VideoBg'
import { FontSize, Spacing, Radius } from '../../../constants/colors'
import { useColors } from '../../../contexts/ThemeContext'
import { listDocuments } from '../../../services/documentApi'
import type { DocumentItem } from '../../../types/document'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  time: string
}

const initialMessages: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: 'Hello! I\'m your AI study assistant. How can I help you today? You can ask me about your uploaded documents, get summaries, or discuss any academic topic.',
    time: '10:00 AM',
  },
]

function getSemesterLabel(isoDate: string): string {
  const d = new Date(isoDate)
  const year = d.getFullYear()
  const month = d.getMonth() + 1 // 1-based
  if (month >= 9 || month <= 1) return `Học kỳ 1 - ${month <= 1 ? year : year}`
  if (month >= 2 && month <= 5) return `Học kỳ 2 - ${year}`
  return `Học kỳ Hè - ${year}`
}

type SemesterGroup = {
  label: string
  subjects: { subject: string; docs: DocumentItem[] }[]
}

function groupDocsBySemester(docs: DocumentItem[]): SemesterGroup[] {
  const map = new Map<string, Map<string, DocumentItem[]>>()
  for (const doc of docs) {
    const sem = getSemesterLabel(doc.createdAt)
    const subj = doc.subject?.trim() || 'Chưa phân loại'
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

export default function ChatConversationPage() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const C = useColors()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const listRef = useRef<FlatList>(null)

  const [docs, setDocs] = useState<DocumentItem[]>([])
  const [showDocPanel, setShowDocPanel] = useState(false)
  const [pinnedDoc, setPinnedDoc] = useState<DocumentItem | null>(null)
  const [expandedSem, setExpandedSem] = useState<string | null>(null)

  const isNewChat = id === 'new'

  useEffect(() => {
    listDocuments().then(setDocs).catch(() => {})
  }, [])

  const semesterGroups = groupDocsBySemester(docs)

  const handlePinDoc = (doc: DocumentItem) => {
    setPinnedDoc(doc)
    setShowDocPanel(false)
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return

    const pinPrefix = pinnedDoc
      ? `[Tài liệu: "${pinnedDoc.title}"${pinnedDoc.subject ? ` — ${pinnedDoc.subject}` : ''}]\n`
      : ''

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: pinPrefix + text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setPinnedDoc(null)
    setLoading(true)

    setTimeout(() => {
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: pinnedDoc
          ? `Đã nhận tài liệu "${pinnedDoc.title}". Dựa trên nội dung tài liệu, đây là phân tích của tôi về "${text}"...`
          : `I understand you're asking about "${text}". Based on your uploaded study materials, here's what I found...`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, aiMsg])
      setLoading(false)
    }, 1200)
  }

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user'
    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAi]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
                <LinearGradient
                  colors={C.gradientPrimary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.aiAvatarGrad}
                >
                  <Sparkles size={14} color="#fff" />
                </LinearGradient>
              </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi]}>
          {isUser ? (
            <Text style={styles.bubbleTextUser}>{item.content}</Text>
          ) : (
            <Text style={styles.bubbleTextAi}>{item.content}</Text>
          )}
          <Text style={[styles.msgTime, isUser ? styles.msgTimeUser : styles.msgTimeAi]}>
            {item.time}
          </Text>
        </View>
      </View>
    )
  }


  const styles = useMemo(() => StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
    backgroundColor: 'rgba(255,255,252,0.92)',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  aiDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.success,
  },
  headerTitle: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: C.text,
  },
  msgList: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  msgRowUser: {
    justifyContent: 'flex-end',
  },
  msgRowAi: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    overflow: 'hidden',
    flexShrink: 0,
  },
  aiAvatarGrad: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 16,
    padding: Spacing.md,
    gap: 6,
  },
  bubbleUser: {
    backgroundColor: C.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAi: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderBottomLeftRadius: 4,
  },
  bubbleTextUser: {
    fontSize: FontSize.sm,
    color: '#fff',
    lineHeight: 20,
  },
  bubbleTextAi: {
    fontSize: FontSize.sm,
    color: C.text,
    lineHeight: 20,
  },
  msgTime: {
    fontSize: 10,
    alignSelf: 'flex-end',
  },
  msgTimeUser: { color: 'rgba(255,255,255,0.6)' },
  msgTimeAi: { color: C.muted },
  typingIndicator: {
    color: C.muted,
    fontSize: FontSize.sm,
    letterSpacing: 2,
  },
  inputArea: {
    borderTopWidth: 1,
    borderTopColor: C.cardBorder,
    backgroundColor: 'rgba(255,255,252,0.97)',
  },
  pinnedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: 4,
  },
  pinnedText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: C.primary,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: 'transparent',
  },
  attachBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.primaryDim,
    borderWidth: 1,
    borderColor: `${C.primary}30`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachBtnActive: {
    backgroundColor: C.primaryDim,
    borderColor: C.primary,
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: C.cardElevated,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 14,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.sm,
    color: C.text,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Doc Panel
  panelOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,14,26,0.55)',
    justifyContent: 'flex-end',
  },
  panelSheet: {
    backgroundColor: C.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    maxHeight: '75%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.cardBorder,
    marginBottom: Spacing.sm,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  panelHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  panelTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: C.text,
  },
  panelSubtitle: {
    fontSize: FontSize.xs,
    color: C.muted,
    marginBottom: Spacing.md,
  },
  panelEmpty: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.sm,
  },
  panelEmptyText: {
    fontSize: FontSize.sm,
    color: C.muted,
  },
  panelScroll: { flex: 1 },
  semSection: {
    marginBottom: Spacing.sm,
  },
  semHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    backgroundColor: C.primaryDim,
    borderRadius: Radius.md,
    marginBottom: 4,
  },
  semHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  semDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.primary,
  },
  semLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: C.primary,
  },
  semCountBadge: {
    backgroundColor: C.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  semCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  subjSection: {
    marginLeft: Spacing.md,
    marginBottom: Spacing.sm,
  },
  subjHeader: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginBottom: 4,
    borderLeftWidth: 2,
    borderLeftColor: C.accent,
  },
  subjLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: C.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    marginBottom: 2,
    backgroundColor: C.cardElevated,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  docRowActive: {
    borderColor: C.primary,
    backgroundColor: C.primaryDim,
  },
  docRowInfo: { flex: 1, gap: 2 },
  docRowTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: C.text,
  },
  docRowTitleActive: {
    color: C.primary,
  },
  docRowMeta: {
    fontSize: FontSize.xs,
    color: C.muted,
  },
  pinnedBadge: {
    backgroundColor: C.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  pinnedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
}), [C])


  return (
    <VideoBg>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
                <ArrowLeft size={20} color={C.mutedLight} />
            </Pressable>
            <View style={styles.headerCenter}>
              <View style={styles.aiDot} />
              <Text style={styles.headerTitle}>
                {isNewChat ? 'New Chat' : 'AI Assistant'}
              </Text>
            </View>
            <View style={{ width: 36 }} />
          </View>

          {/* Messages */}
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.msgList}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              loading ? (
                <View style={[styles.msgRow, styles.msgRowAi]}>
                  <View style={styles.aiAvatar}>
                  <LinearGradient
                    colors={C.gradientPrimary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.aiAvatarGrad}
                  >
                    <Sparkles size={14} color="#fff" />
                  </LinearGradient>
                </View>
                  <View style={[styles.bubble, styles.bubbleAi]}>
                    <Text style={styles.typingIndicator}>●●●</Text>
                  </View>
                </View>
              ) : null
            }
          />

          {/* Input */}
          <View style={styles.inputArea}>
            {/* Pinned Doc Chip */}
            {pinnedDoc && (
              <View style={styles.pinnedRow}>
                <FileText size={13} color={C.primary} />
                <Text style={styles.pinnedText} numberOfLines={1}>
                  {pinnedDoc.title}
                  {pinnedDoc.subject ? ` · ${pinnedDoc.subject}` : ''}
                </Text>
                <Pressable onPress={() => setPinnedDoc(null)} hitSlop={8}>
                  <X size={13} color={C.muted} />
                </Pressable>
              </View>
            )}
            <View style={styles.inputBar}>
              <Pressable style={[styles.attachBtn, showDocPanel && styles.attachBtnActive]} onPress={() => setShowDocPanel(true)}>
                <Paperclip size={20} color={showDocPanel ? C.primary : C.muted} />
              </Pressable>

              <TextInput
                style={styles.textInput}
                placeholder="Ask anything about your studies..."
                  placeholderTextColor={C.muted}
                value={input}
                onChangeText={setInput}
                multiline
                maxLength={2000}
                onSubmitEditing={sendMessage}
              />

              <Pressable onPress={sendMessage} disabled={!input.trim() || loading}>
                <LinearGradient
                  colors={input.trim() && !loading ? C.gradientPrimary : [C.cardBorder, C.cardBorder]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sendBtn}
                >
                  <Send size={18} color={input.trim() && !loading ? '#fff' : C.muted} />
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Document Selector Panel */}
      <Modal
        visible={showDocPanel}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDocPanel(false)}
      >
        <Pressable style={styles.panelOverlay} onPress={() => setShowDocPanel(false)}>
          <Pressable style={styles.panelSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.panelHeader}>
              <View style={styles.panelHeaderLeft}>
                <BookOpen size={18} color={C.primary} />
                <Text style={styles.panelTitle}>Chọn tài liệu</Text>
              </View>
              <Pressable onPress={() => setShowDocPanel(false)} hitSlop={8}>
                <X size={20} color={C.muted} />
              </Pressable>
            </View>
            <Text style={styles.panelSubtitle}>Chọn tài liệu để ghim vào khung chat</Text>

            {docs.length === 0 ? (
              <View style={styles.panelEmpty}>
                <FileText size={32} color={C.muted} strokeWidth={1.5} />
                <Text style={styles.panelEmptyText}>Chưa có tài liệu nào</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={styles.panelScroll}>
                {semesterGroups.map((semGroup) => (
                  <View key={semGroup.label} style={styles.semSection}>
                    {/* Semester Header */}
                    <Pressable
                      onPress={() => setExpandedSem(expandedSem === semGroup.label ? null : semGroup.label)}
                      style={styles.semHeader}
                    >
                      <View style={styles.semHeaderLeft}>
                        <View style={styles.semDot} />
                        <Text style={styles.semLabel}>{semGroup.label}</Text>
                        <View style={styles.semCountBadge}>
                          <Text style={styles.semCountText}>
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
                        <View key={subjGroup.subject} style={styles.subjSection}>
                          {/* Subject Header */}
                          <View style={styles.subjHeader}>
                            <Text style={styles.subjLabel}>{subjGroup.subject}</Text>
                          </View>
                          {/* Documents */}
                          {subjGroup.docs.map((doc) => (
                            <Pressable
                              key={doc.id}
                              onPress={() => handlePinDoc(doc)}
                              style={({ pressed }) => [
                                styles.docRow,
                                pinnedDoc?.id === doc.id && styles.docRowActive,
                                pressed && { opacity: 0.7 },
                              ]}
                            >
                              <FileText size={15} color={pinnedDoc?.id === doc.id ? C.primary : C.muted} />
                              <View style={styles.docRowInfo}>
                                <Text style={[styles.docRowTitle, pinnedDoc?.id === doc.id && styles.docRowTitleActive]} numberOfLines={1}>
                                  {doc.title}
                                </Text>
                                <Text style={styles.docRowMeta} numberOfLines={1}>
                                  {doc.fileName}
                                </Text>
                              </View>
                              {pinnedDoc?.id === doc.id && (
                                <View style={styles.pinnedBadge}>
                                  <Text style={styles.pinnedBadgeText}>Đã ghim</Text>
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