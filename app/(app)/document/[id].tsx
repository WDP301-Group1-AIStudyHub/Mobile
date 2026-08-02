import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  Linking
} from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import {
  ArrowLeft,
  Calendar,
  FileText,
  HardDrive,
  User,
  Tag,
  Info,
  Globe,
  Lock,
  Eye,
  Download,
  Layers,
  Clock,
  BookOpen,
  MessageCircle,
  ChevronDown,
  ChevronRight,
  AlignLeft,
  Edit2,
  Trash2,
  X,
  Check,
  Share2,
  Star,
  UploadCloud,
  Sparkles,
} from 'lucide-react-native'
import { askQuestion } from '../../../services/chatApi'
import Card from '../../../components/ui/Card'
import { FontSize, Spacing, Radius } from '../../../constants/colors'
import { useColors } from '../../../contexts/ThemeContext'
import {
  deleteDocument,
  getDocument,
  getDocumentDownloadUrl,
  getDocumentVersions,
  setDocumentStar,
  updateDocument,
  updateDocumentVersion,
} from '../../../services/documentApi'
import { listSubjects } from '../../../services/subjectApi'
import type { DocumentItem, DocumentVisibility } from '../../../types/document'
import type { SubjectItem } from '../../../types/subject'
import DocumentShareSheet from '../../../components/documents/document-share-sheet'
import SharedDocumentSubjectSheet from '../../../components/documents/shared-document-subject-sheet'
import { useAuth } from '../../../hooks/useAuth'
import { buildQuotaErrorMessage, formatBytes } from '../../../utils/formatBytes'
import { getApiErrorDetails } from '../../../services/apiClient'
import { hasCapacityFor, refreshStorage } from '../../../hooks/useStorage'
import type { StorageQuotaDetails } from '../../../types/storage'

/** Matches the multer limit in the backend and Cloudinary's raw-file cap. */
const MAX_FILE_SIZE = 10 * 1024 * 1024

const getSafeId = (item: unknown): string => {
  if (!item || typeof item !== 'object') return ''
  const obj = item as { _id?: string; id?: string }
  return obj._id?.toString() || obj.id?.toString() || ''
}

function getSubjectName(subject: unknown, fallback = 'Uncategorized'): string {
  if (!subject) return fallback
  if (typeof subject === 'string') return subject || fallback
  if (typeof subject === 'object') {
    const name = (subject as Record<string, unknown>).name
    if (typeof name === 'string' && name.length > 0) return name
  }
  return fallback
}

function fileTypeColorFn(type: string | undefined, C: ReturnType<typeof useColors>): string {
  if (!type) return C.muted
  if (type.includes('pdf')) return C.error
  if (type.includes('epub')) return C.secondary
  if (type.includes('word') || type.includes('docx')) return C.info
  return C.muted
}

function fileTypeLabel(type: string | undefined): string {
  if (!type) return 'FILE'
  if (type.includes('pdf')) return 'PDF'
  if (type.includes('epub')) return 'EPUB'
  if (type.includes('word') || type.includes('docx')) return 'DOCX'
  return 'FILE'
}

function formatDate(date: string | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Module-level styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: Spacing.lg, paddingBottom: Spacing.xxl + 96, gap: Spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexShrink: 1,
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  titleText: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    letterSpacing: 0,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadge: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  docTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    lineHeight: 30,
  },
  descText: {
    fontSize: FontSize.sm,
    lineHeight: 22,
  },
  metaGrid: {
    gap: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 8,
  },
  metaLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  metaValue: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  tagText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: FontSize.base,
    fontWeight: '700',
  },
  infoCard: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  infoLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    width: 100,
  },
  infoValue: {
    flex: 1,
    fontSize: FontSize.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionStack: {
    gap: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radius.lg,
  },
  actionBtnFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: Radius.lg,
  },
  actionBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#fff',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 14, 26, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: Spacing.lg,
    paddingBottom: 40,
    maxHeight: '88%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sheetTitle: { fontSize: FontSize.lg, fontWeight: '800' },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginTop: Spacing.md,
    marginBottom: 6,
  },
  required: { color: '#EF4444' },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.base,
  },
  inputArea: {
    height: 90,
    paddingTop: Spacing.sm,
    textAlignVertical: 'top',
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 50,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
  },
  pickerSelected: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  pickerDot: { width: 10, height: 10, borderRadius: 5 },
  pickerInfo: { flex: 1 },
  pickerName: { fontSize: FontSize.sm, fontWeight: '600' },
  pickerCode: { fontSize: FontSize.xs, marginTop: 1 },
  pickerPlaceholder: { fontSize: FontSize.sm },
  visRow: { flexDirection: 'row', gap: Spacing.sm },
  visBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
  },
  visText: { fontSize: FontSize.sm, fontWeight: '600' },
  submitBtn: {
    marginTop: Spacing.lg,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  submitText: { color: '#fff', fontSize: FontSize.base, fontWeight: '700' },
  versionSegment: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    padding: 4,
  },
  versionSegmentButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingTop: Spacing.md,
  },
  subjectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    marginBottom: Spacing.sm,
  },
  subjectIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function DocumentDetailsPage() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const C = useColors()
  const { state } = useAuth()
  const currentUser = state.status === 'authenticated' ? state.user : null
  const [doc, setDoc] = useState<DocumentItem | null>(null)
  const [subjects, setSubjects] = useState<SubjectItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [showSubjectPicker, setShowSubjectPicker] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [showSharedSubject, setShowSharedSubject] = useState(false)
  const [showVersion, setShowVersion] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [starring, setStarring] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editVisibility, setEditVisibility] = useState<DocumentVisibility>('PRIVATE')
  const [editSubject, setEditSubject] = useState<SubjectItem | null>(null)
  const [versionFile, setVersionFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null)
  const [versionMode, setVersionMode] = useState<'OVERRIDE' | 'APPEND'>('OVERRIDE')
  const [versionReason, setVersionReason] = useState('')
  const [makeVersionActive, setMakeVersionActive] = useState(true)
  const [uploadingVersion, setUploadingVersion] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [generatingSummary, setGeneratingSummary] = useState(false)

  useEffect(() => {
    let cancelled = false
    const loadDoc = async () => {
      try {
        const [data, subjectList] = await Promise.all([
          getDocument(id),
          listSubjects().catch(() => []),
        ])
        if (!cancelled) setDoc(data)
        if (!cancelled) setSubjects(Array.isArray(subjectList) ? subjectList : [])
      } catch (e) {
        if (!cancelled) router.back()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadDoc()
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </SafeAreaView>
    )
  }

  if (!doc) return null

  const color = fileTypeColorFn(doc.fileType, C)
  const label = fileTypeLabel(doc.fileType)
  const isPublic = doc.visibility === 'PUBLIC'
  const contentLength = doc.extractedText?.length || 0
  const accessRole =
    doc.accessRole ||
    (currentUser && (doc.ownerId === currentUser.id || currentUser.role === 'admin')
      ? 'OWNER'
      : 'VIEWER')
  const canEdit = accessRole === 'OWNER' || accessRole === 'EDITOR'
  const canManage = accessRole === 'OWNER'
  const canClassifyShared = Boolean(doc.isShared && accessRole !== 'OWNER')

  const subjectName = getSubjectName(doc.subject)

  // doc.uploadedBy can be: string, populated object {_id, name, email, ...}, or undefined
  const uploaderName: string = (() => {
    const u = doc.uploadedBy as unknown
    if (!u) return doc.metadata?.author || 'Unknown'
    if (typeof u === 'string') return u
    if (typeof u === 'object' && u !== null) {
      const obj = u as Record<string, unknown>
      const n = obj.name ?? obj.fullName ?? obj.email
      if (typeof n === 'string' && n.length > 0) return n
    }
    return doc.metadata?.author || 'Unknown'
  })()

  const openEdit = () => {
    const subject = subjects.find((s) => getSafeId(s) === doc.subjectId)
      ?? subjects.find((s) => s.name === subjectName)
      ?? null
    setEditTitle(doc.title)
    setEditDesc(doc.description ?? '')
    setEditVisibility(doc.visibility ?? 'PRIVATE')
    setEditSubject(subject)
    setShowEdit(true)
  }

  const submitEdit = async () => {
    if (!editTitle.trim()) {
      Alert.alert('Missing title', 'Please enter a document title.')
      return
    }
    setSavingEdit(true)
    try {
      const updated = await updateDocument(id, {
        title: editTitle.trim(),
        description: editDesc.trim() || undefined,
        ...(canManage
          ? {
              subjectId: editSubject ? getSafeId(editSubject) : undefined,
              visibility: editVisibility,
            }
          : {}),
      })
      setDoc(updated)
      setShowEdit(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not update document.'
      Alert.alert('Update failed', msg)
    } finally {
      setSavingEdit(false)
    }
  }

  const confirmDelete = () => {
    Alert.alert('Move to Trash', `Move "${doc.title}" to Trash? You can restore it within 30 days.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Move to Trash',
        style: 'destructive',
        onPress: async () => {
          try {
            const result = await deleteDocument(id)
            if (result.warning) Alert.alert('Moved to Trash', result.warning)
            router.replace('/(app)/documents')
          } catch (e) {
            const msg = e instanceof Error ? e.message : 'Could not delete document.'
            Alert.alert('Delete failed', msg)
          }
        },
      },
    ])
  }

  const toggleStar = async () => {
    const nextStarred = !doc.isStarred
    setStarring(true)
    setDoc((current) => (current ? { ...current, isStarred: nextStarred } : current))
    try {
      const updated = await setDocumentStar(id, nextStarred)
      setDoc(updated)
    } catch (e) {
      setDoc((current) => (current ? { ...current, isStarred: doc.isStarred } : current))
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not update star.')
    } finally {
      setStarring(false)
    }
  }

  const downloadFile = async () => {
    try {
      const { downloadUrl } = await getDocumentDownloadUrl(id)
      await Linking.openURL(downloadUrl)
    } catch (error) {
      Alert.alert(
        'Download failed',
        error instanceof Error ? error.message : 'Unable to download document.',
      )
    }
  }

  const handleSummarize = async () => {
    if (!doc) return
    setGeneratingSummary(true)
    try {
      const result = await askQuestion({
        question: 'What is this document about? Please provide a comprehensive summary of the main topics and key points.',
        documentId: doc.id,
        scope: 'single_document',
        mode: 'basic',
      })
      setSummary(result.answer)
    } catch (e: any) {
      Alert.alert('Summary Failed', e.message || 'Could not generate summary.')
    } finally {
      setGeneratingSummary(false)
    }
  }

  const pickVersionFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      type: [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/markdown',
      ],
    })
    if (result.canceled || !result.assets?.[0]) return

    const file = result.assets[0]

    if ((file.size ?? 0) > MAX_FILE_SIZE) {
      Alert.alert('File too large', 'Each file must be 10 MB or smaller.')
      return
    }

    // The server charges the DOCUMENT OWNER. This client only knows its own
    // quota, so for a shared editor the two differ and a pre-check here would
    // wrongly block them. Owners get the check; everyone else relies on the 413.
    if (accessRole === 'OWNER') {
      const capacity = hasCapacityFor(file.size ?? 0)
      if (capacity.known && !capacity.ok) {
        Alert.alert(
          'Not enough storage',
          `Needs ${formatBytes(file.size ?? 0)} but only ${formatBytes(capacity.available)} is free.`,
        )
        return
      }
    }

    setVersionFile(file)
  }

  const submitVersion = async () => {
    if (!versionFile) {
      Alert.alert('No file', 'Please choose a version file first.')
      return
    }
    setUploadingVersion(true)
    try {
      await updateDocumentVersion(id, {
        file: {
          uri: versionFile.uri,
          name: versionFile.name,
          type: versionFile.mimeType || 'application/octet-stream',
          size: versionFile.size,
        },
        makeActive: versionMode === 'OVERRIDE' ? true : makeVersionActive,
        uploadMode: versionMode,
        uploadReason: versionReason.trim() || undefined,
      })
      const [updatedDocument, versions] = await Promise.all([
        getDocument(id),
        getDocumentVersions(id),
      ])
      setDoc({ ...updatedDocument, totalVersions: versions.length })
      setVersionFile(null)
      setVersionReason('')
      setShowVersion(false)
      void refreshStorage()
    } catch (error) {
      const info = getApiErrorDetails(error)

      if (info.code === 'STORAGE_QUOTA_EXCEEDED') {
        void refreshStorage()
        Alert.alert(
          'Not enough storage',
          buildQuotaErrorMessage(info.details as unknown as StorageQuotaDetails),
        )
      } else {
        Alert.alert('Version upload failed', info.message)
      }
    } finally {
      setUploadingVersion(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Pressable
                style={[styles.backBtn, { backgroundColor: C.primaryDim, borderColor: C.primary }]}
                onPress={() => router.back()}
              >
                <ArrowLeft size={20} color={C.primary} />
              </Pressable>
              <Text style={[styles.titleText, { color: C.text }]}>Details</Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                accessibilityLabel={doc.isStarred ? 'Unstar document' : 'Star document'}
                disabled={starring}
                style={[styles.headerIconBtn, { backgroundColor: C.cardElevated, borderColor: C.cardBorder }]}
                onPress={toggleStar}
              >
                <Star
                  size={17}
                  color={doc.isStarred ? '#F59E0B' : C.muted}
                  fill={doc.isStarred ? '#F59E0B' : 'transparent'}
                />
              </Pressable>
              {canManage ? (
              <Pressable
                accessibilityLabel="Share document"
                style={[styles.headerIconBtn, { backgroundColor: C.primaryDim, borderColor: C.primary }]}
                onPress={() => setShowShare(true)}
              >
                <Share2 size={17} color={C.primary} />
              </Pressable>
              ) : null}
              {canClassifyShared ? (
              <Pressable
                accessibilityLabel="Assign shared document subject"
                style={[styles.headerIconBtn, { backgroundColor: C.primaryDim, borderColor: C.primary }]}
                onPress={() => setShowSharedSubject(true)}
              >
                <BookOpen size={17} color={C.primary} />
              </Pressable>
              ) : null}
              {canEdit ? (
              <Pressable
                accessibilityLabel="Upload document version"
                style={[styles.headerIconBtn, { backgroundColor: C.primaryDim, borderColor: C.primary }]}
                onPress={() => setShowVersion(true)}
              >
                <UploadCloud size={17} color={C.primary} />
              </Pressable>
              ) : null}
              {canEdit ? (
              <Pressable
                accessibilityLabel="Edit document"
                style={[styles.headerIconBtn, { backgroundColor: C.primaryDim, borderColor: C.primary }]}
                onPress={openEdit}
              >
                <Edit2 size={17} color={C.primary} />
              </Pressable>
              ) : null}
              {canManage ? (
              <Pressable
                accessibilityLabel="Delete document"
                style={[styles.headerIconBtn, { backgroundColor: C.errorDim, borderColor: C.error }]}
                onPress={confirmDelete}
              >
                <Trash2 size={17} color={C.error} />
              </Pressable>
              ) : null}
            </View>
          </View>

          {/* Details Card */}
          <Card elevated style={styles.card}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <View style={[styles.iconWrap, { backgroundColor: `${color}15` }]}>
                <FileText size={32} color={color} />
                <View style={[styles.typeBadge, { backgroundColor: `${color}25` }]}>
                  <Text style={[styles.typeText, { color }]}>{label}</Text>
                </View>
              </View>

              <View
                style={[
                  styles.metaBadge,
                  {
                    backgroundColor: isPublic ? C.successDim : C.cardElevated,
                    borderWidth: 1,
                    borderColor: isPublic ? C.success : C.cardBorder,
                  },
                ]}
              >
                {isPublic ? <Globe size={12} color={C.success} /> : <Lock size={12} color={C.muted} />}
                <Text
                  style={{
                    fontSize: FontSize.xs,
                    fontWeight: '600',
                    color: isPublic ? C.success : C.muted,
                  }}
                >
                  {isPublic ? 'Public' : 'Private'}
                </Text>
              </View>
            </View>

            <View style={{ gap: Spacing.xs }}>
              <Text style={[styles.docTitle, { color: C.text }]}>{doc.title}</Text>
              {doc.description ? (
                <Text style={[styles.descText, { color: C.muted }]}>{doc.description}</Text>
              ) : null}
            </View>

            {doc.metadata?.tags && doc.metadata.tags.length > 0 && (
              <View style={styles.tagRow}>
                <Tag size={14} color={C.primary} />
                {doc.metadata.tags.map((tag, i) => (
                  <View key={i} style={[styles.tagPill, { backgroundColor: C.primaryDim }]}>
                    <Text style={[styles.tagText, { color: C.primary }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.metaGrid}>
              <View style={styles.metaRow}>
                <BookOpen size={16} color={C.muted} />
                <Text style={[styles.metaLabel, { color: C.muted }]}>Subject</Text>
                <Text style={[styles.metaValue, { color: C.text, textAlign: 'right' }]}>
                  {subjectName}
                </Text>
              </View>


              <View style={styles.metaRow}>
                <Info size={16} color={C.muted} />
                <Text style={[styles.metaLabel, { color: C.muted }]}>File Name</Text>
                <Text
                  style={[styles.metaValue, { color: C.text, textAlign: 'right' }]}
                  numberOfLines={1}
                  ellipsizeMode="middle"
                >
                  {doc.fileName}
                </Text>
              </View>

              <View style={styles.metaRow}>
                <HardDrive size={16} color={C.muted} />
                <Text style={[styles.metaLabel, { color: C.muted }]}>File Size</Text>
                <Text style={[styles.metaValue, { color: C.text, textAlign: 'right' }]}>
                  {formatBytes(doc.fileSize)}
                </Text>
              </View>

              <View style={styles.metaRow}>
                <Calendar size={16} color={C.muted} />
                <Text style={[styles.metaLabel, { color: C.muted }]}>Upload Date</Text>
                <Text style={[styles.metaValue, { color: C.text, textAlign: 'right' }]}>
                  {formatDate(doc.createdAt)}
                </Text>
              </View>
            </View>
          </Card>



          {/* Indexing Statistics */}
          <Card elevated style={styles.card}>
            <View style={styles.sectionHeader}>
              <Layers size={18} color={C.primary} />
              <Text style={[styles.sectionTitle, { color: C.text }]}>Indexing Statistics</Text>
            </View>

            <View style={[styles.infoCard, { backgroundColor: C.cardElevated }]}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: C.muted }]}>Total Chunks</Text>
                <Text style={styles.infoValue}>
                  <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: C.primary }}>
                    {doc.totalChunks || 0}
                  </Text>
                  <Text style={{ color: C.muted, fontSize: FontSize.sm }}> chunks indexed</Text>
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: C.muted }]}>Versions</Text>
                <Text style={[styles.infoValue, { color: C.text, fontWeight: '600' }]}>
                  {doc.totalVersions || 1} version(s)
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: C.muted }]}>Status</Text>
                <Text style={styles.infoValue}>
                  {doc.extractionStatus === 'COMPLETED' ? (
                    <Text style={{ color: C.success, fontWeight: '600' }}>Indexed</Text>
                  ) : (
                    <Text style={{ color: C.warning, fontWeight: '600' }}>Pending</Text>
                  )}
                </Text>
              </View>
            </View>
          </Card>

          {/* Access Information */}
          <Card elevated style={styles.card}>
            <View style={styles.sectionHeader}>
              <Clock size={18} color={C.primary} />
              <Text style={[styles.sectionTitle, { color: C.text }]}>Access Information</Text>
            </View>

            <View style={[styles.infoCard, { backgroundColor: C.cardElevated }]}>
              <View style={styles.infoRow}>
                <Eye size={14} color={C.muted} />
                <Text style={[styles.infoLabel, { color: C.muted }]}>Views</Text>
                <Text style={[styles.infoValue, { color: C.text, fontWeight: '700' }]}>
                  {doc.accessInfo?.viewCount || 0}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Download size={14} color={C.muted} />
                <Text style={[styles.infoLabel, { color: C.muted }]}>Downloads</Text>
                <Text style={[styles.infoValue, { color: C.text, fontWeight: '700' }]}>
                  {doc.accessInfo?.downloadCount || 0}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Calendar size={14} color={C.muted} />
                <Text style={[styles.infoLabel, { color: C.muted }]}>Last Indexed</Text>
                <Text style={[styles.infoValue, { color: C.muted, fontSize: FontSize.sm }]}>
                  {doc.lastIndexedAt ? formatDate(doc.lastIndexedAt) : 'Never'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Clock size={14} color={C.muted} />
                <Text style={[styles.infoLabel, { color: C.muted }]}>Last Updated</Text>
                <Text style={[styles.infoValue, { color: C.muted, fontSize: FontSize.sm }]}>
                  {formatDate(doc.updatedAt)}
                </Text>
              </View>
            </View>
          </Card>

          {/* Action Buttons – 2-row layout to avoid text truncation */}
          <View style={styles.actionStack}>
            {!!doc.fileUrl && (
              <Pressable
                style={[styles.actionBtnFull, { backgroundColor: C.primary }]}
                onPress={() =>
                  router.push(`/(app)/document/viewer/${id}` as any)
                }
              >
                <BookOpen size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Read Document</Text>
              </Pressable>
            )}
            
            <Pressable
              style={[styles.actionBtnFull, { backgroundColor: C.primaryDim, borderWidth: 1, borderColor: C.primary }]}
              onPress={handleSummarize}
              disabled={generatingSummary}
            >
              {generatingSummary ? (
                <ActivityIndicator size="small" color={C.primary} />
              ) : (
                <Sparkles size={16} color={C.primary} />
              )}
              <Text style={[styles.actionBtnText, { color: C.primary }]}>
                {generatingSummary ? 'Summarizing...' : 'Summarize with AI'}
              </Text>
            </Pressable>

            <View style={styles.actionRow}>
              {!!doc.fileUrl && (
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: C.cardElevated, borderWidth: 1, borderColor: C.cardBorder }]}
                  onPress={downloadFile}
                >
                  <Download size={16} color={C.text} />
                  <Text style={[styles.actionBtnText, { color: C.text }]}>Download</Text>
                </Pressable>
              )}
              <Pressable
                style={[styles.actionBtn, { backgroundColor: C.cardElevated, borderWidth: 1, borderColor: C.cardBorder }]}
                onPress={() => router.push(`/(app)/chat?documentId=${doc.id}` as any)}
              >
                <MessageCircle size={16} color={C.text} />
                <Text style={[styles.actionBtnText, { color: C.text }]}>Chat with AI</Text>
              </Pressable>
            </View>
          </View>

          {/* AI Summary Block */}
          {(summary || generatingSummary) && (
            <Card style={{ marginTop: Spacing.sm, padding: Spacing.md, gap: Spacing.sm, borderColor: C.primary, borderWidth: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                <Sparkles size={18} color={C.primary} />
                <Text style={{ fontSize: FontSize.base, fontWeight: '700', color: C.text }}>AI Summary</Text>
              </View>
              {generatingSummary ? (
                <Text style={{ color: C.muted, fontSize: FontSize.sm }}>Analyzing document content and generating summary...</Text>
              ) : (
                <Text style={{ color: C.text, fontSize: FontSize.sm, lineHeight: 22 }}>{summary}</Text>
              )}
            </Card>
          )}
        </ScrollView>

        <Modal
          visible={showEdit}
          transparent
          animationType="slide"
          onRequestClose={() => !savingEdit && setShowEdit(false)}
        >
          <Pressable style={styles.overlay} onPress={() => !savingEdit && setShowEdit(false)}>
            <Pressable style={[styles.sheet, { backgroundColor: C.card }]} onPress={() => {}}>
              <View style={[styles.sheetHandle, { backgroundColor: C.cardBorder }]} />
              <View style={styles.sheetHeader}>
                <Text style={[styles.sheetTitle, { color: C.text }]}>Edit Document</Text>
                <Pressable onPress={() => setShowEdit(false)} hitSlop={8} disabled={savingEdit}>
                  <X size={20} color={C.muted} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={[styles.label, { color: C.textSecondary }]}>
                  Title <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Document title"
                  placeholderTextColor={C.muted}
                  editable={!savingEdit}
                  style={[styles.input, { backgroundColor: C.cardElevated, borderColor: C.cardBorder, color: C.text }]}
                />

                {canManage ? (
                <>
                <Text style={[styles.label, { color: C.textSecondary }]}>Subject</Text>
                <Pressable
                  onPress={() => setShowSubjectPicker(true)}
                  disabled={savingEdit}
                  style={({ pressed }) => [
                    styles.pickerTrigger,
                    { backgroundColor: C.cardElevated, borderColor: C.cardBorder },
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  {editSubject ? (
                    <View style={styles.pickerSelected}>
                      <View style={[styles.pickerDot, { backgroundColor: editSubject.color ?? C.primary }]} />
                      <View style={styles.pickerInfo}>
                        <Text style={[styles.pickerName, { color: C.text }]} numberOfLines={1}>
                          {editSubject.name}
                        </Text>
                        {editSubject.code ? (
                          <Text style={[styles.pickerCode, { color: C.muted }]}>{editSubject.code}</Text>
                        ) : null}
                      </View>
                    </View>
                  ) : (
                    <View style={styles.pickerSelected}>
                      <BookOpen size={16} color={C.muted} />
                      <Text style={[styles.pickerPlaceholder, { color: C.muted }]}>Unassigned</Text>
                    </View>
                  )}
                  <ChevronDown size={18} color={C.muted} />
                </Pressable>
                </>
                ) : null}

                <Text style={[styles.label, { color: C.textSecondary }]}>Description</Text>
                <TextInput
                  value={editDesc}
                  onChangeText={setEditDesc}
                  placeholder="Optional description"
                  placeholderTextColor={C.muted}
                  multiline
                  editable={!savingEdit}
                  style={[styles.input, styles.inputArea, { backgroundColor: C.cardElevated, borderColor: C.cardBorder, color: C.text }]}
                />



                <Pressable
                  onPress={submitEdit}
                  disabled={savingEdit}
                  style={({ pressed }) => [
                    styles.submitBtn,
                    { backgroundColor: C.primary },
                    (pressed || savingEdit) && { opacity: 0.6 },
                  ]}
                >
                  {savingEdit ? <ActivityIndicator color="#fff" /> : <Edit2 size={16} color="#fff" />}
                  <Text style={styles.submitText}>{savingEdit ? 'Saving...' : 'Save changes'}</Text>
                </Pressable>
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal
          visible={showVersion}
          transparent
          animationType="slide"
          onRequestClose={() => !uploadingVersion && setShowVersion(false)}
        >
          <Pressable style={styles.overlay} onPress={() => !uploadingVersion && setShowVersion(false)}>
            <Pressable style={[styles.sheet, { backgroundColor: C.card }]} onPress={() => {}}>
              <View style={[styles.sheetHandle, { backgroundColor: C.cardBorder }]} />
              <View style={styles.sheetHeader}>
                <Text selectable style={[styles.sheetTitle, { color: C.text }]}>Upload New Version</Text>
                <Pressable disabled={uploadingVersion} hitSlop={8} onPress={() => setShowVersion(false)}>
                  <X size={20} color={C.muted} />
                </Pressable>
              </View>

              <Text style={[styles.label, { color: C.textSecondary }]}>Document file</Text>
              <Pressable
                disabled={uploadingVersion}
                onPress={pickVersionFile}
                style={[styles.pickerTrigger, { backgroundColor: C.cardElevated, borderColor: versionFile ? C.primary : C.cardBorder }]}
              >
                <UploadCloud size={17} color={versionFile ? C.primary : C.muted} />
                <Text numberOfLines={1} style={[styles.pickerPlaceholder, { color: versionFile ? C.primary : C.muted, flex: 1 }]}>
                  {versionFile?.name || 'Choose PDF, DOCX, PPTX, XLSX, TXT, or MD'}
                </Text>
              </Pressable>

              <Text style={[styles.label, { color: C.textSecondary }]}>Upload mode</Text>
              <View style={[styles.versionSegment, { backgroundColor: C.cardElevated }]}>
                {(['OVERRIDE', 'APPEND'] as const).map((mode) => {
                  const active = versionMode === mode
                  return (
                    <Pressable
                      key={mode}
                      onPress={() => {
                        setVersionMode(mode)
                        if (mode === 'OVERRIDE') setMakeVersionActive(true)
                      }}
                      style={[styles.versionSegmentButton, active && { backgroundColor: C.primary }]}
                    >
                      <Text style={{ color: active ? '#fff' : C.muted, fontSize: FontSize.xs, fontWeight: '700' }}>
                        {mode === 'OVERRIDE' ? 'Replace active' : 'Append content'}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>

              <Text style={[styles.label, { color: C.textSecondary }]}>Change note</Text>
              <TextInput
                editable={!uploadingVersion}
                maxLength={500}
                multiline
                onChangeText={setVersionReason}
                placeholder="What changed in this version?"
                placeholderTextColor={C.muted}
                style={[styles.input, styles.inputArea, { backgroundColor: C.cardElevated, borderColor: C.cardBorder, color: C.text }]}
                value={versionReason}
              />

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.metaLabel, { color: C.text }]}>Make active version</Text>
                  <Text style={[styles.pickerCode, { color: C.muted }]}>Override uploads are always active.</Text>
                </View>
                <Switch
                  disabled={uploadingVersion || versionMode === 'OVERRIDE'}
                  onValueChange={setMakeVersionActive}
                  trackColor={{ false: C.cardBorder, true: C.primary }}
                  value={versionMode === 'OVERRIDE' ? true : makeVersionActive}
                />
              </View>

              <Pressable
                disabled={!versionFile || uploadingVersion}
                onPress={submitVersion}
                style={[styles.submitBtn, { backgroundColor: C.primary }, (!versionFile || uploadingVersion) && { opacity: 0.5 }]}
              >
                {uploadingVersion ? <ActivityIndicator color="#fff" /> : <UploadCloud size={16} color="#fff" />}
                <Text style={styles.submitText}>{uploadingVersion ? 'Uploading...' : 'Upload version'}</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal
          visible={showSubjectPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowSubjectPicker(false)}
        >
          <Pressable style={styles.overlay} onPress={() => setShowSubjectPicker(false)}>
            <Pressable style={[styles.sheet, { backgroundColor: C.card }]} onPress={() => {}}>
              <View style={[styles.sheetHandle, { backgroundColor: C.cardBorder }]} />
              <View style={styles.sheetHeader}>
                <Text style={[styles.sheetTitle, { color: C.text }]}>Select Subject</Text>
                <Pressable onPress={() => setShowSubjectPicker(false)} hitSlop={8}>
                  <X size={20} color={C.muted} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Pressable
                  onPress={() => {
                    setEditSubject(null)
                    setShowSubjectPicker(false)
                  }}
                  style={({ pressed }) => [
                    styles.subjectOption,
                    { backgroundColor: !editSubject ? C.primaryDim : C.cardElevated, borderColor: !editSubject ? C.primary : C.cardBorder },
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <View style={[styles.subjectIcon, { backgroundColor: C.cardElevated }]}>
                    <FileText size={18} color={C.muted} />
                  </View>
                  <Text style={[styles.pickerName, { color: C.text, flex: 1 }]}>Unassigned</Text>
                  {!editSubject ? <Check size={18} color={C.primary} /> : null}
                </Pressable>

                {subjects.map((s, index) => {
                  const sId = getSafeId(s)
                  const active = !!editSubject && getSafeId(editSubject) === sId
                  return (
                    <Pressable
                      key={sId || `subject-${index}`}
                      onPress={() => {
                        setEditSubject(s)
                        setShowSubjectPicker(false)
                      }}
                      style={({ pressed }) => [
                        styles.subjectOption,
                        { backgroundColor: active ? C.primaryDim : C.cardElevated, borderColor: active ? C.primary : C.cardBorder },
                        pressed && { opacity: 0.6 },
                      ]}
                    >
                      <View style={[styles.subjectIcon, { backgroundColor: C.primaryDim }]}>
                        <BookOpen size={18} color={C.primary} />
                      </View>
                      <View style={styles.pickerInfo}>
                        <Text style={[styles.pickerName, { color: C.text }]} numberOfLines={1}>
                          {s.name}
                        </Text>
                        {s.code ? <Text style={[styles.pickerCode, { color: C.muted }]}>{s.code}</Text> : null}
                      </View>
                      {active ? <Check size={18} color={C.primary} /> : null}
                    </Pressable>
                  )
                })}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
        <DocumentShareSheet
          document={doc}
          onClose={() => setShowShare(false)}
          visible={showShare}
        />
        <SharedDocumentSubjectSheet
          document={doc}
          subjects={subjects}
          onClose={() => setShowSharedSubject(false)}
          onUpdated={setDoc}
          visible={showSharedSubject}
        />
      </SafeAreaView>
  )
}
