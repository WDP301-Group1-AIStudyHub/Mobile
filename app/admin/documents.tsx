import { useEffect, useState, useMemo, useCallback } from 'react'
import {
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
  FileCog,
  Search,
  X,
} from 'lucide-react-native'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import { FontSize, Spacing, Radius } from '../../constants/colors'
import { useColors } from '../../contexts/ThemeContext'
import { listDocuments, updateDocument } from '../../services/documentApi'
import type { DocumentItem } from '../../types/document'

type IndexedStatus = 'indexed' | 'pending' | 'failed'
type AdminDoc = DocumentItem & {
  ownerName: string
  ownerEmail: string
  updated: string
  indexed: IndexedStatus
}

const INDEXED_LABEL: Record<IndexedStatus, string> = {
  indexed: 'Indexed',
  pending: 'Pending',
  failed: 'Failed',
}

function timeAgo(isoDate: string | undefined): string {
  if (!isoDate) return 'recently'
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

function deriveIndexed(doc: DocumentItem): IndexedStatus {
  if (doc.extractionStatus === 'FAILED') return 'failed'
  if (doc.extractionStatus === 'COMPLETED' || (doc.totalChunks && doc.totalChunks > 0)) return 'indexed'
  return 'pending'
}

function ownerName(doc: DocumentItem): string {
  // The backend returns `uploadedBy` as an owner id (ObjectId string)
  // or as a populated user object — handle both.
  const u = doc.uploadedBy as unknown
  if (!u) return doc.metadata?.author?.trim() || 'Unknown owner'
  if (typeof u === 'string') return u
  if (typeof u === 'object' && u !== null) {
    const obj = u as Record<string, unknown>
    const n = obj.name ?? obj.fullName ?? obj.email
    if (typeof n === 'string' && n.length > 0) return n
  }
  return doc.metadata?.author?.trim() || 'Unknown owner'
}

// Backend may populate `subject` as an object. Defensive helper.
function subjectLabel(subject: unknown): string {
  if (subject == null) return ''
  if (typeof subject === 'string') return subject
  if (typeof subject === 'object') {
    const n = (subject as Record<string, unknown>).name
    if (typeof n === 'string') return n
  }
  return ''
}

export default function DocumentsPage() {
  const C = useColors()
  const [docs, setDocs] = useState<AdminDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const [editVisible, setEditVisible] = useState(false)
  const [editDoc, setEditDoc] = useState<AdminDoc | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editSubject, setEditSubject] = useState('')
  const [editDesc, setEditDesc] = useState('')

  const loadDocs = useCallback(async () => {
    try {
      const data = await listDocuments()
      const list = Array.isArray(data) ? data : []
      const mapped: AdminDoc[] = list.map((d) => ({
        ...d,
        ownerName: ownerName(d),
        ownerEmail: '',
        updated: timeAgo(d.updatedAt),
        indexed: deriveIndexed(d),
      }))
      setDocs(mapped)
    } catch (e) {
      console.error('[admin/documents] load error', e)
      Alert.alert('Error', 'Could not load documents from the server.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadDocs()
  }, [loadDocs])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return docs
    return docs.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.fileName.toLowerCase().includes(q) ||
        subjectLabel(d.subject).toLowerCase().includes(q) ||
        ownerName(d).toLowerCase().includes(q)
    )
  }, [docs, search])

  const openEdit = (d: AdminDoc) => {
    setEditDoc(d)
    setEditTitle(d.title)
    setEditSubject(subjectLabel(d.subject))
    setEditDesc(d.description || '')
    setEditVisible(true)
  }

  const saveEdit = async () => {
    if (!editDoc) return
    if (!editTitle.trim()) {
      Alert.alert('Validation', 'Title is required.')
      return
    }
    setSaving(true)
    try {
      const updated = await updateDocument(editDoc.id, {
        title: editTitle.trim(),
        subject: editSubject.trim() || undefined,
        description: editDesc.trim() || undefined,
      })
      setDocs((prev) =>
        prev.map((d) =>
          d.id === editDoc.id
            ? {
                ...d,
                ...updated,
                ownerName: ownerName(updated),
                updated: timeAgo(updated.updatedAt),
                indexed: deriveIndexed(updated),
              }
            : d
        )
      )
      setEditVisible(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Save failed'
      Alert.alert('Error', msg)
    } finally {
      setSaving(false)
    }
  }

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

  const renderDoc = ({ item }: { item: AdminDoc }) => {
    const owner = ownerName(item)
    const initials = owner
      .split(' ')
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'

    return (
      <Card elevated style={styles.docCard} padding="md">
        <View style={styles.docCardInner}>
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
              <Text style={styles.ownerAvatarText}>{initials}</Text>
            </View>
            <View style={styles.ownerInfo}>
              <Text style={styles.ownerName} numberOfLines={1}>{owner}</Text>
              {item.ownerEmail ? (
                <Text style={styles.ownerEmail} numberOfLines={1}>{item.ownerEmail}</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.docMeta}>
            {subjectLabel(item.subject) ? (
              <View style={styles.subjectPill}>
                <Text style={styles.subjectPillText}>{subjectLabel(item.subject)}</Text>
              </View>
            ) : null}
            <Text style={styles.updatedText}>Updated {item.updated}</Text>
          </View>

          <View style={styles.docActions}>
            <Pressable
              onPress={() => Alert.alert('Open Document', `"${item.title}" — file viewer not available yet.`)}
              style={({ pressed }) => [styles.openBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.openBtnText}>Open</Text>
            </Pressable>
            <Pressable
              onPress={() => openEdit(item)}
              style={({ pressed }) => [styles.editMetaBtn, pressed && { opacity: 0.75 }]}
            >
              <View style={[styles.editMetaBtnGrad, { backgroundColor: C.primary }]}>
                <Text style={styles.editMetaBtnText}>Edit metadata</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </Card>
    )
  }

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
    docCard: { padding: 0 },
    docCardInner: { gap: Spacing.sm },
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
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(10,14,26,0.55)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: C.card,
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
    <View style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe}>
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

        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadDocs() }}
              tintColor={C.primary}
            />
          }
        >
          {filtered.map((item) => renderDoc({ item }))}
          {!loading && filtered.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <FileCog size={32} color={C.muted} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>
                No documents match the current search.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={editVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setEditVisible(false)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
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
              <Pressable
                onPress={saveEdit}
                disabled={saving}
                style={styles.sheetBtn}
              >
                <View
                  style={[
                    styles.saveBtnGrad,
                    { backgroundColor: saving ? C.muted : C.primary },
                  ]}
                >
                  <Text style={styles.saveBtnText}>
                    {saving ? 'Saving...' : 'Save'}
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  )
}
