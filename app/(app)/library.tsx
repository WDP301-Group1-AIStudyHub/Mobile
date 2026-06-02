import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  FlatList,
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
  FileText,
  Plus,
  Search,
  Trash2,
  UploadCloud,
  Library,
  FolderOpen,
  X,
} from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import * as DocumentPicker from 'expo-document-picker'
import VideoBg from '../../components/ui/VideoBg'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import ThemeToggle from '../../components/ui/ThemeToggle'
import { FontSize, Spacing, Radius } from '../../constants/colors'
import { useColors } from '../../contexts/ThemeContext'
import { deleteDocument, listDocuments, uploadDocument } from '../../services/documentApi'
import type { DocumentItem } from '../../types/document'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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

type PickedFile = { uri: string; name: string; type: string; size?: number }

export default function LibraryPage() {
  const C = useColors()
  const [docs, setDocs] = useState<DocumentItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Upload modal state
  const [showModal, setShowModal] = useState(false)
  const [pickedFile, setPickedFile] = useState<PickedFile | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formSubject, setFormSubject] = useState('')
  const [formDesc, setFormDesc] = useState('')

  const loadDocs = async () => {
    try {
      const data = await listDocuments()
      setDocs(Array.isArray(data) ? data : [])
    } catch {
      setDocs([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadDocs() }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    loadDocs()
  }

  const openUploadModal = () => {
    setPickedFile(null)
    setFormTitle('')
    setFormSubject('')
    setFormDesc('')
    setShowModal(true)
  }

  const resetForm = () => {
    setPickedFile(null)
    setFormTitle('')
    setFormSubject('')
    setFormDesc('')
  }

  const handlePickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
          'text/markdown'
        ],
        copyToCacheDirectory: true,
      })
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0]
        setPickedFile({
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'application/octet-stream',
          size: file.size,
        })
        if (!formTitle) {
          const nameWithoutExt = file.name.split('.').slice(0, -1).join('.') || file.name
          setFormTitle(nameWithoutExt)
        }
      }
    } catch (e) {
      Alert.alert('Error', 'Could not pick file.')
    }
  }

  const handleSubmitUpload = async () => {
    if (!pickedFile) { Alert.alert('No file', 'Please choose a file first.'); return }
    if (!formTitle.trim()) { Alert.alert('Missing title', 'Please enter a document title.'); return }
    setUploading(true)
    try {
      await uploadDocument({
        file: pickedFile,
        title: formTitle.trim(),
        subject: formSubject.trim() || undefined,
        description: formDesc.trim() || undefined,
      })
      setShowModal(false)
      resetForm()
      await loadDocs()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong.'
      // Pinecone/RAG indexing errors mean the document WAS saved but indexing failed.
      // Still reload the list and show a softer warning.
      const isIndexError =
        msg.toLowerCase().includes('pinecone') ||
        msg.toLowerCase().includes('dimension') ||
        msg.toLowerCase().includes('index') ||
        msg.toLowerCase().includes('embed')
      if (isIndexError) {
        setShowModal(false)
        resetForm()
        await loadDocs()
        Alert.alert(
          'Uploaded (partial)',
          'Your document was saved successfully. AI search indexing is temporarily unavailable — you can still use the document normally.',
        )
      } else {
        Alert.alert('Upload failed', msg)
      }
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = (doc: DocumentItem) => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${doc.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await deleteDocument(doc.id)
              setDocs((prev) => (Array.isArray(prev) ? prev : []).filter((d) => d.id !== doc.id))
            } catch {
              Alert.alert('Error', 'Could not delete document.')
            }
          },
        },
      ],
    )
  }

  const filtered = (Array.isArray(docs) ? docs : []).filter(
    (d) =>
      (d.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.subject || '').toLowerCase().includes(search.toLowerCase()),
  )

  const renderDoc = ({ item }: { item: DocumentItem }) => {
    const color = fileTypeColorFn(item.fileType, C)
    const label = fileTypeLabel(item.fileType)
    return (
      <Card elevated style={styles.docCard} row padding="md">
        <View style={[styles.docIcon, { backgroundColor: `${color}12` }]}>
          <FileText size={22} color={color} />
          <View style={[styles.docTypeBadge, { backgroundColor: `${color}22` }]}>
            <Text style={[styles.docTypeText, { color }]}>{label}</Text>
          </View>
        </View>
        <View style={styles.docInfo}>
          <Text style={styles.docTitle} numberOfLines={1}>{item.title}</Text>
          <View style={styles.docMeta}>
            {item.subject ? (
              <View style={styles.subjectPill}>
                <Text style={styles.subjectPillText}>{item.subject}</Text>
              </View>
            ) : null}
            <Text style={styles.docSize}>{formatBytes(item.fileSize)}</Text>
          </View>
          <Text style={styles.docDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
        <Pressable
          onPress={() => handleDelete(item)}
          style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}
          hitSlop={8}
        >
          <Trash2 size={16} color={C.muted} />
        </Pressable>
      </Card>
    )
  }


  const styles = useMemo(() => StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: Spacing.lg, gap: 0 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${C.primary}30`,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FontSize.xs,
    color: C.muted,
    fontWeight: '500',
    marginTop: 1,
  },
  uploadBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  uploadGradient: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    marginBottom: Spacing.md,
  },
  list: {
    gap: Spacing.sm,
    paddingBottom: Spacing.xxl + 16,
  },
  docCard: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  docIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    position: 'relative',
  },
  docTypeBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  docTypeText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  docInfo: { flex: 1, gap: 4 },
  docTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: C.text,
  },
  docMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  subjectPill: {
    backgroundColor: C.primaryDim,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  subjectPillText: {
    fontSize: FontSize.xs,
    color: C.primary,
    fontWeight: '600',
  },
  docSize: {
    fontSize: FontSize.xs,
    color: C.muted,
  },
  docDate: {
    fontSize: FontSize.xs,
    color: C.mutedLight,
  },
  deleteBtn: { padding: 4 },
  empty: {
    alignItems: 'center',
    paddingTop: Spacing.xxl + 16,
    gap: Spacing.md,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: C.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  emptyTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: C.textSecondary,
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    color: C.muted,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 20,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 14, 26, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: C.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    maxHeight: '88%',
    gap: Spacing.sm,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.cardBorder,
    marginBottom: Spacing.sm,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.3,
  },
  fieldGroup: {
    gap: 6,
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: C.textSecondary,
  },
  required: {
    color: C.error,
  },
  fieldReadOnly: {
    height: 46,
    backgroundColor: C.overlayDark,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: C.cardBorder,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  fieldReadOnlyText: {
    fontSize: FontSize.sm,
    color: C.mutedLight,
    fontStyle: 'italic',
  },
  filePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 50,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: C.cardBorder,
    borderStyle: 'dashed',
    paddingHorizontal: Spacing.md,
    backgroundColor: C.cardElevated,
  },
  filePickerSelected: {
    borderStyle: 'solid',
    borderColor: C.primary,
    backgroundColor: C.primaryDim,
  },
  filePickerText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: C.muted,
  },
  filePickerTextSelected: {
    color: C.primary,
    fontWeight: '600',
  },
  textField: {
    height: 50,
    backgroundColor: C.cardElevated,
    borderWidth: 1.5,
    borderColor: C.cardBorder,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.base,
    color: C.text,
  },
  textArea: {
    height: 90,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  submitBtn: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginTop: Spacing.sm,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 52,
    borderRadius: Radius.lg,
  },
  submitText: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
  },
}), [C])

  return (
    <VideoBg>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.headerIcon}>
                <Library size={20} color={C.primary} strokeWidth={2} />
              </View>
              <View>
                <Text style={styles.title}>Library</Text>
                <Text style={styles.subtitle}>
                  {loading ? 'Loading...' : `${docs.length} documents`}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={openUploadModal}
              disabled={uploading}
              style={({ pressed }) => [styles.uploadBtn, pressed && { opacity: 0.8 }]}
            >
              <LinearGradient
                colors={uploading ? ['#9ca3af', '#9ca3af'] : C.gradientPrimary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.uploadGradient}
              >
                {uploading
                  ? <UploadCloud size={18} color="#fff" />
                  : <Plus size={20} color="#fff" />}
              </LinearGradient>
            </Pressable>
            <ThemeToggle size={38} />
          </View>

          {/* Search */}
          <Input
            placeholder="Search documents..."
            value={search}
            onChangeText={setSearch}
            leftIcon={<Search size={16} color={C.muted} />}
            containerStyle={styles.searchInput}
          />

          {/* List */}
          <FlatList
            data={filtered}
            keyExtractor={(d) => d.id}
            renderItem={renderDoc}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={C.primary}
                colors={[C.primary]}
              />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <FileText size={36} color={C.muted} strokeWidth={1.5} />
                </View>
                <Text style={styles.emptyTitle}>
                  {loading ? 'Loading...' : 'No documents yet'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  Upload PDF, EPUB, or DOCX files to get started
                </Text>
              </View>
            }
          />
        </View>
      </SafeAreaView>

      {/* Upload Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowModal(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            {/* Handle */}
            <View style={styles.sheetHandle} />

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Document</Text>
              <Pressable onPress={() => setShowModal(false)} hitSlop={8}>
                <X size={20} color={C.muted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Document ID (read-only display) */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Document ID</Text>
                <View style={styles.fieldReadOnly}>
                  <Text style={styles.fieldReadOnlyText} numberOfLines={1}>
                    Auto-generated after upload
                  </Text>
                </View>
              </View>

              {/* File Picker */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>File <Text style={styles.required}>*</Text></Text>
                <Pressable
                  onPress={handlePickFile}
                  style={({ pressed }) => [styles.filePicker, pickedFile && styles.filePickerSelected, pressed && { opacity: 0.75 }]}
                >
                  <FolderOpen size={18} color={pickedFile ? C.primary : C.muted} />
                  <Text style={[styles.filePickerText, pickedFile && styles.filePickerTextSelected]} numberOfLines={1}>
                    {pickedFile ? pickedFile.name : 'Choose PDF, DOCX, PPTX, XLSX, TXT, or MD'}
                  </Text>
                </Pressable>
              </View>

              {/* Title */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Title <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.textField}
                  placeholder="Enter document title"
                  placeholderTextColor={C.muted}
                  value={formTitle}
                  onChangeText={setFormTitle}
                  returnKeyType="next"
                />
              </View>

              {/* Subject */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Subject</Text>
                <TextInput
                  style={styles.textField}
                  placeholder="e.g. Physics, Mathematic"
                  placeholderTextColor={C.muted}
                  value={formSubject}
                  onChangeText={setFormSubject}
                  returnKeyType="next"
                />
              </View>

              {/* Description */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Description</Text>
                <TextInput
                  style={[styles.textField, styles.textArea]}
                  placeholder="Brief description of this document"
                  placeholderTextColor={C.muted}
                  value={formDesc}
                  onChangeText={setFormDesc}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            {/* Submit */}
            <Pressable
              onPress={handleSubmitUpload}
              disabled={uploading}
              style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.85 }]}
            >
              <LinearGradient
                colors={uploading ? ['#9ca3af', '#9ca3af'] : C.gradientPrimary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitGradient}
              >
                {uploading
                  ? <UploadCloud size={18} color="#fff" />
                  : <Plus size={18} color="#fff" />}
                <Text style={styles.submitText}>
                  {uploading ? 'Uploading' : 'Upload Document'}
                </Text>
              </LinearGradient>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </VideoBg>
  )
}