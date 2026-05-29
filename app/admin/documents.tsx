import { useState, useMemo } from 'react'
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  FileCog,
  Search,
  X,
} from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import VideoBg from '../../components/ui/VideoBg'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import { FontSize, Spacing, Radius } from '../../constants/colors'
import { useColors } from '../../contexts/ThemeContext'

type IndexedStatus = 'indexed' | 'pending' | 'failed'
type MockDoc = {
  id: string
  title: string
  fileName: string
  owner: string
  ownerEmail: string
  indexed: IndexedStatus
  subject: string
  description: string
  updated: string
}

const INITIAL_DOCS: MockDoc[] = [
  { id: 'd1', title: 'Quantum Entanglement Patterns', fileName: 'Quantum Entanglement Patterns.pdf', owner: 'Sarah Chen', ownerEmail: 'sarah.chen@edu.vn', indexed: 'indexed', subject: 'Physics', description: 'Review sample document', updated: '2 days ago' },
  { id: 'd2', title: 'Neural Network Topologies', fileName: 'Neural Network Topologies.epub', owner: 'Priya Patel', ownerEmail: 'priya.p@edu.vn', indexed: 'indexed', subject: 'AI Research', description: 'Review sample document', updated: '4 days ago' },
  { id: 'd3', title: 'Global Economic Shifts 2025', fileName: 'Global Economic Shifts 2025.docx', owner: 'Marcus Williams', ownerEmail: 'marcus.w@edu.vn', indexed: 'pending', subject: 'Economics', description: 'Review sample document', updated: '2 days ago' },
  { id: 'd4', title: 'Calculus III — Multivariable Methods', fileName: 'Calculus III.pdf', owner: 'Emma Thompson', ownerEmail: 'emma.t@edu.vn', indexed: 'indexed', subject: 'Mathematics', description: 'Lecture notes HK1', updated: '7 months ago' },
  { id: 'd5', title: 'Data Structures & Algorithms', fileName: 'DSA.pdf', owner: 'Lin Zhao', ownerEmail: 'lin.zhao@edu.vn', indexed: 'failed', subject: 'AI Research', description: 'HK1 notes', updated: '6 months ago' },
  { id: 'd6', title: 'Philosophy of Digital Reality', fileName: 'Philosophy Digital Reality.pdf', owner: 'David Kim', ownerEmail: 'david.kim@edu.vn', indexed: 'pending', subject: 'Philosophy', description: '', updated: '1 month ago' },
  { id: 'd7', title: 'Modern Chemistry Fundamentals', fileName: 'Chemistry Fundamentals.pdf', owner: 'James Rodriguez', ownerEmail: 'james.r@edu.vn', indexed: 'indexed', subject: 'Chemistry', description: 'Core chemistry textbook', updated: '3 months ago' },
]

const INDEXED_LABEL: Record<IndexedStatus, string> = {
  indexed: 'Indexed',
  pending: 'Pending',
  failed: 'Failed',
}

export default function DocumentsPage() {
  const C = useColors()

  const INDEXED_COLOR: Record<IndexedStatus, string> = {
    indexed: C.success,
    pending: C.warning,
    failed: C.error,
  }
  const INDEXED_BG: Record<IndexedStatus, string> = {
    indexed: C.successDim,
    pending: C.warningDim,
    failed: C.errorDim,
  }
  const [docs, setDocs] = useState<MockDoc[]>(INITIAL_DOCS)
  const [search, setSearch] = useState('')

  const [editVisible, setEditVisible] = useState(false)
  const [editDoc, setEditDoc] = useState<MockDoc | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editSubject, setEditSubject] = useState('')
  const [editDesc, setEditDesc] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return docs
    return docs.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.owner.toLowerCase().includes(q) ||
        d.ownerEmail.toLowerCase().includes(q) ||
        d.subject.toLowerCase().includes(q) ||
        d.fileName.toLowerCase().includes(q),
    )
  }, [docs, search])

  const openEdit = (d: MockDoc) => {
    setEditDoc(d)
    setEditTitle(d.title)
    setEditSubject(d.subject)
    setEditDesc(d.description)
    setEditVisible(true)
  }

  const saveEdit = () => {
    if (!editDoc) return
    if (!editTitle.trim()) { Alert.alert('Validation', 'Title is required.'); return }
    setDocs((prev) =>
      prev.map((d) =>
        d.id === editDoc.id
          ? { ...d, title: editTitle.trim(), subject: editSubject.trim(), description: editDesc.trim() }
          : d,
      ),
    )
    setEditVisible(false)
  }

  const renderDoc = ({ item }: { item: MockDoc }) => (
    <Card elevated style={styles.docCard} padding="md">
      <View style={styles.docTop}>
        <View style={styles.docIconWrap}>
          <FileCog size={20} color={C.accentGold} />
        </View>
        <View style={styles.docInfo}>
          <Text style={styles.docTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.docFileName} numberOfLines={1}>{item.fileName}</Text>
        </View>
        <View style={[styles.indexedBadge, { backgroundColor: INDEXED_BG[item.indexed] }]}>
          <Text style={[styles.indexedText, { color: INDEXED_COLOR[item.indexed] }]}>
            {INDEXED_LABEL[item.indexed]}
          </Text>
        </View>
      </View>

      <View style={styles.ownerRow}>
        <View style={styles.ownerAvatar}>
          <Text style={styles.ownerAvatarText}>{item.owner.split(' ').map((n) => n[0]).join('')}</Text>
        </View>
        <View style={styles.ownerInfo}>
          <Text style={styles.ownerName}>{item.owner}</Text>
          <Text style={styles.ownerEmail} numberOfLines={1}>{item.ownerEmail}</Text>
        </View>
      </View>

      <View style={styles.docMeta}>
        <View style={styles.subjectPill}>
          <Text style={styles.subjectPillText}>{item.subject}</Text>
        </View>
        <Text style={styles.updatedText}>Updated {item.updated}</Text>
      </View>

      <View style={styles.docActions}>
        <Pressable
          onPress={() => Alert.alert('Open Document', `"${item.title}" — file viewer not available in mock mode.`)}
          style={({ pressed }) => [styles.openBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.openBtnText}>Open</Text>
        </Pressable>
        <Pressable
          onPress={() => openEdit(item)}
          style={({ pressed }) => [styles.editMetaBtn, pressed && { opacity: 0.75 }]}
        >
          <LinearGradient
            colors={C.gradientGold}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.editMetaBtnGrad}
          >
            <Text style={styles.editMetaBtnText}>Edit metadata</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </Card>
  )


  const styles = useMemo(() => StyleSheet.create({
  safe: { flex: 1 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  searchFlex: { flex: 1 },
  countBadge: {
    backgroundColor: C.primaryDim,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: `${C.primary}30`,
  },
  countText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: C.primary,
  },
  list: {
    padding: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: Spacing.xxl + 16,
  },
  docCard: { gap: Spacing.sm },
  docTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  docIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(201,134,14,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  docInfo: { flex: 1, gap: 3 },
  docTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: C.text,
  },
  docFileName: {
    fontSize: FontSize.xs,
    color: C.muted,
  },
  indexedBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  indexedText: {
    fontSize: 10,
    fontWeight: '700',
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: C.cardBorder,
  },
  ownerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  ownerAvatarText: {
    fontSize: 10,
    fontWeight: '800',
    color: C.primary,
  },
  ownerInfo: { flex: 1, gap: 1 },
  ownerName: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: C.textSecondary,
  },
  ownerEmail: {
    fontSize: FontSize.xs,
    color: C.muted,
  },
  docMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  subjectPill: {
    backgroundColor: C.primaryDim,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  subjectPillText: {
    fontSize: FontSize.xs,
    color: C.primary,
    fontWeight: '600',
  },
  updatedText: {
    fontSize: FontSize.xs,
    color: C.muted,
  },
  docActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  openBtn: {
    height: 36,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: C.primary,
  },
  editMetaBtn: {
    flex: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
    height: 36,
  },
  editMetaBtnGrad: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editMetaBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: '#fff',
  },
  empty: {
    alignItems: 'center',
    paddingTop: Spacing.xxl + 16,
    gap: Spacing.md,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: 'rgba(201,134,14,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: FontSize.sm,
    color: C.muted,
    textAlign: 'center',
  },
  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10,14,26,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    maxHeight: '80%',
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
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sheetTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: C.text,
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
  req: { color: C.error },
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
  sheetActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  sheetBtn: {
    flex: 1,
    height: 50,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  cancelBtn: {
    borderWidth: 1.5,
    borderColor: C.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.cardElevated,
  },
  cancelBtnText: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: C.muted,
  },
  saveBtnGrad: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: '#fff',
  },
}), [C])

  return (
    <VideoBg>
      <SafeAreaView style={styles.safe}>
        {/* Search + Count */}
        <View style={styles.searchRow}>
          <View style={styles.searchFlex}>
            <Input
              placeholder="Search title, owner, subject, file"
              value={search}
              onChangeText={setSearch}
              leftIcon={<Search size={16} color={C.muted} />}
            />
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{filtered.length} visible</Text>
          </View>
        </View>

        {/* List */}
        <FlatList
          data={filtered}
          keyExtractor={(d) => d.id}
          renderItem={renderDoc}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <FileCog size={32} color={C.muted} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>No documents match the current search.</Text>
            </View>
          }
        />
      </SafeAreaView>

      {/* Edit Metadata Bottom Sheet */}
      <Modal
        visible={editVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setEditVisible(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Edit Metadata</Text>
              <Pressable onPress={() => setEditVisible(false)} hitSlop={8}>
                <X size={20} color={C.muted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Title <Text style={styles.req}>*</Text></Text>
                <TextInput
                  style={styles.textField}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Document title"
                  placeholderTextColor={C.muted}
                  returnKeyType="next"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Subject</Text>
                <TextInput
                  style={styles.textField}
                  value={editSubject}
                  onChangeText={setEditSubject}
                  placeholder="e.g. Physics, Mathematics…"
                  placeholderTextColor={C.muted}
                  returnKeyType="next"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Description</Text>
                <TextInput
                  style={[styles.textField, styles.textArea]}
                  value={editDesc}
                  onChangeText={setEditDesc}
                  placeholder="Brief description…"
                  placeholderTextColor={C.muted}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            <View style={styles.sheetActions}>
              <Pressable
                onPress={() => setEditVisible(false)}
                style={[styles.sheetBtn, styles.cancelBtn]}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={saveEdit} style={styles.sheetBtn}>
                <LinearGradient
                  colors={C.gradientPrimary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.saveBtnGrad}
                >
                  <Text style={styles.saveBtnText}>Save</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </VideoBg>
  )
}