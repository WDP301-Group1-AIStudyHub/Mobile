import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useFocusEffect } from 'expo-router'
import {
  Brain,
  Trash2,
  Plus,
  ArrowLeft,
  ChevronRight,
  BookOpen,
  Sparkles,
  X,
  RotateCw,
} from 'lucide-react-native'
import { useColors } from '../../contexts/ThemeContext'
import { FontSize, Spacing, Radius } from '../../constants/colors'
import Input from '../../components/ui/Input'
import {
  getAllStudyMaterials,
  deleteStudyMaterial,
  generateStudyMaterial,
  StudyMaterial,
  MaterialType,
} from '../../services/studyMaterialApi'
import { listDocuments } from '../../services/documentApi'
import { listSubjects } from '../../services/subjectApi'
import type { DocumentItem } from '../../types/document'
import { normalizeAccessibleDocuments } from '../../utils/accessibleDocuments'
import type { SubjectItem } from '../../types/subject'

export default function StudyMaterialsPage() {
  const C = useColors()
  const [materials, setMaterials] = useState<StudyMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Creation Modal State
  const [showCreate, setShowCreate] = useState(false)
  const [docs, setDocs] = useState<DocumentItem[]>([])
  const [subjects, setSubjects] = useState<SubjectItem[]>([])
  const [loadingForm, setLoadingForm] = useState(false)

  // Form Fields
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [selectedDocId, setSelectedDocId] = useState('')
  const [materialType, setMaterialType] = useState<MaterialType>('FLASHCARD')
  const [questionCount, setQuestionCount] = useState(10)
  const [difficulty, setDifficulty] = useState('Medium')
  const [topicFocus, setTopicFocus] = useState('')
  const [generating, setGenerating] = useState(false)

  // Dropdown expansion states inside form
  const [showSubjectPicker, setShowSubjectPicker] = useState(false)
  const [showDocPicker, setShowDocPicker] = useState(false)

  const loadData = useCallback(async (isPoll = false) => {
    try {
      if (!isPoll) setLoading(true)
      const data = await getAllStudyMaterials()
      setMaterials(data)
      setError(null)
    } catch (err: any) {
      console.error('[study-materials] load error', err)
      setError(err instanceof Error ? err.message : 'Could not fetch study materials.')
    } finally {
      if (!isPoll) setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadData()
    }, [loadData]),
  )

  // Polling to update progress of generating items
  useEffect(() => {
    const hasGenerating = materials.some(
      (m) => m.status === 'PENDING' || m.status === 'GENERATING'
    )
    if (!hasGenerating) return

    const t = setInterval(() => {
      loadData(true)
    }, 3000)

    return () => clearInterval(t)
  }, [materials, loadData])

  const loadFormOptions = async () => {
    try {
      setLoadingForm(true)
      const [docsRes, subsRes] = await Promise.all([
        listDocuments(),
        listSubjects().catch(() => [] as SubjectItem[]),
      ])
      setDocs(normalizeAccessibleDocuments(docsRes))
      setSubjects(Array.isArray(subsRes) ? subsRes : [])
    } catch (err) {
      console.error('[study-materials] form load error', err)
    } finally {
      setLoadingForm(false)
    }
  }

  const openCreateModal = () => {
    setSelectedSubjectId('')
    setSelectedDocId('')
    setMaterialType('FLASHCARD')
    setQuestionCount(10)
    setDifficulty('Medium')
    setTopicFocus('')
    setShowCreate(true)
    loadFormOptions()
  }

  const handleGenerate = async () => {
    if (!selectedDocId) {
      Alert.alert('Missing Selection', 'Please select a document to generate materials from.')
      return
    }

    setGenerating(true)
    try {
      const result = await generateStudyMaterial(
        selectedDocId,
        materialType,
        questionCount,
        difficulty,
        topicFocus.trim() || undefined
      )
      setShowCreate(false)
      loadData()
      // Navigate straight to the generating screen
      router.push(`/(app)/study-material/${result._id || result.id}` as any)
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : 'Failed to generate study materials.'
      Alert.alert('Generation Failed', msg)
    } finally {
      setGenerating(false)
    }
  }

  const handleDelete = (id: string, title: string) => {
    Alert.alert(
      'Delete Study Material',
      `Are you sure you want to permanently delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteStudyMaterial(id)
              loadData()
            } catch (err: any) {
              Alert.alert('Delete Failed', err.message || 'Could not delete item.')
            }
          },
        },
      ]
    )
  }

  // Filtered documents list based on selected subject in form
  const filteredDocs = useMemo(() => {
    if (!selectedSubjectId) return docs
    return docs.filter((d) => d.subjectId === selectedSubjectId || (d.subject && (d.subject as any)._id === selectedSubjectId))
  }, [docs, selectedSubjectId])

  const selectedSubjectName = useMemo(() => {
    const found = subjects.find((s) => s.id === selectedSubjectId)
    return found ? found.name : 'Select a Subject...'
  }, [subjects, selectedSubjectId])

  const selectedDocTitle = useMemo(() => {
    const found = docs.find((d) => d.id === selectedDocId)
    return found ? found.title : 'Select a Document...'
  }, [docs, selectedDocId])

  const renderStatus = (status: string, errorMsg?: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <View style={styles.statusWrap}>
            <RotateCw size={10} color={C.muted} style={{ transform: [{ rotate: '45deg' }] }} />
            <Text style={[styles.statusText, { color: C.muted }]}>QUEUED</Text>
          </View>
        )
      case 'GENERATING':
        return (
          <View style={styles.statusWrap}>
            <ActivityIndicator size="small" color={C.primary} style={{ transform: [{ scale: 0.6 }] }} />
            <Text style={[styles.statusText, { color: C.primary }]}>CREATING...</Text>
          </View>
        )
      case 'FAILED':
        return (
          <View style={styles.statusWrap}>
            <Text style={[styles.statusText, { color: C.error }]} numberOfLines={1}>
              FAILED {errorMsg ? `(${errorMsg.slice(0, 15)})` : ''}
            </Text>
          </View>
        )
      default:
        return null
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.background }]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Pressable style={[styles.backBtn, { backgroundColor: C.card, borderColor: C.cardBorder }]} onPress={() => router.back()}>
              <ArrowLeft size={18} color={C.textSecondary} />
            </Pressable>
            <View>
              <Text style={[styles.title, { color: C.text }]}>Study Materials</Text>
              <Text style={[styles.subtitle, { color: C.muted }]}>
                {loading ? 'Loading...' : `${materials.length} study sets`}
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              onPress={openCreateModal}
              style={({ pressed }) => [
                styles.addBtn,
                { backgroundColor: C.primary },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Plus size={18} color="#fff" />
            </Pressable>
          </View>
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={C.primary} />
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); loadData() }}
                tintColor={C.primary}
              />
            }
          >
            {materials.length === 0 ? (
              <View style={styles.empty}>
                <Brain size={44} color={C.muted} />
                <Text style={[styles.emptyTitle, { color: C.text }]}>No study sets generated yet</Text>
                <Text style={[styles.emptyDesc, { color: C.muted }]}>
                  Flashcards and Multiple-Choice Quizzes help you recall concepts. Tap the "+" button above to create one!
                </Text>
              </View>
            ) : (
              materials.map((m) => {
                const color = m.type === 'FLASHCARD' ? C.primary : C.accent
                const isGenerating = m.status === 'PENDING' || m.status === 'GENERATING'
                return (
                  <Pressable
                    key={m._id || m.id}
                    disabled={isGenerating}
                    onPress={() => router.push(`/(app)/study-material/${m._id || m.id}` as any)}
                    style={({ pressed }) => [
                      styles.materialCard,
                      { backgroundColor: C.card, borderColor: C.cardBorder },
                      pressed && { opacity: 0.85 }
                    ]}
                  >
                    <View style={[styles.iconBadge, { backgroundColor: `${color}14` }]}>
                      {m.type === 'FLASHCARD' ? (
                        <BookOpen size={18} color={C.primary} />
                      ) : (
                        <Brain size={18} color={C.accent} />
                      )}
                    </View>
                    <View style={styles.info}>
                      <Text style={[styles.materialTitle, { color: C.text }]} numberOfLines={1}>
                        {m.title}
                      </Text>
                      <View style={styles.metaRow}>
                        <View style={[styles.typeBadge, { backgroundColor: `${color}14` }]}>
                          <Text style={[styles.typeText, { color }]}>{m.type}</Text>
                        </View>
                        <Text style={[styles.dateText, { color: C.muted }]}>
                          {new Date(m.createdAt).toLocaleDateString()}
                        </Text>
                        {renderStatus(m.status, m.error)}
                        {m.sourceStatus === 'DELETED' ? (
                          <View style={[styles.typeBadge, { backgroundColor: C.cardElevated }]}>
                            <Text style={[styles.typeText, { color: C.muted }]}>SOURCE DELETED</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.actions}>
                      <Pressable
                        style={[styles.actionBtn, { backgroundColor: C.cardElevated, borderColor: C.cardBorder }]}
                        onPress={() => handleDelete(m._id || m.id, m.title)}
                      >
                        <Trash2 size={13} color={C.error} />
                      </Pressable>
                      {!isGenerating && <ChevronRight size={16} color={C.muted} />}
                    </View>
                  </Pressable>
                )
              })
            )}
          </ScrollView>
        )}
      </View>

      {/* Generation Sheet Modal */}
      <Modal
        visible={showCreate}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreate(false)}
      >
        <Pressable style={styles.overlay} onPress={() => !generating && setShowCreate(false)}>
          <View
            style={[styles.sheet, { backgroundColor: C.card }]}
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: C.text }]}>Create Study Material</Text>
              <Pressable
                style={[styles.closeBtn, { backgroundColor: C.cardBorder }]}
                onPress={() => setShowCreate(false)}
                disabled={generating}
              >
                <X size={16} color={C.textSecondary} />
              </Pressable>
            </View>

            {loadingForm ? (
              <View style={{ height: 300, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color={C.primary} />
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36 }}>
                <View style={styles.form}>
                  {/* Select Subject */}
                  <View>
                    <Text style={[styles.label, { color: C.textSecondary }]}>Subject</Text>
                    <Pressable
                      style={[styles.pickerBtn, { backgroundColor: C.cardElevated, borderColor: C.cardBorder }]}
                      onPress={() => {
                        setShowSubjectPicker(!showSubjectPicker)
                        setShowDocPicker(false)
                      }}
                      disabled={generating}
                    >
                      <Text style={[styles.pickerText, { color: C.text }]} numberOfLines={1}>{selectedSubjectName}</Text>
                      <ChevronRight size={14} color={C.muted} style={{ transform: [{ rotate: showSubjectPicker ? '90deg' : '0deg' }] }} />
                    </Pressable>

                    {showSubjectPicker && (
                      <View style={[styles.pickerDropdown, { backgroundColor: C.cardElevated, borderColor: C.cardBorder }]}>
                        <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }}>
                          <Pressable
                            style={[styles.pickerItem, { borderBottomColor: C.cardBorder }]}
                            onPress={() => {
                              setSelectedSubjectId('')
                              setSelectedDocId('')
                              setShowSubjectPicker(false)
                            }}
                          >
                            <Text style={[styles.pickerItemText, { color: C.text }]}>All Subjects (No Filter)</Text>
                          </Pressable>
                          {subjects.map((sub) => (
                            <Pressable
                              key={sub.id || sub._id || sub.name}
                              style={[styles.pickerItem, { borderBottomColor: C.cardBorder }]}
                              onPress={() => {
                                setSelectedSubjectId(sub.id)
                                setSelectedDocId('')
                                setShowSubjectPicker(false)
                              }}
                            >
                              <Text style={[styles.pickerItemText, { color: C.text }]}>{sub.name}</Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  {/* Select Document */}
                  <View>
                    <Text style={[styles.label, { color: C.textSecondary }]}>Source Document</Text>
                    <Pressable
                      style={[styles.pickerBtn, { backgroundColor: C.cardElevated, borderColor: C.cardBorder }]}
                      onPress={() => {
                        setShowDocPicker(!showDocPicker)
                        setShowSubjectPicker(false)
                      }}
                      disabled={generating}
                    >
                      <Text style={[styles.pickerText, { color: C.text }]} numberOfLines={1}>{selectedDocTitle}</Text>
                      <ChevronRight size={14} color={C.muted} style={{ transform: [{ rotate: showDocPicker ? '90deg' : '0deg' }] }} />
                    </Pressable>

                    {showDocPicker && (
                      <View style={[styles.pickerDropdown, { backgroundColor: C.cardElevated, borderColor: C.cardBorder }]}>
                        <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }}>
                          {filteredDocs.length === 0 ? (
                            <View style={{ padding: Spacing.md, alignItems: 'center' }}>
                              <Text style={{ fontSize: FontSize.xs, color: C.muted }}>No documents found</Text>
                            </View>
                          ) : (
                            filteredDocs.map((doc) => (
                              <Pressable
                                key={doc.id}
                                style={[styles.pickerItem, { borderBottomColor: C.cardBorder }]}
                                onPress={() => {
                                  setSelectedDocId(doc.id)
                                  setShowDocPicker(false)
                                }}
                              >
                                <View style={{ flex: 1 }}>
                                  <Text style={[styles.pickerItemText, { color: C.text }]}>{doc.title}</Text>
                                  <Text style={{ fontSize: 10, color: C.muted, paddingTop: 2 }}>
                                    {doc.isShared ? `${doc.accessRole === 'EDITOR' ? 'Editor' : 'Viewer'} · Shared` : 'Owner'}
                                  </Text>
                                </View>
                              </Pressable>
                            ))
                          )}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  {/* Material Type */}
                  <View>
                    <Text style={[styles.label, { color: C.textSecondary }]}>Material Type</Text>
                    <View style={styles.segmentRow}>
                      {(['FLASHCARD', 'MCQ'] as MaterialType[]).map((type) => {
                        const active = materialType === type
                        const color = type === 'FLASHCARD' ? C.primary : C.accent
                        return (
                          <Pressable
                            key={type}
                            style={[
                              styles.segmentBtn,
                              {
                                backgroundColor: active ? `${color}14` : C.cardElevated,
                                borderColor: active ? color : C.cardBorder,
                              },
                            ]}
                            disabled={generating}
                            onPress={() => setMaterialType(type)}
                          >
                            {type === 'FLASHCARD' ? (
                              <BookOpen size={14} color={active ? color : C.muted} />
                            ) : (
                              <Brain size={14} color={active ? color : C.muted} />
                            )}
                            <Text
                              style={[
                                styles.segmentText,
                                { color: active ? color : C.textSecondary },
                              ]}
                            >
                              {type === 'FLASHCARD' ? 'Flashcards' : 'MCQ Quiz'}
                            </Text>
                          </Pressable>
                        )
                      })}
                    </View>
                  </View>

                  {/* Quantity Count */}
                  <View>
                    <Text style={[styles.label, { color: C.textSecondary }]}>Number of Items</Text>
                    <View style={styles.segmentRow}>
                      {[5, 10, 15, 20].map((count) => {
                        const active = questionCount === count
                        return (
                          <Pressable
                            key={count}
                            style={[
                              styles.segmentBtn,
                              {
                                backgroundColor: active ? C.primaryDim : C.cardElevated,
                                borderColor: active ? C.primary : C.cardBorder,
                              },
                            ]}
                            disabled={generating}
                            onPress={() => setQuestionCount(count)}
                          >
                            <Text
                              style={[
                                styles.segmentText,
                                { color: active ? C.primary : C.textSecondary },
                              ]}
                            >
                              {count}
                            </Text>
                          </Pressable>
                        )
                      })}
                    </View>
                  </View>

                  {/* Topic Focus */}
                  <View>
                    <Text style={[styles.label, { color: C.textSecondary }]}>Focus Topic (Optional)</Text>
                    <Input
                      placeholder="e.g. Chapter 3, Newton's Laws"
                      value={topicFocus}
                      onChangeText={setTopicFocus}
                      editable={!generating}
                    />
                  </View>

                  {/* Generate Button */}
                  <Pressable
                    disabled={generating}
                    onPress={handleGenerate}
                    style={({ pressed }) => [
                      styles.submitBtn,
                      { backgroundColor: C.primary },
                      (pressed || generating) && { opacity: 0.8 },
                    ]}
                  >
                    {generating ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <ActivityIndicator size="small" color="#fff" />
                        <Text style={styles.submitText}>Generating...</Text>
                      </View>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Sparkles size={16} color="#fff" />
                        <Text style={styles.submitText}>Create with AI</Text>
                      </View>
                    )}
                  </Pressable>
                </View>
              </ScrollView>
            )}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
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
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  title: { fontSize: FontSize.xl, fontWeight: '800', letterSpacing: 0 },
  subtitle: { fontSize: FontSize.xs, fontWeight: '500' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { gap: Spacing.md, paddingBottom: Spacing.xxl + 48 },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: Spacing.md,
  },
  emptyTitle: { fontSize: FontSize.md, fontWeight: '700' },
  emptyDesc: { fontSize: FontSize.sm, textAlign: 'center', paddingHorizontal: Spacing.xl, lineHeight: 20 },
  materialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 4 },
  materialTitle: { fontSize: FontSize.sm + 1, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  typeText: { fontSize: 10, fontWeight: '800' },
  dateText: { fontSize: FontSize.xs },
  statusWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusText: { fontSize: 10, fontWeight: '800' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    maxHeight: '90%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  sheetTitle: { fontSize: FontSize.lg, fontWeight: '800', flex: 1 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: { gap: Spacing.md },
  label: { fontSize: FontSize.xs, fontWeight: '800', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  pickerText: { fontSize: FontSize.sm },
  pickerDropdown: {
    borderWidth: 1,
    borderRadius: Radius.md,
    marginTop: 4,
    maxHeight: 160,
    overflow: 'hidden',
  },
  pickerItem: {
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  pickerItemText: { fontSize: FontSize.sm },
  segmentRow: { flexDirection: 'row', gap: Spacing.sm },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  segmentText: { fontSize: FontSize.sm, fontWeight: '600' },
  submitBtn: {
    marginTop: Spacing.lg,
    paddingVertical: 14,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: { fontSize: FontSize.sm + 1, fontWeight: '700' },
})
