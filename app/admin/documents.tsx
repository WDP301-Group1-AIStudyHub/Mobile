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
  ActivityIndicator,
  Linking
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  FileText,
  Search,
  X,
  Eye,
  ExternalLink
} from 'lucide-react-native'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import { FontSize, Spacing, Radius } from '../../constants/colors'
import { useColors } from '../../contexts/ThemeContext'
import { listAdminDocuments } from '../../services/adminApi'
import type { AdminDocument } from '../../types/admin'

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

export default function DocumentsPage() {
  const C = useColors()
  const [docs, setDocs] = useState<AdminDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')

  const [viewVisible, setViewVisible] = useState(false)
  const [viewDoc, setViewDoc] = useState<AdminDocument | null>(null)

  const loadDocs = useCallback(async () => {
    try {
      const data = await listAdminDocuments()
      setDocs(data)
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
        d.ownerName.toLowerCase().includes(q)
    )
  }, [docs, search])

  const openView = (d: AdminDocument) => {
    setViewDoc(d)
    setViewVisible(true)
  }

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1 },
    content: { padding: Spacing.lg, paddingBottom: Spacing.xxl + 40, gap: Spacing.md },
    pageTitle: { fontSize: FontSize.xxl, fontWeight: '700', color: C.text, letterSpacing: -0.5 },
    pageSubtitle: { fontSize: FontSize.sm, color: C.muted, lineHeight: 20 },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    docCard: {
      padding: Spacing.md,
      gap: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    docTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: Spacing.sm,
    },
    docTitle: {
      fontSize: FontSize.base,
      fontWeight: '700',
      color: C.text,
      flex: 1,
    },
    indexedBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: Radius.full,
    },
    indexedText: {
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    docMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 12,
    },
    docMetaText: {
      fontSize: FontSize.xs,
      color: C.textSecondary,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: C.cardElevated,
      borderWidth: 1,
      borderColor: C.cardBorder,
      paddingVertical: 10,
      borderRadius: Radius.md,
      marginTop: 4,
    },
    actionText: {
      fontSize: FontSize.sm,
      fontWeight: '600',
      color: C.text,
    },
    empty: {
      alignItems: 'center',
      paddingTop: Spacing.xxl,
      gap: Spacing.md,
    },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 20,
      backgroundColor: C.primaryDim,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyTitle: { fontSize: FontSize.md, fontWeight: '700', color: C.text },
    emptyDesc: { fontSize: FontSize.sm, color: C.muted, textAlign: 'center', maxWidth: 280, lineHeight: 20 },
    
    // View Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: C.overlay,
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: C.card,
      borderTopLeftRadius: Radius.xl,
      borderTopRightRadius: Radius.xl,
      padding: Spacing.lg,
      paddingBottom: Spacing.xxl,
      maxHeight: '90%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.lg,
    },
    modalTitle: { fontSize: FontSize.lg, fontWeight: '700', color: C.text },
    modalClose: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: C.cardElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: C.cardBorder,
    },
    detailLabel: { fontSize: FontSize.sm, color: C.muted, fontWeight: '600' },
    detailValue: { fontSize: FontSize.sm, color: C.text, fontWeight: '500', maxWidth: '65%', textAlign: 'right' },
  }), [C])

  const getIndexedColor = (status: string) => {
    if (status === 'indexed') return { bg: C.successDim, text: C.success }
    if (status === 'failed') return { bg: C.errorDim, text: C.error }
    return { bg: C.warningDim, text: C.warning }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              loadDocs()
            }}
            tintColor={C.primary}
          />
        }
      >
        <View style={{ gap: 4, marginBottom: Spacing.sm }}>
          <Text style={styles.pageTitle}>Document Corpus</Text>
          <Text style={styles.pageSubtitle}>
            Monitor and manage knowledge base documents.
          </Text>
        </View>

        <View style={styles.searchWrap}>
          <View style={{ flex: 1 }}>
            <Input
              placeholder="Search by title, owner, or file name..."
              value={search}
              onChangeText={setSearch}
              leftIcon={<Search size={18} color={C.muted} />}
            />
          </View>
        </View>

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <FileText size={36} color={C.muted} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>No documents found</Text>
            {search ? (
              <Text style={styles.emptyDesc}>Try a different search term.</Text>
            ) : (
              <Text style={styles.emptyDesc}>Documents uploaded by users will appear here.</Text>
            )}
          </View>
        ) : (
          filtered.map((d) => {
            const idxStyle = getIndexedColor(d.indexedStatus)
            return (
              <Card elevated key={d.id} style={styles.docCard}>
                <View style={styles.docTopRow}>
                  <Text style={styles.docTitle} numberOfLines={2}>{d.title}</Text>
                  <View style={[styles.indexedBadge, { backgroundColor: idxStyle.bg }]}>
                    <Text style={[styles.indexedText, { color: idxStyle.text }]}>{d.indexedStatus}</Text>
                  </View>
                </View>
                <View style={styles.docMetaRow}>
                  <Text style={styles.docMetaText}>{d.fileType} • {(d.fileSize / 1024 / 1024).toFixed(1)}MB</Text>
                  <Text style={styles.docMetaText}>{timeAgo(d.updatedAt)}</Text>
                  <Text style={styles.docMetaText}>{d.ownerName || 'Unknown owner'}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                  {!!d.fileUrl && (
                    <Pressable
                      style={({ pressed }) => [styles.actionBtn, { flex: 1 }, pressed && { opacity: 0.7 }]}
                      onPress={() => Linking.openURL(d.fileUrl)}
                    >
                      <ExternalLink size={16} color={C.textSecondary} />
                      <Text style={styles.actionText}>Open File</Text>
                    </Pressable>
                  )}
                  <Pressable
                    style={({ pressed }) => [styles.actionBtn, { flex: 1 }, pressed && { opacity: 0.7 }]}
                    onPress={() => openView(d)}
                  >
                    <Eye size={16} color={C.textSecondary} />
                    <Text style={styles.actionText}>View Details</Text>
                  </Pressable>
                </View>
              </Card>
            )
          })
        )}
      </ScrollView>

      {/* View Details Modal */}
      <Modal
        visible={viewVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setViewVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Document Metadata</Text>
              <Pressable
                style={styles.modalClose}
                onPress={() => setViewVisible(false)}
                hitSlop={8}
              >
                <X size={18} color={C.textSecondary} />
              </Pressable>
            </View>
            {viewDoc && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Title</Text>
                  <Text style={styles.detailValue}>{viewDoc.title}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>File Name</Text>
                  <Text style={styles.detailValue}>{viewDoc.fileName}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Owner</Text>
                  <Text style={styles.detailValue}>{viewDoc.ownerName}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Owner Email</Text>
                  <Text style={styles.detailValue}>{viewDoc.ownerEmail || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={styles.detailValue}>{viewDoc.status}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Visibility</Text>
                  <Text style={styles.detailValue}>{viewDoc.visibility}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Indexed Status</Text>
                  <Text style={styles.detailValue}>{viewDoc.indexedStatus}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Created At</Text>
                  <Text style={styles.detailValue}>{new Date(viewDoc.createdAt).toLocaleString()}</Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}
