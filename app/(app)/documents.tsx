import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
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
  Search,
  Trash2,
  UploadCloud,
  X,
  BookOpen,
  Check,
} from 'lucide-react-native'
import * as DocumentPicker from 'expo-document-picker'
import { router } from 'expo-router'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import ThemeToggle from '../../components/ui/ThemeToggle'
import { FontSize, Spacing, Radius } from '../../constants/colors'
import { useColors } from '../../contexts/ThemeContext'
import { useAuth } from '../../hooks/useAuth'
import {
  deleteDocument,
  listDocuments,
  uploadDocument,
  updateDocument,
} from '../../services/documentApi'
import { listSubjects } from '../../services/subjectApi'
import type {
  DocumentItem,
  DocumentVisibility,
} from '../../types/document'
import type { SubjectItem } from '../../types/subject'

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

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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
  const { state } = useAuth()
  const currentUser = state.status === 'authenticated' ? state.user : null
  const [docs, setDocs] = useState<DocumentItem[]>([])
  const [subjects, setSubjects] = useState<SubjectItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
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

  const load = useCallback(async () => {
    try {
      const [d, s] = await Promise.all([listDocuments(), listSubjects()])
      setDocs(Array.isArray(d) ? d : [])
      setSubjects(Array.isArray(s) ? s : [])
    } catch {
      setDocs([])
      setSubjects([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase()
    const match = (s: string) => s.toLowerCase().includes(q)

    const subjectNames = new Set(subjects.map((s) => s.name))
    const uncategorized: DocumentItem[] = []
    const bySubject: Record<string, DocumentItem[]> = {}
    
    for (const sub of subjects) bySubject[getSafeId(sub)] = []

    for (const d of docs) {
      const hit =
        !q ||
        match(d.title) ||
        match(d.fileName ?? '') ||
        (d.metadata?.tags ?? []).some((t) => match(t))
      if (!hit) continue

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
  }, [docs, subjects, search])

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
      await uploadDocument({
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
      load()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed.'
      Alert.alert('Upload failed', msg)
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
      'Delete Document',
      `Delete "${doc.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDocument(docId)
              setDocs((prev) => prev.filter((d) => getSafeId(d) !== docId))
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'Could not delete document.'
              Alert.alert('Error', msg)
            }
          },
        },
      ]
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
                <FileText size={20} color={C.primary} strokeWidth={2} />
              </View>
              <View>
                <Text style={[styles.title, { color: C.text }]}>Documents</Text>
                <Text style={[styles.subtitle, { color: C.muted }]}>
                  {loading ? 'Loading...' : `${docs.length} documents`}
                </Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <ThemeToggle />
              <Pressable
                onPress={() => openUpload()}
                style={({ pressed }) => [
                  styles.addBtn,
                  { backgroundColor: C.primary },
                  pressed && styles.pressed,
                ]}
              >
                <Plus size={18} color="#fff" />
              </Pressable>
            </View>
          </View>

          <Input
            placeholder="Search documents..."
            value={search}
            onChangeText={setSearch}
            leftIcon={<Search size={16} color={C.muted} />}
            containerStyle={styles.searchInput}
          />

          <ScrollView
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true)
                  load()
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
            ) : groups.length === 0 ? (
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
                  No documents yet
                </Text>
                <Text style={[styles.emptySubtitle, { color: C.muted }]}>
                  Tap the + button to upload your first document
                </Text>
              </View>
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
                        style={styles.subjectHeaderLeft}
                        onPress={() => toggleExpand(groupId)}
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
                              onPress={() =>
                                router.push(`/(app)/document/${getSafeId(d)}` as any)
                              }
                              style={({ pressed }) => [
                                styles.docItem,
                                { backgroundColor: C.cardElevated },
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
                                    onPress={() => toggleVisibility(d)}
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
                                    onPress={() => removeDoc(d)}
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
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
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: FontSize.xs, fontWeight: '500', marginTop: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: { marginBottom: Spacing.md },
  listContent: { gap: Spacing.sm, paddingBottom: Spacing.xxl + 16 },
  loadingWrap: { paddingTop: 60, alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.md },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
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
  subjectCard: { padding: Spacing.md },
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
  iconBtn: { padding: 6, borderRadius: Radius.sm },
  pressed: { opacity: 0.6 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 14, 26, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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