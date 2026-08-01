import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  ChevronDown,
  ChevronRight,
  FileText,
  FolderOpen,
  Globe,
  Layers,
  Lock,
  Plus,
  RotateCcw,
  Search,
  Star,
  Trash2,
  UploadCloud,
  X,
  BookOpen,
  Check,
  Download,
  ArrowDownAZ,
  CheckSquare,
  SlidersHorizontal,
  Share2,
  Users,
} from 'lucide-react-native'
import * as DocumentPicker from 'expo-document-picker'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import { FontSize, Spacing, Radius } from '../../constants/colors'
import { useColors } from '../../contexts/ThemeContext'
import { useAuth } from '../../hooks/useAuth'
import {
  deleteDocument,
  deleteDocumentPermanently,
  emptyTrash,
  getDocumentDownloadUrl,
  listDocuments,
  listSharedWithMe,
  listStarredDocuments,
  listTrashDocuments,
  restoreDocument,
  setDocumentStar,
  uploadDocument,
  updateDocument,
} from '../../services/documentApi'
import { listSubjects } from '../../services/subjectApi'
import type {
  DocumentItem,
  DocumentVisibility,
} from '../../types/document'
import type { SubjectItem } from '../../types/subject'
import DocumentShareSheet from '../../components/documents/document-share-sheet'
import SharedDocumentSubjectSheet from '../../components/documents/shared-document-subject-sheet'
import { buildQuotaErrorMessage, formatBytes } from '../../utils/formatBytes'
import { getApiErrorDetails } from '../../services/apiClient'
import { applyUploadedBytes, hasCapacityFor, refreshStorage } from '../../hooks/useStorage'
import type { StorageQuotaDetails } from '../../types/storage'

/** Matches the multer limit in the backend and Cloudinary's raw-file cap. */
const MAX_FILE_SIZE = 10 * 1024 * 1024

type LibraryView = 'mine' | 'shared' | 'starred' | 'trash'
type DocumentSort = 'UPDATED_DESC' | 'NAME_ASC' | 'SIZE_DESC'

// Helper function: Lấy ID an toàn tương thích với Mongoose (_id)
const getSafeId = (item: any): string => {
  if (!item) return ''
  if (item._id) return item._id.toString()
  if (item.id) return item.id.toString()
  return ''
}

// Backend may populate `subject` as an object. Normalize to string.
function getSubjectName(subject: unknown, fallback = 'Uncategorized'): string {
  if (subject == null) return fallback
  if (typeof subject === 'string') return subject.length > 0 ? subject : fallback
  if (typeof subject === 'object') {
    const n = (subject as Record<string, unknown>).name
    if (typeof n === 'string' && n.length > 0) return n
  }
  return fallback
}

function fileTypeColor(type: string | undefined, C: ReturnType<typeof useColors>): string {
  if (!type) return C.muted
  if (type.includes('pdf')) return C.error
  if (type.includes('epub')) return C.secondary
  if (type.includes('word') || type.includes('docx')) return C.info
  return C.muted
}

export default function DocumentsPage() {
  const C = useColors()
  const { upload: uploadParam, subjectId: uploadSubjectId } = useLocalSearchParams<{ upload?: string; subjectId?: string }>()
  const autoUploadHandled = useRef(false)
  const { state } = useAuth()
  const currentUser = state.status === 'authenticated' ? state.user : null
  const [docs, setDocs] = useState<DocumentItem[]>([])
  const [libraryView, setLibraryView] = useState<LibraryView>('mine')
  const [sharingDocument, setSharingDocument] = useState<DocumentItem | null>(null)
  const [classifyingDocument, setClassifyingDocument] = useState<DocumentItem | null>(null)
  const [subjects, setSubjects] = useState<SubjectItem[]>([])
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('ALL')
  const [fileTypeFilter, setFileTypeFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState<DocumentSort>('UPDATED_DESC')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const [showUpload, setShowUpload] = useState(false)
  const [showSubjectPicker, setShowSubjectPicker] = useState(false)
  const [pickedFile, setPickedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formAuthor, setFormAuthor] = useState('')
  const [formTags, setFormTags] = useState('')
  const [formVisibility, setFormVisibility] = useState<DocumentVisibility>('PRIVATE')
  const [formSubject, setFormSubject] = useState<SubjectItem | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true)
    try {
      const loadDocumentsForView = async () => {
        if (libraryView === 'shared') return listSharedWithMe()
        if (libraryView === 'starred') return listStarredDocuments()
        if (libraryView === 'trash') return listTrashDocuments()
        return listDocuments()
      }
      const [d, s] = await Promise.all([
        loadDocumentsForView(),
        listSubjects(),
      ])
      setDocs(
        Array.isArray(d)
          ? libraryView === 'shared' || libraryView === 'starred' || libraryView === 'trash'
            ? d
            : d.filter((item) => !item.isShared)
          : [],
      )
      setSubjects(Array.isArray(s) ? s : [])
    } catch {
      setDocs([])
      setSubjects([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [libraryView])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  const filteredDocs = useMemo(() => {
    const q = search.trim().toLowerCase()
    const match = (s: string) => s.toLowerCase().includes(q)

    return docs
      .filter((document) => {
        const subjectName = getSubjectName(
          document.personalSubject ?? document.subject,
          'Uncategorized',
        )
        const searchHit =
          !q ||
          match(document.title) ||
          match(document.fileName ?? '') ||
          match(subjectName) ||
          match(document.sharedBy?.fullName ?? '') ||
          (document.metadata?.tags ?? []).some((tag) => match(tag))
        const subjectHit = subjectFilter === 'ALL' || subjectName === subjectFilter
        const fileType = document.fileName?.split('.').pop()?.toUpperCase() ||
          document.fileType?.split('/').pop()?.toUpperCase() ||
          'OTHER'
        const typeHit = fileTypeFilter === 'ALL' || fileType.includes(fileTypeFilter)
        return searchHit && subjectHit && typeHit
      })
      .sort((a, b) => {
        if (sortBy === 'NAME_ASC') return a.title.localeCompare(b.title)
        if (sortBy === 'SIZE_DESC') return (b.fileSize || 0) - (a.fileSize || 0)
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      })
  }, [docs, fileTypeFilter, search, sortBy, subjectFilter])

  const groups = useMemo(() => {

    const subjectNames = new Set(subjects.map((s) => s.name))
    const uncategorized: DocumentItem[] = []
    const bySubject: Record<string, DocumentItem[]> = {}

    for (const sub of subjects) bySubject[getSafeId(sub)] = []

    for (const d of filteredDocs) {
      const docSubjectId = d.subjectId || (d as any).subject_id
      const docSubjectName = getSubjectName(d.subject, '')
      if (docSubjectId && bySubject[docSubjectId]) {
        bySubject[docSubjectId].push(d)
      } else if (docSubjectName && subjectNames.has(docSubjectName)) {
        const found = subjects.find((s) => s.name === docSubjectName)
        if (found && bySubject[getSafeId(found)]) bySubject[getSafeId(found)].push(d)
      } else {
        uncategorized.push(d)
      }
    }

    const result = subjects
      .map((s) => ({ subject: s, docs: bySubject[getSafeId(s)] ?? [] }))
      .filter((g) => g.docs.length > 0)

    if (uncategorized.length > 0) {
      result.unshift({
        subject: {
          id: '__uncategorized__', // ID đặc biệt cho nhóm không xác định
          name: 'Uncategorized',
          createdAt: '',
          updatedAt: '',
        },
        docs: uncategorized,
      })
    }
    return result
  }, [filteredDocs, subjects])

  const visibleFlatDocs = filteredDocs
  const activeFilterCount = Number(subjectFilter !== 'ALL') + Number(fileTypeFilter !== 'ALL')
  const filterSubjectNames = Array.from(
    new Set(
      docs.map((document) =>
        getSubjectName(document.personalSubject ?? document.subject, 'Uncategorized'),
      ),
    ),
  ).sort((a, b) => a.localeCompare(b))

  const toggleSelected = (document: DocumentItem) => {
    const documentId = getSafeId(document)
    if (!documentId || libraryView === 'trash') return
    setSelectedIds((current) =>
      current.includes(documentId)
        ? current.filter((id) => id !== documentId)
        : [...current, documentId],
    )
  }

  const openOrSelect = (document: DocumentItem) => {
    if (selectedIds.length > 0) {
      toggleSelected(document)
      return
    }
    router.push(`/(app)/document/${getSafeId(document)}` as any)
  }

  const bulkDownload = async () => {
    const selected = docs.filter((document) => selectedIds.includes(getSafeId(document)))
    for (const document of selected) await downloadDocument(document)
    setSelectedIds([])
  }

  const bulkMoveToTrash = () => {
    const selected = docs.filter(
      (document) =>
        selectedIds.includes(getSafeId(document)) &&
        (document.accessRole === 'OWNER' || document.ownerId === currentUser?.id),
    )
    if (selected.length === 0) {
      Alert.alert('Owner documents only', 'Only documents you own can be moved to Trash.')
      return
    }
    Alert.alert('Move to Trash', `Move ${selected.length} selected document(s) to Trash?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Move to Trash',
        style: 'destructive',
        onPress: async () => {
          try {
            const results = await Promise.all(selected.map((document) => deleteDocument(getSafeId(document))))
            setDocs((current) =>
              current.filter((document) => !selectedIds.includes(getSafeId(document))),
            )
            setSelectedIds([])
            const pending = results.filter((result) => result.ragStatus === 'DELETE_PENDING').length
            if (pending > 0) Alert.alert('Moved to Trash', `AI cleanup is retrying for ${pending} document(s).`)
          } catch (error) {
            Alert.alert('Move failed', error instanceof Error ? error.message : 'Please try again.')
          }
        },
      },
    ])
  }

  const downloadDocument = async (document: DocumentItem) => {
    try {
      const { downloadUrl } = await getDocumentDownloadUrl(getSafeId(document))
      await Linking.openURL(downloadUrl)
    } catch (error) {
      Alert.alert(
        'Download failed',
        error instanceof Error ? error.message : 'Unable to download document.',
      )
    }
  }

  const replaceDocument = (updated: DocumentItem) => {
    const updatedId = getSafeId(updated)
    setDocs((prev) =>
      prev.map((document) => (getSafeId(document) === updatedId ? updated : document)),
    )
  }

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const openUpload = (subject?: SubjectItem) => {
    setPickedFile(null)
    setFormTitle('')
    setFormDesc('')
    setFormAuthor('')
    setFormTags('')
    setFormVisibility('PRIVATE')
    setFormSubject(subject ?? null)
    setUploadProgress(0)
    setShowUpload(true)
  }

  useEffect(() => {
    if (uploadParam !== '1' || autoUploadHandled.current || subjects.length === 0) return
    autoUploadHandled.current = true
    openUpload(subjects.find((subject) => getSafeId(subject) === uploadSubjectId))
  }, [subjects, uploadParam, uploadSubjectId])

  const closeUpload = () => {
    if (uploading) return
    setShowUpload(false)
  }

  const pickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
          'text/markdown',
        ],
        copyToCacheDirectory: true,
      })
      if (res.canceled || !res.assets?.length) return
      const file = res.assets[0]

      // Neither limit was checked here before, so a 10 MB+ file used to travel
      // all the way to the server just to be rejected by multer.
      if ((file.size ?? 0) > MAX_FILE_SIZE) {
        Alert.alert('File too large', 'Each file must be 10 MB or smaller.')
        return
      }

      const capacity = hasCapacityFor(file.size ?? 0)
      if (capacity.known && !capacity.ok) {
        Alert.alert(
          'Not enough storage',
          `This file needs ${formatBytes(file.size ?? 0)} but only ${formatBytes(capacity.available)} is free. Delete some documents or upgrade your plan.`,
        )
        return
      }

      setPickedFile(file)
      if (!formTitle) {
        const dot = file.name.lastIndexOf('.')
        setFormTitle(dot > 0 ? file.name.slice(0, dot) : file.name)
      }
    } catch {
      Alert.alert('Error', 'Could not pick file.')
    }
  }

  const submitUpload = async () => {
    if (!pickedFile) {
      Alert.alert('No file', 'Please choose a file first.')
      return
    }
    if (!formTitle.trim()) {
      Alert.alert('Missing title', 'Please enter a document title.')
      return
    }
    setUploading(true)
    setUploadProgress(0)
    try {
      const tags = formTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
      const newDoc = await uploadDocument({
        file: {
          uri: pickedFile.uri,
          name: pickedFile.name,
          type: pickedFile.mimeType ?? 'application/octet-stream',
          size: pickedFile.size ?? undefined,
        },
        title: formTitle.trim(),
        description: formDesc.trim() || undefined,
        visibility: formVisibility,
        author: formAuthor.trim() || undefined,
        tags: tags.length ? tags : undefined,
        subject: formSubject?.name,
        subjectId: formSubject ? getSafeId(formSubject) : undefined,
        onProgress: (p) => setUploadProgress(p),
      })
      setShowUpload(false)
      // Move the bar immediately; the server number arrives with the sync below.
      applyUploadedBytes(pickedFile.size ?? 0)
      // Optimistic update: prepend ngay vào list, không chờ server
      if (libraryView === 'mine') {
        setDocs((prev) => [newDoc, ...prev.filter((d) => getSafeId(d) !== getSafeId(newDoc))])
      }
      // Sync lại từ server sau 2s (đủ thời gian backend xử lý)
      setTimeout(() => load(true), 2000)
    } catch (e) {
      const info = getApiErrorDetails(e)

      if (info.code === 'STORAGE_QUOTA_EXCEEDED') {
        // Refresh so the bar reflects the truth that caused the rejection.
        void refreshStorage()
        Alert.alert(
          'Not enough storage',
          buildQuotaErrorMessage(info.details as unknown as StorageQuotaDetails),
        )
      } else {
        Alert.alert('Upload failed', info.message)
      }
    } finally {
      setUploading(false)
    }
  }


  const toggleVisibility = async (doc: DocumentItem) => {
    const next: DocumentVisibility =
      doc.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC'
    const docId = getSafeId(doc)
    try {
      await updateDocument(docId, { visibility: next })
      setDocs((prev) =>
        prev.map((d) => (getSafeId(d) === docId ? { ...d, visibility: next } : d))
      )
    } catch {
      Alert.alert('Error', 'Could not update visibility.')
    }
  }

  const removeDoc = (doc: DocumentItem) => {
    const docId = getSafeId(doc)
    Alert.alert(
      'Move to Trash',
      `Move "${doc.title}" to Trash? You can restore it within 30 days.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move to Trash',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteDocument(docId)
              setDocs((prev) => prev.filter((d) => getSafeId(d) !== docId))
              if (result.warning) Alert.alert('Moved to Trash', result.warning)
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'Could not delete document.'
              Alert.alert('Error', msg)
            }
          },
        },
      ]
    )
  }

  const toggleStar = async (doc: DocumentItem) => {
    const docId = getSafeId(doc)
    const nextStarred = !doc.isStarred
    setDocs((prev) =>
      prev.map((item) =>
        getSafeId(item) === docId ? { ...item, isStarred: nextStarred } : item,
      ),
    )
    try {
      const updated = await setDocumentStar(docId, nextStarred)
      setDocs((prev) =>
        libraryView === 'starred' && !nextStarred
          ? prev.filter((item) => getSafeId(item) !== docId)
          : prev.map((item) => (getSafeId(item) === docId ? updated : item)),
      )
    } catch (e) {
      setDocs((prev) =>
        prev.map((item) =>
          getSafeId(item) === docId ? { ...item, isStarred: doc.isStarred } : item,
        ),
      )
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not update star.')
    }
  }

  const restoreFromTrash = (doc: DocumentItem) => {
    const docId = getSafeId(doc)
    Alert.alert('Restore Document', `Restore "${doc.title}" to Library?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restore',
        onPress: async () => {
          setRestoringId(docId)
          try {
            await restoreDocument(docId)
            setDocs((prev) => prev.filter((d) => getSafeId(d) !== docId))
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Could not restore document.')
          } finally {
            setRestoringId(null)
          }
        },
      },
    ])
  }

  const deleteForever = (doc: DocumentItem) => {
    const docId = getSafeId(doc)
    Alert.alert(
      'Delete Permanently',
      `Permanently delete "${doc.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDocumentPermanently(docId)
              setDocs((prev) => prev.filter((d) => getSafeId(d) !== docId))
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Could not permanently delete document.')
            }
          },
        },
      ],
    )
  }

  const emptyTrashConfirm = () => {
    if (docs.length === 0) return
    Alert.alert(
      'Empty Trash',
      `Permanently delete all ${docs.length} document(s) in Trash?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Empty trash',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await emptyTrash()
              await load()
              if (result.failedCount > 0) {
                Alert.alert('Trash partially emptied', `${result.deletedCount} deleted; ${result.failedCount} failed.`)
              }
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Could not empty trash.')
            }
          },
        },
      ],
    )
  }

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View
                style={[
                  styles.headerIcon,
                  { backgroundColor: C.primaryDim, borderColor: C.primary },
                ]}
              >
                <FolderOpen size={20} color={C.primary} strokeWidth={2} />
              </View>
              <View style={styles.titleCopy}>
                <Text style={[styles.title, { color: C.text }]}>Documents</Text>
                <Text numberOfLines={1} style={[styles.subtitle, { color: C.muted }]}>
                  {loading
                    ? 'Loading...'
                    : libraryView === 'shared'
                      ? `${docs.length} shared documents`
                      : libraryView === 'starred'
                        ? `${docs.length} starred documents`
                        : libraryView === 'trash'
                          ? `${docs.length} documents in trash`
                      : `${subjects.length} subjects | ${docs.length} documents`}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.libraryTabs, { backgroundColor: C.cardElevated }]}>
            {([
              { value: 'mine' as const, label: 'My', icon: FolderOpen },
              { value: 'shared' as const, label: 'Shared', icon: Users },
              { value: 'starred' as const, label: 'Starred', icon: Star },
              { value: 'trash' as const, label: 'Trash', icon: Trash2 },
            ]).map((item) => {
              const value = item.value
              const active = libraryView === value
              const Icon = item.icon
              return (
                <Pressable
                  accessibilityRole="button"
                  key={value}
                  onPress={() => {
                    setSearch('')
                    setSubjectFilter('ALL')
                    setFileTypeFilter('ALL')
                    setSelectedIds([])
                    setDocs([])          // clear data cũ ngay lập tức
                    setLoading(true)     // bật spinner ngay
                    setLibraryView(value)
                  }}
                  style={[styles.libraryTab, active && { backgroundColor: C.primary }]}
                >
                  <Icon size={15} color={active ? '#fff' : C.muted} />
                  <Text style={[styles.libraryTabText, { color: active ? '#fff' : C.muted }]}>
                    {item.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          {libraryView === 'mine' ? (
          <View style={styles.primaryActions}>
            <Pressable
              accessibilityLabel="Open subject workspaces"
              onPress={() => router.push('/(app)/subjects')}
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: C.cardElevated, borderColor: C.primary },
                pressed && styles.pressed,
              ]}
            >
              <FolderOpen size={17} color={C.primary} />
              <Text
                numberOfLines={1}
                style={[styles.actionButtonText, { color: C.primary }]}
              >
                Workspaces
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Upload document"
              onPress={() => openUpload()}
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: C.primary, borderColor: C.primary },
                pressed && styles.pressed,
              ]}
            >
              <UploadCloud size={17} color="#fff" />
              <Text
                numberOfLines={1}
                style={[styles.actionButtonText, { color: '#fff' }]}
              >
                Upload doc
              </Text>
            </Pressable>
          </View>
          ) : null}

          {libraryView === 'trash' && docs.length > 0 ? (
            <View style={styles.primaryActions}>
              <Pressable
                accessibilityLabel="Empty trash"
                onPress={emptyTrashConfirm}
                style={({ pressed }) => [
                  styles.actionButton,
                  { backgroundColor: C.error, borderColor: C.error },
                  pressed && styles.pressed,
                ]}
              >
                <Trash2 size={17} color="#fff" />
                <Text
                  numberOfLines={1}
                  style={[styles.actionButtonText, { color: '#fff' }]}
                >
                  Empty trash
                </Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.searchRow}>
            <Input
              placeholder="Search documents"
              value={search}
              onChangeText={setSearch}
              leftIcon={<Search size={16} color={C.muted} />}
              containerStyle={styles.searchInput}
              style={styles.compactInput}
            />
            <Pressable
              accessibilityLabel="Filter and sort documents"
              onPress={() => setShowFilters(true)}
              style={[
                styles.filterButton,
                {
                  backgroundColor: activeFilterCount ? C.primaryDim : C.card,
                  borderColor: activeFilterCount ? C.primary : C.cardBorder,
                },
              ]}
            >
              <SlidersHorizontal size={17} color={activeFilterCount ? C.primary : C.textSecondary} />
              {activeFilterCount ? (
                <View style={[styles.filterCount, { backgroundColor: C.primary }]}>
                  <Text style={styles.filterCountText}>{activeFilterCount}</Text>
                </View>
              ) : null}
            </Pressable>
          </View>

          <View style={styles.resultRow}>
            <Text style={[styles.resultText, { color: C.muted }]}>
              {filteredDocs.length} {filteredDocs.length === 1 ? 'document' : 'documents'}
            </Text>
            <Text style={[styles.resultText, { color: C.muted }]}>
              {sortBy === 'UPDATED_DESC' ? 'Recently updated' : sortBy === 'NAME_ASC' ? 'Name A-Z' : 'Largest first'}
            </Text>
          </View>

          {selectedIds.length > 0 ? (
            <View style={[styles.selectionBar, { backgroundColor: C.text }]}>
              <Pressable onPress={() => setSelectedIds([])} style={styles.selectionCount}>
                <X size={16} color="#fff" />
                <Text style={styles.selectionText}>{selectedIds.length} selected</Text>
              </Pressable>
              <View style={styles.selectionActions}>
                <Pressable accessibilityLabel="Download selected" onPress={() => void bulkDownload()} style={styles.selectionButton}>
                  <Download size={17} color="#fff" />
                </Pressable>
                {libraryView === 'mine' ? (
                  <Pressable accessibilityLabel="Move selected to Trash" onPress={bulkMoveToTrash} style={styles.selectionButton}>
                    <Trash2 size={17} color="#fff" />
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : null}

          <ScrollView
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true)
                  load(true)
                }}
                tintColor={C.primary}
                colors={[C.primary]}
              />
            }
          >
            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={C.primary} />
              </View>
            ) : (libraryView !== 'mine' ? visibleFlatDocs.length === 0 : groups.length === 0) ? (
              <View style={styles.empty}>
                <View
                  style={[
                    styles.emptyIcon,
                    { backgroundColor: C.primaryDim, borderColor: C.cardBorder },
                  ]}
                >
                  <FolderOpen size={36} color={C.muted} strokeWidth={1.5} />
                </View>
                <Text style={[styles.emptyTitle, { color: C.textSecondary }]}>
                  {libraryView === 'shared'
                    ? 'No shared documents yet'
                    : libraryView === 'starred'
                      ? 'No starred documents yet'
                      : libraryView === 'trash'
                        ? 'Trash is empty'
                        : 'No documents yet'}
                </Text>
                <Text style={[styles.emptySubtitle, { color: C.muted }]}>
                  {libraryView === 'shared'
                    ? 'Documents shared with your account will appear here.'
                    : libraryView === 'starred'
                      ? 'Star important documents to find them quickly.'
                      : libraryView === 'trash'
                        ? 'Documents moved to trash will appear here.'
                    : 'Tap the + button to upload your first document'}
                </Text>
              </View>
            ) : libraryView !== 'mine' ? (
              visibleFlatDocs.map((document, index) => {
                const documentId = getSafeId(document)
                const accessLabel =
                  libraryView === 'trash'
                    ? `${document.trashDaysRemaining ?? '?'}d left`
                    : document.accessRole === 'EDITOR'
                      ? 'Editor'
                      : document.accessRole === 'VIEWER'
                        ? 'Viewer'
                        : 'Owner'
                const subjectLabel = getSubjectName(document.subject, 'Unassigned')
                return (
                  <Pressable
                    key={documentId || `shared-${index}`}
                    onPress={() => {
                      if (libraryView !== 'trash') {
                        openOrSelect(document)
                      }
                    }}
                    onLongPress={() => toggleSelected(document)}
                    delayLongPress={350}
                    style={({ pressed }) => [
                      selectedIds.includes(documentId) && styles.selectedRow,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Card style={styles.sharedCard}>
                      <View style={styles.sharedTopRow}>
                        <View style={[styles.docIcon, { backgroundColor: `${fileTypeColor(document.fileType, C)}22` }]}>
                          <FileText size={17} color={fileTypeColor(document.fileType, C)} />
                        </View>
                        <View style={styles.docInfo}>
                          <Text selectable numberOfLines={2} style={[styles.docTitle, { color: C.text }]}>
                            {document.title}
                          </Text>
                          <Text numberOfLines={1} style={[styles.sharedBy, { color: C.muted }]}>
                            {libraryView === 'shared'
                              ? `Shared by ${document.sharedBy?.fullName || document.sharedBy?.email || 'Unknown'}`
                              : libraryView === 'trash'
                                ? `Deleted ${document.deletedAt ? new Date(document.deletedAt).toLocaleDateString() : 'recently'}`
                                : document.isShared
                                  ? `Shared by ${document.sharedBy?.fullName || document.sharedBy?.email || 'Unknown'}`
                                  : 'My document'}
                          </Text>
                        </View>
                        <View style={[styles.roleBadge, { backgroundColor: C.primaryDim }]}>
                          <Text style={[styles.roleBadgeText, { color: C.primary }]}>{accessLabel}</Text>
                        </View>
                      </View>
                      <View style={[styles.sharedFooter, { borderTopColor: C.cardBorder }]}>
                        <Text numberOfLines={1} style={[styles.docMetaText, { color: C.muted, flex: 1 }]}>
                          {subjectLabel} | {formatBytes(document.fileSize)}
                          {libraryView === 'trash'
                            ? ` | ${document.ragStatus === 'DELETE_PENDING' ? 'Cleaning AI data' : document.ragStatus === 'FAILED' ? 'AI cleanup failed' : 'Ready to restore'}`
                            : ''}
                        </Text>
                        {libraryView === 'trash' ? (
                          <>
                            <Pressable
                              accessibilityLabel={`Restore ${document.title}`}
                              disabled={restoringId === documentId}
                              hitSlop={8}
                              onPress={(event) => {
                                event.stopPropagation()
                                restoreFromTrash(document)
                              }}
                              style={[styles.iconBtn, { backgroundColor: C.primaryDim }]}
                            >
                              {restoringId === documentId ? (
                                <ActivityIndicator size="small" color={C.primary} />
                              ) : (
                                <RotateCcw size={15} color={C.primary} />
                              )}
                            </Pressable>
                            <Pressable
                              accessibilityLabel={`Permanently delete ${document.title}`}
                              hitSlop={8}
                              onPress={(event) => {
                                event.stopPropagation()
                                deleteForever(document)
                              }}
                              style={[styles.iconBtn, { backgroundColor: C.cardElevated }]}
                            >
                              <Trash2 size={15} color={C.error} />
                            </Pressable>
                          </>
                        ) : (
                          <>
                            {document.isShared ? (
                              <Pressable
                                accessibilityLabel={`Assign subject for ${document.title}`}
                                hitSlop={8}
                                onPress={(event) => {
                                  event.stopPropagation()
                                  setClassifyingDocument(document)
                                }}
                                style={[styles.iconBtn, { backgroundColor: C.cardElevated }]}
                              >
                                <BookOpen size={15} color={C.primary} />
                              </Pressable>
                            ) : null}
                            <Pressable
                              accessibilityLabel={document.isStarred ? `Unstar ${document.title}` : `Star ${document.title}`}
                              hitSlop={8}
                              onPress={(event) => {
                                event.stopPropagation()
                                void toggleStar(document)
                              }}
                              style={[styles.iconBtn, { backgroundColor: C.cardElevated }]}
                            >
                              <Star
                                size={15}
                                color={document.isStarred ? '#F59E0B' : C.muted}
                                fill={document.isStarred ? '#F59E0B' : 'transparent'}
                              />
                            </Pressable>
                            <Pressable
                              accessibilityLabel={`Download ${document.title}`}
                              hitSlop={8}
                              onPress={(event) => {
                                event.stopPropagation()
                                void downloadDocument(document)
                              }}
                              style={[styles.iconBtn, { backgroundColor: C.primaryDim }]}
                            >
                              <Download size={15} color={C.primary} />
                            </Pressable>
                          </>
                        )}
                      </View>
                    </Card>
                  </Pressable>
                )
              })
            ) : (
              groups.map((g, index) => {
                const isUncategorized = g.subject.id === '__uncategorized__'
                const groupId = isUncategorized ? '__uncategorized__' : getSafeId(g.subject)
                const safeGroupKey = groupId || `group-fallback-${index}`
                const isOpen = !!expanded[groupId]

                return (
                  <Card key={safeGroupKey} style={styles.subjectCard}>
                    <View style={styles.subjectHeader}>
                      <Pressable
                        accessibilityLabel={isUncategorized ? 'Expand uncategorized documents' : `Open ${g.subject.name} workspace`}
                        style={styles.subjectHeaderLeft}
                        onPress={() => {
                          if (isUncategorized) {
                            toggleExpand(groupId)
                            return
                          }
                          router.push(`/(app)/subject/${groupId}` as any)
                        }}
                      >
                        <View
                          style={[
                            styles.subjectIcon,
                            {
                              backgroundColor: isUncategorized
                                ? C.overlayDark
                                : C.primaryDim,
                            },
                          ]}
                        >
                          {isUncategorized ? (
                            <FileText size={20} color={C.muted} />
                          ) : (
                            <BookOpen size={20} color={C.primary} />
                          )}
                        </View>
                        <View style={styles.subjectInfo}>
                          <Text
                            style={[styles.subjectName, { color: C.text }]}
                            numberOfLines={1}
                          >
                            {g.subject.name}
                          </Text>
                          {!isUncategorized && g.subject.code ? (
                            <Text
                              style={[styles.subjectCode, { color: C.primary }]}
                            >
                              {g.subject.code}
                            </Text>
                          ) : null}
                          <Text
                            style={[styles.subjectCount, { color: C.muted }]}
                          >
                            {g.docs.length} documents
                          </Text>
                        </View>
                      </Pressable>
                      <View style={styles.subjectHeaderRight}>
                        {!isUncategorized ? (
                          <Pressable
                            accessibilityLabel={`Upload document to ${g.subject.name}`}
                            onPress={() => openUpload(g.subject)}
                            hitSlop={8}
                            style={({ pressed }) => [
                              styles.addIconBtn,
                              pressed && styles.pressed,
                            ]}
                          >
                            <Plus size={14} color={C.primary} />
                          </Pressable>
                        ) : null}
                        <Pressable
                          accessibilityLabel={isOpen ? `Collapse ${g.subject.name}` : `Expand ${g.subject.name}`}
                          onPress={() => toggleExpand(groupId)}
                          hitSlop={8}
                          style={styles.pressed}
                        >
                          {isOpen ? (
                            <ChevronDown size={20} color={C.muted} />
                          ) : (
                            <ChevronRight size={20} color={C.muted} />
                          )}
                        </Pressable>
                      </View>
                    </View>

                    {isOpen ? (
                      <View
                        style={[
                          styles.docsList,
                          { borderTopColor: C.cardBorder },
                        ]}
                      >
                        {g.docs.map((d, dIndex) => {
                          const safeDocKey = getSafeId(d) || `doc-fallback-${dIndex}`
                          return (
                            <Pressable
                              key={safeDocKey}
                              onPress={() => openOrSelect(d)}
                              onLongPress={() => toggleSelected(d)}
                              delayLongPress={350}
                              style={({ pressed }) => [
                                styles.docItem,
                                {
                                  backgroundColor: selectedIds.includes(getSafeId(d))
                                    ? C.primaryDim
                                    : C.cardElevated,
                                  borderColor: selectedIds.includes(getSafeId(d))
                                    ? C.primary
                                    : C.cardBorder,
                                },
                                pressed && styles.pressed,
                              ]}
                            >
                              <View
                                style={[
                                  styles.docIcon,
                                  {
                                    backgroundColor: `${fileTypeColor(
                                      d.fileType,
                                      C
                                    )}22`,
                                  },
                                ]}
                              >
                                <FileText
                                  size={16}
                                  color={fileTypeColor(d.fileType, C)}
                                />
                              </View>
                              <View style={styles.docInfo}>
                                <Text
                                  style={[styles.docTitle, { color: C.text }]}
                                  numberOfLines={1}
                                >
                                  {d.title}
                                </Text>
                                <View style={styles.docMeta}>
                                  {d.visibility === 'PUBLIC' ? (
                                    <Globe size={10} color={C.success} />
                                  ) : (
                                    <Lock size={10} color={C.muted} />
                                  )}
                                  <Text
                                    style={[
                                      styles.docMetaText,
                                      { color: C.muted },
                                    ]}
                                  >
                                    {formatBytes(d.fileSize)}
                                  </Text>
                                  {d.totalChunks ? (
                                    <>
                                      <Layers size={10} color={C.primary} />
                                      <Text
                                        style={[
                                          styles.docMetaText,
                                          { color: C.primary },
                                        ]}
                                      >
                                        {d.totalChunks}
                                      </Text>
                                    </>
                                  ) : null}
                                </View>
                              </View>
                              {currentUser && (d.ownerId === currentUser.id || currentUser.role === 'admin') ? (
                                <View style={styles.docActions}>
                                  <Pressable
                                    accessibilityLabel={d.isStarred ? `Unstar ${d.title}` : `Star ${d.title}`}
                                    onPress={(event) => {
                                      event.stopPropagation()
                                      void toggleStar(d)
                                    }}
                                    hitSlop={8}
                                    style={styles.iconBtn}
                                  >
                                    <Star
                                      size={12}
                                      color={d.isStarred ? '#F59E0B' : C.muted}
                                      fill={d.isStarred ? '#F59E0B' : 'transparent'}
                                    />
                                  </Pressable>
                                  <Pressable
                                    accessibilityLabel={`Download ${d.title}`}
                                    onPress={(event) => {
                                      event.stopPropagation()
                                      void downloadDocument(d)
                                    }}
                                    hitSlop={8}
                                    style={styles.iconBtn}
                                  >
                                    <Download size={12} color={C.primary} />
                                  </Pressable>
                                  <Pressable
                                    accessibilityLabel={`Share ${d.title}`}
                                    onPress={(event) => {
                                      event.stopPropagation()
                                      setSharingDocument(d)
                                    }}
                                    hitSlop={8}
                                    style={styles.iconBtn}
                                  >
                                    <Share2 size={12} color={C.primary} />
                                  </Pressable>
                                  <Pressable
                                    onPress={(event) => {
                                      event.stopPropagation()
                                      void toggleVisibility(d)
                                    }}
                                    hitSlop={8}
                                    style={styles.iconBtn}
                                  >
                                    {d.visibility === 'PUBLIC' ? (
                                      <Lock size={12} color={C.muted} />
                                    ) : (
                                      <Globe size={12} color={C.success} />
                                    )}
                                  </Pressable>
                                  <Pressable
                                    onPress={(event) => {
                                      event.stopPropagation()
                                      removeDoc(d)
                                    }}
                                    hitSlop={8}
                                    style={styles.iconBtn}
                                  >
                                    <Trash2 size={12} color={C.error} />
                                  </Pressable>
                                </View>
                              ) : null}
                            </Pressable>
                          )
                        })}
                      </View>
                    ) : null}
                  </Card>
                )
              })
            )}
          </ScrollView>
        </View>
      </SafeAreaView>

      {/* Upload Modal */}
      <Modal
        visible={showUpload}
        transparent
        animationType="slide"
        onRequestClose={closeUpload}
      >
        <Pressable style={styles.overlay} onPress={closeUpload}>
          <Pressable
            style={[styles.sheet, { backgroundColor: C.card }]}
            onPress={() => {}}
          >
            <View style={[styles.sheetHandle, { backgroundColor: C.cardBorder }]} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: C.text }]}>
                Upload Document
              </Text>
              <Pressable onPress={closeUpload} hitSlop={8} disabled={uploading}>
                <X size={20} color={C.muted} />
              </Pressable>
            </View>

            {uploading ? (
              <View style={styles.progressWrap}>
                <View
                  style={[styles.progressBar, { backgroundColor: C.cardBorder }]}
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${uploadProgress}%`,
                        backgroundColor: C.primary,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.progressLabel, { color: C.muted }]}>
                  {uploadProgress < 100
                    ? `Uploading... ${uploadProgress}%`
                    : 'Processing... 100%'}
                </Text>
              </View>
            ) : null}

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={[styles.label, { color: C.textSecondary }]}>
                File <Text style={styles.required}>*</Text>
              </Text>
              <Pressable
                onPress={pickFile}
                disabled={uploading}
                style={({ pressed }) => [
                  styles.filePicker,
                  {
                    backgroundColor: C.cardElevated,
                    borderColor: pickedFile ? C.primary : C.cardBorder,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <FolderOpen
                  size={18}
                  color={pickedFile ? C.primary : C.muted}
                />
                <Text
                  style={[
                    styles.filePickerText,
                    {
                      color: pickedFile ? C.primary : C.muted,
                      fontWeight: pickedFile ? '600' : '400',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {pickedFile
                    ? pickedFile.name
                    : 'Choose PDF, DOCX, PPTX, XLSX, TXT, or MD'}
                </Text>
              </Pressable>

              <Text style={[styles.label, { color: C.textSecondary }]}>
                Title <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                value={formTitle}
                onChangeText={setFormTitle}
                placeholder="Document title"
                placeholderTextColor={C.muted}
                editable={!uploading}
                style={[
                  styles.input,
                  {
                    backgroundColor: C.cardElevated,
                    borderColor: C.cardBorder,
                    color: C.text,
                  },
                ]}
              />

              <Text style={[styles.label, { color: C.textSecondary }]}>
                Subject
              </Text>
              <Pressable
                onPress={() => setShowSubjectPicker(true)}
                disabled={uploading}
                style={({ pressed }) => [
                  styles.pickerTrigger,
                  {
                    backgroundColor: C.cardElevated,
                    borderColor: C.cardBorder,
                  },
                  pressed && styles.pressed,
                ]}
              >
                {formSubject ? (
                  <View style={styles.pickerSelected}>
                    <View
                      style={[
                        styles.pickerDot,
                        { backgroundColor: formSubject.color ?? C.primary },
                      ]}
                    />
                    <View style={styles.pickerInfo}>
                      <Text
                        style={[styles.pickerName, { color: C.text }]}
                        numberOfLines={1}
                      >
                        {formSubject.name}
                      </Text>
                      {formSubject.code ? (
                        <Text
                          style={[styles.pickerCode, { color: C.muted }]}
                        >
                          {formSubject.code}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ) : (
                  <View style={styles.pickerSelected}>
                    <FolderOpen size={16} color={C.muted} />
                    <Text style={[styles.pickerPlaceholder, { color: C.muted }]}>
                      Unassigned
                    </Text>
                  </View>
                )}
                <ChevronDown size={18} color={C.muted} />
              </Pressable>

              <Text style={[styles.label, { color: C.textSecondary }]}>
                Description
              </Text>
              <TextInput
                value={formDesc}
                onChangeText={setFormDesc}
                placeholder="Optional description"
                placeholderTextColor={C.muted}
                multiline
                editable={!uploading}
                style={[
                  styles.input,
                  styles.inputArea,
                  {
                    backgroundColor: C.cardElevated,
                    borderColor: C.cardBorder,
                    color: C.text,
                  },
                ]}
              />

              <Text style={[styles.label, { color: C.textSecondary }]}>
                Author
              </Text>
              <TextInput
                value={formAuthor}
                onChangeText={setFormAuthor}
                placeholder="Optional author"
                placeholderTextColor={C.muted}
                editable={!uploading}
                style={[
                  styles.input,
                  {
                    backgroundColor: C.cardElevated,
                    borderColor: C.cardBorder,
                    color: C.text,
                  },
                ]}
              />

              <Text style={[styles.label, { color: C.textSecondary }]}>
                Tags (comma separated)
              </Text>
              <TextInput
                value={formTags}
                onChangeText={setFormTags}
                placeholder="e.g. lecture, notes, week-1"
                placeholderTextColor={C.muted}
                editable={!uploading}
                style={[
                  styles.input,
                  {
                    backgroundColor: C.cardElevated,
                    borderColor: C.cardBorder,
                    color: C.text,
                  },
                ]}
              />



              <Pressable
                onPress={submitUpload}
                disabled={uploading}
                style={({ pressed }) => [
                  styles.submitBtn,
                  { backgroundColor: C.primary },
                  (pressed || uploading) && styles.pressed,
                ]}
              >
                {uploading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <UploadCloud size={16} color="#fff" />
                )}
                <Text style={styles.submitText}>
                  {uploading ? 'Uploading...' : 'Upload'}
                </Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Subject Picker Modal */}
      <Modal
        visible={showSubjectPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSubjectPicker(false)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setShowSubjectPicker(false)}
        >
          <Pressable
            style={[styles.sheet, { backgroundColor: C.card }]}
            onPress={() => {}}
          >
            <View
              style={[styles.sheetHandle, { backgroundColor: C.cardBorder }]}
            />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: C.text }]}>
                Select Subject
              </Text>
              <Pressable
                onPress={() => setShowSubjectPicker(false)}
                hitSlop={8}
              >
                <X size={20} color={C.muted} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Pressable
                onPress={() => {
                  setFormSubject(null)
                  setShowSubjectPicker(false)
                }}
                style={({ pressed }) => [
                  styles.subjectOption,
                  {
                    backgroundColor: !formSubject
                      ? C.primaryDim
                      : C.cardElevated,
                    borderColor: !formSubject ? C.primary : C.cardBorder,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <View
                  style={[
                    styles.subjectIcon,
                    { backgroundColor: C.overlayDark },
                  ]}
                >
                  <FileText size={18} color={C.muted} />
                </View>
                <Text
                  style={[styles.pickerName, { color: C.text, flex: 1 }]}
                >
                  Unassigned
                </Text>
                {!formSubject ? <Check size={18} color={C.primary} /> : null}
              </Pressable>

              {subjects.map((s, index) => {
                const sId = getSafeId(s)
                const safeKey = sId || `picker-sub-${index}`
                const active = formSubject && getSafeId(formSubject) === sId
                return (
                  <Pressable
                    key={safeKey}
                    onPress={() => {
                      setFormSubject(s)
                      setShowSubjectPicker(false)
                    }}
                    style={({ pressed }) => [
                      styles.subjectOption,
                      {
                        backgroundColor: active ? C.primaryDim : C.cardElevated,
                        borderColor: active ? C.primary : C.cardBorder,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <View
                      style={[
                        styles.subjectIcon,
                        { backgroundColor: C.primaryDim },
                      ]}
                    >
                      <BookOpen size={18} color={C.primary} />
                    </View>
                    <View style={styles.pickerInfo}>
                      <Text
                        style={[styles.pickerName, { color: C.text }]}
                        numberOfLines={1}
                      >
                        {s.name}
                      </Text>
                      {s.code ? (
                        <Text
                          style={[styles.pickerCode, { color: C.muted }]}
                        >
                          {s.code}
                        </Text>
                      ) : null}
                    </View>
                    {active ? <Check size={18} color={C.primary} /> : null}
                  </Pressable>
                )
              })}

              {subjects.length === 0 ? (
                <View style={styles.emptyPicker}>
                  <Text style={{ color: C.muted, fontSize: FontSize.sm }}>
                    No subjects yet
                  </Text>
                  <Text
                    style={{ color: C.muted, fontSize: FontSize.xs }}
                  >
                    Create subjects from the Subjects tab first
                  </Text>
                </View>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={showFilters} transparent animationType="slide" onRequestClose={() => setShowFilters(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowFilters(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: C.card }]} onPress={() => {}}>
            <View style={[styles.sheetHandle, { backgroundColor: C.cardBorder }]} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={[styles.sheetTitle, { color: C.text }]}>Filter and sort</Text>
                <Text style={[styles.filterHint, { color: C.muted }]}>Refine the current document view</Text>
              </View>
              <Pressable accessibilityLabel="Close filters" onPress={() => setShowFilters(false)} style={styles.iconBtn}>
                <X size={20} color={C.textSecondary} />
              </Pressable>
            </View>

            <Text style={[styles.filterLabel, { color: C.textSecondary }]}>Sort by</Text>
            <View style={styles.optionWrap}>
              {([
                ['UPDATED_DESC', 'Recently updated'],
                ['NAME_ASC', 'Name A-Z'],
                ['SIZE_DESC', 'Largest first'],
              ] as const).map(([value, label]) => (
                <Pressable
                  key={value}
                  onPress={() => setSortBy(value)}
                  style={[
                    styles.filterOption,
                    {
                      backgroundColor: sortBy === value ? C.primaryDim : C.card,
                      borderColor: sortBy === value ? C.primary : C.cardBorder,
                    },
                  ]}
                >
                  <ArrowDownAZ size={14} color={sortBy === value ? C.primary : C.muted} />
                  <Text style={[styles.filterOptionText, { color: sortBy === value ? C.primary : C.textSecondary }]}>{label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.filterLabel, { color: C.textSecondary }]}>File type</Text>
            <View style={styles.optionWrap}>
              {['ALL', 'PDF', 'DOC', 'PPT', 'TXT'].map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setFileTypeFilter(value)}
                  style={[
                    styles.filterOption,
                    {
                      backgroundColor: fileTypeFilter === value ? C.primaryDim : C.card,
                      borderColor: fileTypeFilter === value ? C.primary : C.cardBorder,
                    },
                  ]}
                >
                  <Text style={[styles.filterOptionText, { color: fileTypeFilter === value ? C.primary : C.textSecondary }]}>
                    {value === 'ALL' ? 'All types' : value}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.filterLabel, { color: C.textSecondary }]}>Subject</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionWrap}>
              {['ALL', ...filterSubjectNames].map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setSubjectFilter(value)}
                  style={[
                    styles.filterOption,
                    {
                      backgroundColor: subjectFilter === value ? C.primaryDim : C.card,
                      borderColor: subjectFilter === value ? C.primary : C.cardBorder,
                    },
                  ]}
                >
                  <Text style={[styles.filterOptionText, { color: subjectFilter === value ? C.primary : C.textSecondary }]}>
                    {value === 'ALL' ? 'All subjects' : value}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.filterFooter}>
              <Pressable
                onPress={() => {
                  setSubjectFilter('ALL')
                  setFileTypeFilter('ALL')
                  setSortBy('UPDATED_DESC')
                }}
                style={[styles.filterFooterButton, { borderColor: C.cardBorder }]}
              >
                <Text style={[styles.filterFooterText, { color: C.textSecondary }]}>Clear</Text>
              </Pressable>
              <Pressable onPress={() => setShowFilters(false)} style={[styles.filterFooterButton, { backgroundColor: C.primary, borderColor: C.primary }]}>
                <CheckSquare size={16} color="#fff" />
                <Text style={[styles.filterFooterText, { color: '#fff' }]}>Show results</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <DocumentShareSheet
        document={sharingDocument}
        onClose={() => setSharingDocument(null)}
        visible={Boolean(sharingDocument)}
      />
      <SharedDocumentSubjectSheet
        document={classifyingDocument}
        subjects={subjects}
        onClose={() => setClassifyingDocument(null)}
        onUpdated={replaceDocument}
        visible={Boolean(classifyingDocument)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: Spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  titleRow: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  titleCopy: { flex: 1, minWidth: 0 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    letterSpacing: 0,
  },
  subtitle: { fontSize: FontSize.xs, fontWeight: '500', marginTop: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  libraryTabs: {
    flexDirection: 'row',
    borderRadius: Radius.lg,
    padding: 4,
    marginBottom: Spacing.md,
  },
  libraryTab: {
    flex: 1,
    minHeight: 40,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  libraryTabText: { fontSize: FontSize.xs, fontWeight: '800' },
  primaryActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  actionButton: {
    flex: 1,
    minWidth: 0,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: Spacing.sm,
  },
  actionButtonText: {
    flexShrink: 1,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  searchInput: { flex: 1 },
  compactInput: { fontSize: FontSize.sm },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCount: {
    position: 'absolute',
    top: 5,
    right: 5,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  resultText: { fontSize: FontSize.xs, fontWeight: '600' },
  selectionBar: {
    minHeight: 46,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectionCount: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 8 },
  selectionText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '700' },
  selectionActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  selectionButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  listContent: { gap: Spacing.sm, paddingBottom: Spacing.xxl + 16 },
  loadingWrap: { paddingTop: 60, alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.md },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  emptyTitle: { fontSize: FontSize.md, fontWeight: '700' },
  emptySubtitle: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 20,
  },
  subjectCard: { padding: Spacing.md, borderRadius: Radius.md },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  subjectHeaderLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  subjectHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  subjectIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectInfo: { flex: 1 },
  subjectName: { fontSize: FontSize.base, fontWeight: '700' },
  subjectCode: { fontSize: FontSize.xs, fontWeight: '600', marginTop: 2 },
  subjectCount: { fontSize: FontSize.xs, marginTop: 2 },
  addIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docsList: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  docIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docInfo: { flex: 1 },
  docTitle: { fontSize: FontSize.sm, fontWeight: '600' },
  docMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  docMetaText: { fontSize: 10 },
  docActions: { flexDirection: 'row', gap: 4 },
  sharedCard: { padding: Spacing.md, gap: Spacing.sm, borderRadius: Radius.md },
  selectedRow: { borderRadius: Radius.md, borderWidth: 2, borderColor: '#2F6B4F' },
  sharedTopRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sharedBy: { fontSize: FontSize.xs, paddingTop: 3 },
  roleBadge: { borderRadius: Radius.full, paddingHorizontal: 9, paddingVertical: 5 },
  roleBadgeText: { fontSize: 10, fontWeight: '800' },
  sharedFooter: { borderTopWidth: 1, paddingTop: Spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  iconBtn: { padding: 6, borderRadius: Radius.sm },
  pressed: { opacity: 0.6 },
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
  filterHint: { fontSize: FontSize.xs, paddingTop: 2 },
  filterLabel: { fontSize: FontSize.sm, fontWeight: '700', paddingTop: Spacing.sm, paddingBottom: 8 },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterOption: {
    minHeight: 36,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterOptionText: { fontSize: FontSize.xs, fontWeight: '700' },
  filterFooter: { flexDirection: 'row', gap: Spacing.sm, paddingTop: Spacing.lg },
  filterFooterButton: {
    flex: 1,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  filterFooterText: { fontSize: FontSize.sm, fontWeight: '700' },
  progressWrap: { marginBottom: Spacing.sm, gap: 4 },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressLabel: { textAlign: 'right', fontSize: FontSize.xs },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginTop: Spacing.md,
    marginBottom: 6,
  },
  required: { color: '#EF4444' },
  filePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 50,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingHorizontal: Spacing.md,
  },
  filePickerText: { flex: 1, fontSize: FontSize.sm },
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
  subjectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    marginBottom: Spacing.sm,
  },
  emptyPicker: { alignItems: 'center', padding: Spacing.xl, gap: 4 },
})
