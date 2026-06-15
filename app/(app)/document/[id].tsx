import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
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
} from 'lucide-react-native'
import Card from '../../../components/ui/Card'
import ThemeToggle from '../../../components/ui/ThemeToggle'
import { FontSize, Spacing, Radius } from '../../../constants/colors'
import { useColors } from '../../../contexts/ThemeContext'
import { getDocument } from '../../../services/documentApi'
import type { DocumentItem } from '../../../types/document'

function formatBytes(bytes: number): string {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`
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
  container: { padding: Spacing.lg, paddingBottom: Spacing.xl, gap: Spacing.md },
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
    letterSpacing: -0.5,
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
    borderRadius: 16,
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
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radius.lg,
  },
  actionBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#fff',
  },
  // Content viewer
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contentMeta: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  contentBox: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  contentText: {
    fontSize: FontSize.sm,
    lineHeight: 22,
    fontFamily: 'monospace',
  },
  contentEmpty: {
    fontSize: FontSize.sm,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
})

// ─── Content Viewer ────────────────────────────────────────────────────────────
function ContentViewer({ content }: { content: string | undefined }) {
  const C = useColors()
  const [expanded, setExpanded] = useState(false)

  if (!content) {
    return (
      <Text style={[styles.contentEmpty, { color: C.muted }]}>
        No extracted content available for this document.
      </Text>
    )
  }

  const PREVIEW = 1500
  const isLong = content.length > PREVIEW
  const display = expanded || !isLong ? content : content.slice(0, PREVIEW) + '...'

  return (
    <View>
      <View
        style={[
          styles.contentBox,
          { backgroundColor: C.cardElevated, borderWidth: 1, borderColor: C.cardBorder },
        ]}
      >
        <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
          <Text style={[styles.contentText, { color: C.text }]}>{display}</Text>
        </ScrollView>
      </View>
      {isLong && (
        <Pressable
          onPress={() => setExpanded(!expanded)}
          style={{ alignSelf: 'center', marginTop: Spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 4 }}
        >
          <Text style={[styles.contentMeta, { color: C.primary }]}>
            {expanded ? 'Show less' : `Show full content (${content.length.toLocaleString()} chars)`}
          </Text>
          {expanded ? (
            <ChevronDown size={14} color={C.primary} />
          ) : (
            <ChevronRight size={14} color={C.primary} />
          )}
        </Pressable>
      )}
    </View>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function DocumentDetailsPage() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const C = useColors()
  const [doc, setDoc] = useState<DocumentItem | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const loadDoc = async () => {
      try {
        const data = await getDocument(id)
        if (!cancelled) setDoc(data)
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

  // doc.subject can be: string, populated object {_id, name, ...}, or undefined
  const subjectName: string = (() => {
    const s = doc.subject as unknown
    if (!s) return 'Uncategorized'
    if (typeof s === 'string') return s
    if (typeof s === 'object' && s !== null) {
      const obj = s as Record<string, unknown>
      const n = obj.name
      if (typeof n === 'string' && n.length > 0) return n
    }
    return 'Uncategorized'
  })()

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
            <ThemeToggle size={38} />
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
                <User size={16} color={C.muted} />
                <Text style={[styles.metaLabel, { color: C.muted }]}>Author</Text>
                <Text style={[styles.metaValue, { color: C.text, textAlign: 'right' }]}>
                  {uploaderName}
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

          {/* Document Content (read-only, extracted text) */}
          {contentLength > 0 && (
            <Card elevated style={styles.card}>
              <View style={styles.sectionHeader}>
                <AlignLeft size={18} color={C.primary} />
                <Text style={[styles.sectionTitle, { color: C.text }]}>Document Content</Text>
                <View style={[styles.metaBadge, { backgroundColor: C.primaryDim, marginLeft: 'auto' }]}>
                  <Text style={[styles.contentMeta, { color: C.primary }]}>
                    {contentLength.toLocaleString()} chars
                  </Text>
                </View>
              </View>
              <ContentViewer content={doc.extractedText} />
            </Card>
          )}

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

          {/* Action Button */}
          <View style={styles.actionRow}>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: C.primary }]}
              onPress={() => router.push('/(app)/chat')}
            >
              <MessageCircle size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Chat with Document</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
  )
}
