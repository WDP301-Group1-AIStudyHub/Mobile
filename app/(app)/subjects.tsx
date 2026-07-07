import { useCallback, useEffect, useState } from 'react'
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
import { BookOpen, Edit2, Plus, Trash2, X, FolderOpen } from 'lucide-react-native'
import Card from '../../components/ui/Card'
import ThemeToggle from '../../components/ui/ThemeToggle'
import { FontSize, Spacing, Radius } from '../../constants/colors'
import { useColors } from '../../contexts/ThemeContext'
import {
  createSubject,
  deleteSubject,
  listSubjects,
  updateSubject,
} from '../../services/subjectApi'
import type { SubjectItem } from '../../types/subject'

type FormState = {
  name: string
  code: string
  description: string
  color: string
  semester: string
}

const COLOR_OPTIONS = [
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
  '#EF4444',
  '#F59E0B',
  '#10B981',
  '#06B6D4',
  '#3B82F6',
]

const EMPTY_FORM: FormState = {
  name: '',
  code: '',
  description: '',
  color: COLOR_OPTIONS[0],
  semester: '',
}

// Hàm helper giúp lấy ID an toàn, tương thích với cả Mongoose (_id) và các DB khác (id)
const getSafeId = (item: any): string => {
  if (item._id) return item._id.toString()
  if (item.id) return item.id.toString()
  return ''
}

export default function SubjectsPage() {
  const C = useColors()
  const [subjects, setSubjects] = useState<SubjectItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await listSubjects()
      setSubjects(Array.isArray(data) ? data : [])
    } catch {
      setSubjects([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const openEdit = (s: SubjectItem) => {
    setEditingId(getSafeId(s))
    setForm({
      name: s.name,
      code: s.code ?? '',
      description: s.description ?? '',
      color: s.color ?? COLOR_OPTIONS[0],
      semester: s.semester ?? '',
    })
    setShowModal(true)
  }

  const closeModal = () => {
    if (saving) return
    setShowModal(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  const handleSave = async () => {
    const name = form.name.trim()
    if (!name) {
      Alert.alert('Validation', 'Subject name is required.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name,
        code: form.code.trim() || undefined,
        description: form.description.trim() || undefined,
        color: form.color,
        semester: form.semester.trim() || undefined,
      }
      if (editingId) {
        const updated = await updateSubject(editingId, payload)
        setSubjects((prev) => prev.map((s) => (getSafeId(s) === editingId ? updated : s)))
      } else {
        const created = await createSubject(payload)
        setSubjects((prev) => [...prev, created])
      }
      setShowModal(false)
      setEditingId(null)
      setForm(EMPTY_FORM)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not save subject.'
      Alert.alert('Error', msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (s: SubjectItem) => {
    const sId = getSafeId(s)
    Alert.alert('Delete Subject', `Delete "${s.name}"? Documents inside will be uncategorized.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSubject(sId)
            setSubjects((prev) => prev.filter((x) => getSafeId(x) !== sId))
          } catch {
            Alert.alert('Error', 'Could not delete subject.')
          }
        },
      },
    ])
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
              <View>
                <Text style={[styles.title, { color: C.text }]}>Subjects</Text>
                <Text style={[styles.subtitle, { color: C.muted }]}>
                  {loading ? 'Loading...' : `${subjects.length} subjects`}
                </Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <ThemeToggle />
              <Pressable
                onPress={openCreate}
                style={({ pressed }) => [
                  styles.addBtn,
                  { backgroundColor: C.primary },
                  pressed && styles.pressed,
                ]}
              >
                <Plus size={16} color="#fff" />
                <Text style={styles.addBtnText}>New</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
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
            ) : subjects.length === 0 ? (
              <View style={styles.empty}>
                <View
                  style={[
                    styles.emptyIcon,
                    { backgroundColor: C.primaryDim, borderColor: C.cardBorder },
                  ]}
                >
                  <BookOpen size={36} color={C.muted} />
                </View>
                <Text style={[styles.emptyText, { color: C.textSecondary }]}>
                  No subjects yet
                </Text>
                <Text style={[styles.emptyDesc, { color: C.muted }]}>
                  Tap "New" to create your first subject.
                </Text>
              </View>
            ) : (
              subjects.map((item, index) => {
                // Truyền key an toàn, fallback về index nếu data thực sự bị lỗi mất ID
                const safeKey = getSafeId(item) || `fallback-key-${index}`;
                return (
                  <SubjectRow
                    key={safeKey}
                    item={item}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                  />
                )
              })
            )}
          </ScrollView>
        </View>
      </SafeAreaView>

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <Pressable style={styles.overlay} onPress={closeModal}>
          <Pressable
            style={[styles.sheet, { backgroundColor: C.card }]}
            onPress={() => {}}
          >
            <View style={[styles.sheetHandle, { backgroundColor: C.cardBorder }]} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: C.text }]}>
                {editingId ? 'Edit Subject' : 'New Subject'}
              </Text>
              <Pressable onPress={closeModal} hitSlop={8} disabled={saving}>
                <X size={20} color={C.muted} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={[styles.label, { color: C.textSecondary }]}>
                Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                placeholder="e.g. Calculus I"
                placeholderTextColor={C.muted}
                style={[
                  styles.input,
                  {
                    backgroundColor: C.cardElevated,
                    borderColor: C.cardBorder,
                    color: C.text,
                  },
                ]}
              />

              <Text style={[styles.label, { color: C.textSecondary }]}>Code</Text>
              <TextInput
                value={form.code}
                onChangeText={(v) => setForm((f) => ({ ...f, code: v }))}
                placeholder="e.g. MATH101"
                placeholderTextColor={C.muted}
                autoCapitalize="characters"
                style={[
                  styles.input,
                  {
                    backgroundColor: C.cardElevated,
                    borderColor: C.cardBorder,
                    color: C.text,
                  },
                ]}
              />

              <Text style={[styles.label, { color: C.textSecondary }]}>Semester</Text>
              <TextInput
                value={form.semester}
                onChangeText={(v) => setForm((f) => ({ ...f, semester: v }))}
                placeholder="e.g. Fall 2026"
                placeholderTextColor={C.muted}
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
                Description
              </Text>
              <TextInput
                value={form.description}
                onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
                placeholder="Optional description"
                placeholderTextColor={C.muted}
                multiline
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

              <Text style={[styles.label, { color: C.textSecondary }]}>Color</Text>
              <View style={styles.colorRow}>
                {COLOR_OPTIONS.map((c) => {
                  const active = form.color === c
                  return (
                    <Pressable
                      key={c}
                      onPress={() => setForm((f) => ({ ...f, color: c }))}
                      style={[
                        styles.colorDot,
                        { backgroundColor: c },
                        active && { borderColor: C.text, borderWidth: 3 },
                      ]}
                    />
                  )
                })}
              </View>

              <Pressable
                onPress={handleSave}
                disabled={saving}
                style={({ pressed }) => [
                  styles.submitBtn,
                  { backgroundColor: C.primary },
                  (pressed || saving) && styles.pressed,
                ]}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>
                    {editingId ? 'Save Changes' : 'Create Subject'}
                  </Text>
                )}
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

function SubjectRow({
  item,
  onEdit,
  onDelete,
}: {
  item: SubjectItem
  onEdit: (s: SubjectItem) => void
  onDelete: (s: SubjectItem) => void
}) {
  const C = useColors()
  return (
    <Card>
      <View style={styles.row}>
        <View
          style={[styles.colorChip, { backgroundColor: item.color ?? C.primary }]}
        />
        <View style={styles.rowInfo}>
          <Text style={[styles.rowName, { color: C.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          {item.code ? (
            <Text style={[styles.rowCode, { color: C.primary }]}>Code: {item.code}</Text>
          ) : null}
          {item.semester ? (
            <Text style={[styles.rowSemester, { color: C.primary }]}>Semester: {item.semester}</Text>
          ) : null}
          {item.description ? (
            <Text
              style={[styles.rowDesc, { color: C.muted }]}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          ) : null}
        </View>
        <View style={styles.rowActions}>
          <Pressable
            onPress={() => onEdit(item)}
            hitSlop={8}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          >
            <Edit2 size={16} color={C.primary} />
          </Pressable>
          <Pressable
            onPress={() => onDelete(item)}
            hitSlop={8}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          >
            <Trash2 size={16} color={C.error} />
          </Pressable>
        </View>
      </View>
    </Card>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.lg,
  },
  addBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#fff',
  },
  listContent: { gap: Spacing.md, paddingBottom: Spacing.xxl + 96 },
  loadingWrap: { paddingTop: 60, alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.sm },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  emptyText: { fontSize: FontSize.md, fontWeight: '700' },
  emptyDesc: { fontSize: FontSize.sm, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  colorChip: { width: 6, height: 44, borderRadius: 3 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: FontSize.base, fontWeight: '700' },
  rowCode: { fontSize: FontSize.xs, fontWeight: '600', marginTop: 2 },
  rowSemester: { fontSize: FontSize.xs, fontWeight: '500', marginTop: 2 },
  rowDesc: { fontSize: FontSize.xs, marginTop: 4 },
  rowActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 8, borderRadius: Radius.sm },
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
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: Spacing.md,
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
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  submitBtn: {
    marginTop: Spacing.lg,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: '#fff',
    fontSize: FontSize.base,
    fontWeight: '700',
  },
})
