import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
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
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  GraduationCap,
  Library,
  MessageCircle,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react-native'
import { FontSize, Radius, Spacing } from '../../../constants/colors'
import { useColors } from '../../../contexts/ThemeContext'
import {
  askQuestion,
  deleteChatThread,
  getChatThreadById,
  listChatThreads,
  ChatThreadItem,
} from '../../../services/chatApi'
import { listDocuments } from '../../../services/documentApi'
import type { AskPayload } from '../../../types/chat'
import type { DocumentItem } from '../../../types/document'
import { normalizeAccessibleDocuments } from '../../../utils/accessibleDocuments'
import {
  getDocumentSubjectId,
  getDocumentSubjectKey,
  getDocumentSubjectName,
  groupDocsBySemester,
} from '../../../utils/chatHelpers'

type Message = { id: string; role: 'user' | 'assistant'; content: string; time: string }

const WELCOME_MSG: Message = {
  id: 'welcome',
  role: 'assistant',
  content: 'Hello! I am your AI study assistant. Choose a subject or document first, then ask about your study material.',
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

export default function ChatIndexPage() {
  const C = useColors()

  const [inChatMode, setInChatMode] = useState(false)
  const [activeTab, setActiveTab] = useState<'context' | 'history'>('context')

  const [messages, setMessages] = useState<Message[]>([WELCOME_MSG])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef<FlatList>(null)
  const isMountedRef = useRef(true)

  const [threads, setThreads] = useState<ChatThreadItem[]>([])
  const [currentThreadId, setCurrentThreadId] = useState<string | undefined>(undefined)
  const [histLoading, setHistLoading] = useState(false)

  const [docs, setDocs] = useState<DocumentItem[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([])
  const [expandedSemesters, setExpandedSemesters] = useState<Set<string>>(new Set())
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set())

  const docsById = useMemo(() => new Map(docs.map((doc) => [doc.id, doc])), [docs])
  const selectedDocs = useMemo(
    () => selectedDocIds.map((id) => docsById.get(id)).filter((doc): doc is DocumentItem => Boolean(doc)),
    [docsById, selectedDocIds],
  )
  const selectedSubjectKey = selectedDocs[0] ? getDocumentSubjectKey(selectedDocs[0]) : undefined
  const semesterGroups = useMemo(() => groupDocsBySemester(docs), [docs])

  const selectedContextLabel = useMemo(() => {
    if (selectedDocs.length === 0) return 'Choose subject'
    const subject = getDocumentSubjectName(selectedDocs[0], 'Selected subject')
    if (selectedDocs.length === 1) return subject || selectedDocs[0].fileName
    return `${selectedDocs.length} documents - ${subject}`
  }, [selectedDocs])
  const hasStudyContext = selectedDocs.length > 0

  const loadDocs = useCallback(async () => {
    setDocsLoading(true)
    try {
      const list = await listDocuments()
      if (!isMountedRef.current) return
      const accessible = normalizeAccessibleDocuments(list)
      setDocs(accessible)
      const groups = groupDocsBySemester(accessible)
      setExpandedSemesters(new Set(groups.map((group) => group.label)))
      setExpandedSubjects(new Set(groups.flatMap((group) => group.subjects.map((subject) => `${group.label}::${subject.key}`))))
    } catch {
      if (isMountedRef.current) setDocs([])
    } finally {
      if (isMountedRef.current) setDocsLoading(false)
    }
  }, [])

  const loadHistory = useCallback(async () => {
    setHistLoading(true)
    try {
      const result = await listChatThreads()
      if (isMountedRef.current) setThreads(result)
    } catch {
      if (isMountedRef.current) setThreads([])
    } finally {
      if (isMountedRef.current) setHistLoading(false)
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    loadDocs()
    loadHistory()
    return () => {
      isMountedRef.current = false
    }
  }, [loadDocs, loadHistory])

  const newChat = () => {
    setMessages([WELCOME_MSG])
    setInput('')
    setCurrentThreadId(undefined)
    setSelectedDocIds([])
    setInChatMode(false)
  }

  const handleDeleteThread = (thread: ChatThreadItem) => {
    const threadId = thread.id || thread._id || ''
    Alert.alert('Delete Conversation', 'Are you sure you want to delete this conversation?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteChatThread(threadId)
            setThreads((prev) => prev.filter((t) => (t.id || t._id) !== threadId))
            if (currentThreadId === threadId) {
              newChat()
            }
          } catch {
            Alert.alert('Error', 'Could not delete this conversation.')
          }
        },
      },
    ])
  }

  const openSavedThread = async (thread: ChatThreadItem) => {
    const threadId = thread.id || thread._id || ''
    setHistLoading(true)
    try {
      const detail = await getChatThreadById(threadId)
      if (!isMountedRef.current) return
      setSelectedDocIds(detail.thread.documentIds?.length ? detail.thread.documentIds : detail.thread.documentId ? [detail.thread.documentId] : [])
      const mapped: Message[] = detail.messages.flatMap((msg) => [
        { id: `${msg._id || msg.id}-user`, role: 'user', content: msg.question, time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
        { id: `${msg._id || msg.id}-ai`, role: 'assistant', content: msg.answer, time: new Date(msg.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ])
      setMessages(mapped.length ? mapped : [WELCOME_MSG])
      setCurrentThreadId(threadId)
      setInChatMode(true)
    } catch (err: any) {
      Alert.alert('Load Thread Failed', err.message || 'Could not load conversation.')
    } finally {
      if (isMountedRef.current) setHistLoading(false)
    }
  }

  const toggleSemester = (label: string) => {
    setExpandedSemesters((current) => {
      const next = new Set(current)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  const toggleSubjectOpen = (key: string) => {
    setExpandedSubjects((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const clearContext = () => setSelectedDocIds([])

  const toggleSubjectSelection = (subjectDocs: DocumentItem[]) => {
    const ids = subjectDocs.map((doc) => doc.id)
    const allSelected = ids.length > 0 && ids.every((id) => selectedDocIds.includes(id))
    setSelectedDocIds(allSelected ? [] : ids)
  }

  const toggleDocumentSelection = (doc: DocumentItem) => {
    const docSubjectKey = getDocumentSubjectKey(doc)
    setSelectedDocIds((current) => {
      const selectedFromSameSubject =
        current.length === 0 ||
        current
          .map((id) => docsById.get(id))
          .filter((item): item is DocumentItem => Boolean(item))
          .every((item) => getDocumentSubjectKey(item) === docSubjectKey)

      if (!selectedFromSameSubject) return [doc.id]
      if (current.includes(doc.id)) return current.filter((id) => id !== doc.id)
      return [...current, doc.id]
    })
  }

  const buildAskPayload = (question: string): AskPayload => {
    const firstDoc = selectedDocs[0]
    const subject = firstDoc ? getDocumentSubjectName(firstDoc, '') : undefined
    const subjectId = firstDoc ? getDocumentSubjectId(firstDoc) : undefined

    if (selectedDocs.length === 0) {
      throw new Error('Please choose a subject before chatting.')
    }

    const payload: AskPayload = {
      question,
      subject,
      subjectId,
      scope: selectedDocs.length === 1 ? 'single_document' : 'document_set',
    }

    if (selectedDocs.length === 1) {
      payload.documentId = selectedDocs[0].id
    } else {
      payload.documentIds = selectedDocs.map((doc) => doc.id)
    }

    if (currentThreadId) {
      payload.threadId = currentThreadId
    }

    return payload
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || sending) return
    if (!hasStudyContext) {
      setInChatMode(false)
      setActiveTab('context')
      return
    }

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'user', content: text, time: now }])
    setInput('')
    setSending(true)

    try {
      const result = await askQuestion(buildAskPayload(text))
      if (!isMountedRef.current) return
      if (result.threadId) setCurrentThreadId(result.threadId)

      const answerId = (Date.now() + 1).toString()
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

      // Append a message with empty content first
      setMessages((prev) => [
        ...prev,
        {
          id: answerId,
          role: 'assistant',
          content: '',
          time: timeStr,
        },
      ])

      // Stream the text to simulate typewriter running text typing effect
      const finalAnswer = result.answer
      let currentText = ''
      const chunkSize = 4
      const delayMs = 12

      for (let i = 0; i < finalAnswer.length; i += chunkSize) {
        if (!isMountedRef.current) break
        currentText += finalAnswer.slice(i, i + chunkSize)
        setMessages((prev) =>
          prev.map((m) => (m.id === answerId ? { ...m, content: currentText } : m))
        )
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }

      loadHistory()
    } catch (e) {
      if (!isMountedRef.current) return
      const rawMsg = e instanceof Error ? e.message : 'Something went wrong.'
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: rawMsg,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      if (isMountedRef.current) setSending(false)
    }
  }

  const S = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: C.background },
        flex: { flex: 1 },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: C.cardBorder,
          backgroundColor: C.background,
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
        headerCenter: { flex: 1, gap: 2 },
        headerTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
        aiDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.success },
        headerTitle: { fontSize: FontSize.base, fontWeight: '800', color: C.text },
        contextButton: {
          alignSelf: 'center',
          maxWidth: '100%',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: Radius.full,
          backgroundColor: C.card,
          borderWidth: 1,
          borderColor: C.cardBorder,
        },
        contextButtonText: { flexShrink: 1, fontSize: FontSize.xs, color: C.textSecondary, fontWeight: '700' },
        msgList: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl + 32 },
        msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
        msgRowUser: { justifyContent: 'flex-end' },
        msgRowAi: { justifyContent: 'flex-start' },
        aiAvatar: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: C.primary },
        bubble: { maxWidth: '78%', borderRadius: 16, padding: Spacing.md, gap: 6 },
        bubbleUser: { backgroundColor: C.primary, borderBottomRightRadius: 4 },
        bubbleAi: { backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderBottomLeftRadius: 4 },
        bubbleTextUser: { fontSize: FontSize.sm, color: '#fff', lineHeight: 20 },
        bubbleTextAi: { fontSize: FontSize.sm, color: C.text, lineHeight: 20 },
        msgTime: { fontSize: 10, alignSelf: 'flex-end' },
        msgTimeUser: { color: 'rgba(255,255,255,0.55)' },
        msgTimeAi: { color: C.muted },
        typingDot: { color: C.muted, fontSize: FontSize.sm, letterSpacing: 3 },
        inputArea: { borderTopWidth: 1, borderTopColor: C.cardBorder, backgroundColor: C.background },
        inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
        attachBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: C.primaryDim, borderWidth: 1, borderColor: C.primary, alignItems: 'center', justifyContent: 'center' },
        textInput: { flex: 1, minHeight: 42, maxHeight: 120, backgroundColor: C.cardElevated, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 14, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: FontSize.sm, color: C.text },
        textInputDisabled: { opacity: 0.72 },
        sendBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
        sendBtnDisabled: { backgroundColor: C.cardElevated, borderWidth: 1, borderColor: C.cardBorder },
        
        // Inline layout styles
        tabsContainer: {
          flexDirection: 'row',
          marginHorizontal: Spacing.md,
          marginTop: Spacing.sm,
          marginBottom: Spacing.sm,
          backgroundColor: C.cardElevated,
          borderRadius: 12,
          padding: 4,
          borderWidth: 1,
          borderColor: C.cardBorder,
        },
        tabButton: {
          flex: 1,
          paddingVertical: 10,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
        },
        tabButtonActive: {
          backgroundColor: C.primary,
        },
        tabButtonText: {
          fontSize: FontSize.sm,
          fontWeight: '700',
          color: C.muted,
        },
        tabButtonTextActive: {
          color: '#fff',
        },
        startChatBtn: {
          backgroundColor: C.primary,
          paddingVertical: 14,
          marginHorizontal: Spacing.md,
          marginVertical: Spacing.md,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: C.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 4,
        },
        startChatBtnText: {
          fontSize: FontSize.base,
          fontWeight: '800',
          color: '#fff',
        },
        
        histItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.cardBorder },
        histIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.primaryDim, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
        histInfo: { flex: 1, gap: 2 },
        histTitle: { fontSize: FontSize.sm, fontWeight: '600', color: C.text },
        histMeta: { fontSize: FontSize.xs, color: C.muted },
        histDeleteBtn: { padding: 6 },
        emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingTop: 48 },
        emptyText: { fontSize: FontSize.sm, color: C.muted, textAlign: 'center' },
        
        panelScroll: { flex: 1, minHeight: 140 },
        panelEmpty: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
        panelEmptyText: { fontSize: FontSize.sm, color: C.muted },
        contextRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm, borderRadius: Radius.md, marginBottom: 6, backgroundColor: C.cardElevated, borderWidth: 1, borderColor: C.cardBorder },
        contextRowActive: { borderColor: C.primary, backgroundColor: C.primaryDim },
        contextRowText: { flex: 1, fontSize: FontSize.sm, fontWeight: '700', color: C.text },
        semHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm, backgroundColor: C.primaryDim, borderRadius: Radius.md, marginTop: 6, marginBottom: 4 },
        semTitle: { flex: 1, fontSize: FontSize.sm, fontWeight: '800', color: C.primary },
        countBadge: { borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2, backgroundColor: C.primary },
        countText: { fontSize: 10, fontWeight: '800', color: '#fff' },
        subjectCard: { borderRadius: Radius.md, borderWidth: 1, borderColor: C.cardBorder, overflow: 'hidden', marginBottom: 6 },
        subjectHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, backgroundColor: C.cardElevated },
        subjectTitle: { flex: 1, fontSize: FontSize.xs, fontWeight: '800', color: C.text, textTransform: 'uppercase' },
        allChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.md, borderWidth: 1, borderColor: C.cardBorder, paddingHorizontal: 7, paddingVertical: 4 },
        allChipActive: { borderColor: C.primary, backgroundColor: C.primaryDim },
        allChipText: { fontSize: 10, fontWeight: '800', color: C.textSecondary },
        docRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm, borderLeftWidth: 2, borderLeftColor: 'transparent' },
        docRowActive: { backgroundColor: C.primaryDim, borderLeftColor: C.primary },
        docRowInfo: { flex: 1, gap: 2 },
        docTitle: { fontSize: FontSize.sm, fontWeight: '700', color: C.text },
        docMeta: { fontSize: FontSize.xs, color: C.muted },
        checkBox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1, borderColor: C.cardBorder, alignItems: 'center', justifyContent: 'center' },
        checkBoxActive: { backgroundColor: C.primary, borderColor: C.primary },
      }),
    [C],
  )

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user'
    return (
      <View style={[S.msgRow, isUser ? S.msgRowUser : S.msgRowAi]}>
        {!isUser && (
          <View style={S.aiAvatar}>
            <Sparkles size={14} color="#fff" />
          </View>
        )}
        <View style={[S.bubble, isUser ? S.bubbleUser : S.bubbleAi]}>
          <Text style={isUser ? S.bubbleTextUser : S.bubbleTextAi}>{item.content}</Text>
          {item.time ? <Text style={[S.msgTime, isUser ? S.msgTimeUser : S.msgTimeAi]}>{item.time}</Text> : null}
        </View>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <SafeAreaView style={S.safe}>
        <KeyboardAvoidingView style={S.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          
          {!inChatMode ? (
            // Screen 1: Subject Selection & History view
            <View style={S.flex}>
              {/* Header */}
              <View style={S.header}>
                <View style={S.headerCenter}>
                  <View style={S.headerTitleRow}>
                    <View style={S.aiDot} />
                    <Text style={S.headerTitle}>AI Study Assistant</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 2 }}>
                    Choose a subject or past chat to begin
                  </Text>
                </View>
              </View>

              {/* Segmented Control / Tabs */}
              <View style={S.tabsContainer}>
                <Pressable
                  style={[S.tabButton, activeTab === 'context' && S.tabButtonActive]}
                  onPress={() => setActiveTab('context')}
                >
                  <Text style={[S.tabButtonText, activeTab === 'context' && S.tabButtonTextActive]}>
                    Study Context
                  </Text>
                </Pressable>
                <Pressable
                  style={[S.tabButton, activeTab === 'history' && S.tabButtonActive]}
                  onPress={() => setActiveTab('history')}
                >
                  <Text style={[S.tabButtonText, activeTab === 'history' && S.tabButtonTextActive]}>
                    Chat History
                  </Text>
                </Pressable>
              </View>

              {activeTab === 'context' ? (
                // Context selection panel inline
                <View style={S.flex}>
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
                    <ScrollView showsVerticalScrollIndicator={false} style={[S.panelScroll, { paddingHorizontal: Spacing.md }]}>
                      <Pressable style={[S.contextRow, selectedDocIds.length === 0 && S.contextRowActive]} onPress={clearContext}>
                        <Library size={17} color={C.primary} />
                        <Text style={S.contextRowText}>No subject selected</Text>
                        {selectedDocIds.length === 0 ? <Check size={17} color={C.primary} /> : null}
                      </Pressable>

                      {semesterGroups.map((semester) => {
                        const semesterOpen = expandedSemesters.has(semester.label)
                        const totalDocs = semester.subjects.reduce((total, subject) => total + subject.docs.length, 0)
                        return (
                          <View key={semester.label}>
                            <Pressable style={S.semHeader} onPress={() => toggleSemester(semester.label)}>
                              <GraduationCap size={16} color={C.primary} />
                              <Text style={S.semTitle}>{semester.label}</Text>
                              <View style={S.countBadge}>
                                <Text style={S.countText}>{totalDocs}</Text>
                              </View>
                              {semesterOpen ? <ChevronDown size={16} color={C.muted} /> : <ChevronRight size={16} color={C.muted} />}
                            </Pressable>

                            {semesterOpen &&
                              semester.subjects.map((subject) => {
                                const subjectOpenKey = `${semester.label}::${subject.key}`
                                const subjectOpen = expandedSubjects.has(subjectOpenKey)
                                const allSelected =
                                  selectedSubjectKey === subject.key &&
                                  subject.docs.length > 0 &&
                                  subject.docs.every((doc) => selectedDocIds.includes(doc.id))

                                return (
                                  <View key={subjectOpenKey} style={S.subjectCard}>
                                    <View style={S.subjectHeader}>
                                      <Pressable
                                        onPress={() => toggleSubjectOpen(subjectOpenKey)}
                                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7 }}
                                      >
                                        <BookOpen size={15} color={subject.color || C.primary} />
                                        <Text style={S.subjectTitle} numberOfLines={1}>{subject.subject}</Text>
                                        <Text style={{ fontSize: 10, color: C.muted }}>{subject.docs.length}</Text>
                                        {subjectOpen ? <ChevronDown size={14} color={C.muted} /> : <ChevronRight size={14} color={C.muted} />}
                                      </Pressable>
                                      <Pressable
                                        style={[S.allChip, allSelected && S.allChipActive]}
                                        onPress={() => toggleSubjectSelection(subject.docs)}
                                      >
                                        <View style={[S.checkBox, allSelected && S.checkBoxActive]}>
                                          {allSelected ? <Check size={12} color="#fff" /> : null}
                                        </View>
                                        <Text style={[S.allChipText, allSelected && { color: C.primary }]}>All</Text>
                                      </Pressable>
                                    </View>

                                    {subjectOpen &&
                                      subject.docs.map((doc) => {
                                        const selected = selectedDocIds.includes(doc.id)
                                        return (
                                          <Pressable
                                            key={doc.id}
                                            style={[S.docRow, selected && S.docRowActive]}
                                            onPress={() => toggleDocumentSelection(doc)}
                                          >
                                            <View style={[S.checkBox, selected && S.checkBoxActive]}>
                                              {selected ? <Check size={12} color="#fff" /> : null}
                                            </View>
                                            <FileText size={15} color={selected ? C.primary : C.muted} />
                                            <View style={S.docRowInfo}>
                                              <Text style={S.docTitle} numberOfLines={1}>{doc.title}</Text>
                                              <Text style={S.docMeta} numberOfLines={1}>
                                                {doc.isShared ? `${doc.accessRole === 'EDITOR' ? 'Editor' : 'Viewer'} · ` : 'Owner · '}{doc.fileName}
                                              </Text>
                                            </View>
                                          </Pressable>
                                        )
                                      })}
                                  </View>
                                )
                              })}
                          </View>
                        )
                      })}
                    </ScrollView>
                  )}

                  {selectedDocIds.length > 0 && (
                    <Pressable style={S.startChatBtn} onPress={() => setInChatMode(true)}>
                      <Text style={S.startChatBtnText}>Start Chat Session ({selectedDocIds.length} doc{selectedDocIds.length > 1 ? 's' : ''})</Text>
                    </Pressable>
                  )}
                </View>
              ) : (
                // Chat History panel inline
                <View style={S.flex}>
                  {histLoading ? (
                    <View style={S.emptyBox}>
                      <ActivityIndicator size="small" color={C.primary} />
                      <Text style={S.emptyText}>Loading history...</Text>
                    </View>
                  ) : threads.length === 0 ? (
                    <View style={S.emptyBox}>
                      <MessageCircle size={36} color={C.muted} strokeWidth={1.5} />
                      <Text style={S.emptyText}>No conversations yet</Text>
                    </View>
                  ) : (
                    <ScrollView showsVerticalScrollIndicator={false} style={{ paddingHorizontal: Spacing.md }}>
                      {threads.map((item) => (
                        <Pressable key={item.id || item._id} style={S.histItem} onPress={() => openSavedThread(item)}>
                          <View style={S.histIcon}>
                            <MessageCircle size={16} color={C.primary} />
                          </View>
                          <View style={S.histInfo}>
                            <Text style={S.histTitle} numberOfLines={1}>{item.title}</Text>
                            <Text style={S.histMeta}>{timeAgo(item.lastMessageAt || item.createdAt)}</Text>
                          </View>
                          <Pressable style={S.histDeleteBtn} onPress={() => handleDeleteThread(item)} hitSlop={8}>
                            <Trash2 size={15} color={C.muted} />
                          </Pressable>
                        </Pressable>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}
            </View>
          ) : (
            // Screen 2: Active Chat session
            <View style={S.flex}>
              {/* Header */}
              <View style={S.header}>
                <Pressable onPress={() => setInChatMode(false)} style={S.headerBtn}>
                  <ChevronLeft size={20} color={C.muted} />
                </Pressable>
                <View style={S.headerCenter}>
                  <View style={S.headerTitleRow}>
                    <View style={S.aiDot} />
                    <Text style={S.headerTitle}>AI Assistant</Text>
                  </View>
                  <Pressable style={S.contextButton} onPress={() => {
                    setInChatMode(false)
                    setActiveTab('context')
                  }}>
                    <Library size={12} color={C.primary} />
                    <Text style={S.contextButtonText} numberOfLines={1}>{selectedContextLabel}</Text>
                  </Pressable>
                </View>
                <Pressable onPress={newChat} style={S.headerBtn}>
                  <Plus size={20} color={C.muted} />
                </Pressable>
              </View>

              {/* Messages List */}
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
                      <View
                        style={[
                          S.bubble,
                          S.bubbleAi,
                          {
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                            paddingVertical: 10,
                            paddingHorizontal: 14,
                          },
                        ]}
                      >
                        <ActivityIndicator size="small" color={C.primary} />
                        <Text
                          style={{
                            color: C.textSecondary,
                            fontSize: 13,
                            fontWeight: '500',
                          }}
                        >
                          Thinking...
                        </Text>
                      </View>
                    </View>
                  ) : null
                }
              />

              {/* Input Area */}
              <View style={S.inputArea}>
                <View style={S.inputBar}>
                  <Pressable style={S.attachBtn} onPress={() => {
                    setInChatMode(false)
                    setActiveTab('context')
                  }}>
                    <Search size={19} color={C.primary} />
                  </Pressable>
                  <TextInput
                    style={[S.textInput, !hasStudyContext && S.textInputDisabled]}
                    placeholder={hasStudyContext ? 'Ask AI about your study material...' : 'Choose a subject first...'}
                    placeholderTextColor={C.muted}
                    value={input}
                    onChangeText={(t) => {
                      if (t.length <= 2000) setInput(t)
                    }}
                    multiline
                    onSubmitEditing={sendMessage}
                  />
                  <Pressable
                    onPress={sendMessage}
                    disabled={!input.trim() || sending || !hasStudyContext}
                    style={[S.sendBtn, (!input.trim() || sending || !hasStudyContext) && S.sendBtnDisabled]}
                  >
                    <Send size={18} color={input.trim() && !sending && hasStudyContext ? '#fff' : C.muted} />
                  </Pressable>
                </View>
              </View>
            </View>
          )}

        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}
