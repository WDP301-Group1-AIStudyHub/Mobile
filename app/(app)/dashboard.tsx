import { useCallback, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View, Pressable, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useFocusEffect } from 'expo-router'
import {
  Archive,
  Bell,
  BookOpen,
  Brain,
  ChevronRight,
  Database,
  FileText,
  MessageCircle,
  Sparkles,
  UploadCloud,
} from 'lucide-react-native'
import Card from '../../components/ui/Card'
import BrandLogo from '../../components/ui/BrandLogo'
import { FontSize, Spacing, Radius } from '../../constants/colors'
import { useColors } from '../../contexts/ThemeContext'
import { listDocuments } from '../../services/documentApi'
import { listSubjects } from '../../services/subjectApi'
import type { DocumentItem } from '../../types/document'
import type { SubjectItem } from '../../types/subject'
import { getAccessibleSubject, normalizeAccessibleDocuments } from '../../utils/accessibleDocuments'
import { formatBytes } from '../../utils/formatBytes'
import StorageUsageBar from '../../components/storage/StorageUsageBar'
import { useStorage } from '../../hooks/useStorage'

function timeAgo(isoDate: string | undefined): string {
  if (!isoDate) return 'recently'
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fileTypeColor(type: string | undefined, C: ReturnType<typeof useColors>): string {
  if (!type) return C.muted
  if (type.includes('pdf')) return C.error
  if (type.includes('epub')) return C.secondary
  if (type.includes('word') || type.includes('docx')) return C.info
  return C.muted
}

function fileTypeKey(type: string | undefined): string {
  if (!type) return 'file'
  if (type.includes('pdf')) return 'pdf'
  if (type.includes('epub')) return 'epub'
  if (type.includes('word') || type.includes('docx')) return 'docx'
  return 'file'
}

// Backend may return `subject` as either a string, a populated object
// ({_id, name, description, color, code}), or null/undefined.
// RN throws "Objects are not valid as a React child" if we render the object.
function getSubjectName(subject: unknown, fallback = 'Uncategorized'): string {
  if (subject == null) return fallback
  if (typeof subject === 'string') return subject.length > 0 ? subject : fallback
  if (typeof subject === 'object') {
    const n = (subject as Record<string, unknown>).name
    if (typeof n === 'string' && n.length > 0) return n
  }
  return fallback
}

export default function DashboardPage() {
  const C = useColors()
  const [docs, setDocs] = useState<DocumentItem[]>([])
  const [subjects, setSubjects] = useState<SubjectItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const [docsRes, subsRes] = await Promise.all([
        listDocuments(),
        listSubjects().catch(() => [] as SubjectItem[]),
      ])
      setDocs(normalizeAccessibleDocuments(docsRes))
      setSubjects(Array.isArray(subsRes) ? subsRes : [])
    } catch (err: any) {
      // 401 means the auth token is missing or invalid — auth guard will redirect.
      // Don't spam logs in that case; only log real network/parsing errors.
      const is401 = err?.response?.status === 401
      if (!is401) {
        console.error('[dashboard] load error', err)
      }
      setDocs([])
      setSubjects([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const { storage, refresh: refreshStorageUsage } = useStorage()

  // Refreshing on focus rather than on mount means returning from the storage
  // screen after a purchase shows the new quota straight away.
  useFocusEffect(
    useCallback(() => {
      load()
      refreshStorageUsage()
    }, [load, refreshStorageUsage]),
  )

  const recentDocs = useMemo(
    () => [...docs].sort((a, b) => +new Date(b.updatedAt || 0) - +new Date(a.updatedAt || 0)).slice(0, 4),
    [docs]
  )

  const subjectsWithCount = useMemo(() => {
    const counts = new Map<string, number>()
    for (const d of docs) {
      const key = d.personalSubjectId || d.subjectId || getSubjectName(getAccessibleSubject(d), '') || 'Uncategorized'
      counts.set(key, (counts.get(key) || 0) + 1)
    }
    return subjects
      .map((s) => ({ ...s, count: counts.get(s.id) || counts.get(s.name) || 0 }))
      .filter((s) => s.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
  }, [subjects, docs])

  const stats = useMemo(
    () => [
      { label: 'Documents', value: String(docs.length), icon: Database, color: C.primary, bg: C.primaryDim },
      { label: 'Subjects', value: String(subjects.length), icon: Archive, color: C.accent, bg: C.accentDim },
    ],
    [docs.length, subjects.length, C]
  )

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1 },
    scroll: { flex: 1 },
    content: { padding: Spacing.lg, paddingBottom: Spacing.xxl + 16, gap: Spacing.lg },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    topBarRight: { flexDirection: 'row', gap: Spacing.sm },
    iconBtn: {
      width: 38, height: 38, borderRadius: 12,
      backgroundColor: C.cardElevated, borderWidth: 1, borderColor: C.cardBorder,
      alignItems: 'center', justifyContent: 'center',
    },
    pageHeader: { gap: 4 },
    pageTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: C.text, letterSpacing: 0 },
    pageSubtitle: { fontSize: FontSize.sm, color: C.muted, lineHeight: 20 },
    storageCard: {
      backgroundColor: C.card, borderRadius: Radius.lg, borderWidth: 1,
      borderColor: C.cardBorder, padding: Spacing.lg, gap: Spacing.sm,
      borderLeftWidth: 3, borderLeftColor: C.accentTeal,
    },
    storageTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    storageIconBadge: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: C.accentTealDim,
      alignItems: 'center', justifyContent: 'center',
    },
    storageLabel: { fontSize: FontSize.xs, fontWeight: '700', color: C.muted, letterSpacing: 1.5 },
    storagePlanRow: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      marginTop: Spacing.md, flexWrap: 'wrap',
    },
    storagePlanName: { fontSize: FontSize.lg, fontWeight: '800', color: C.text },
    storageBadge: {
      fontSize: FontSize.xs, fontWeight: '700', overflow: 'hidden',
      paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.full,
    },
    storageValue: { fontSize: FontSize.xxl, fontWeight: '800', color: C.text, letterSpacing: 0, marginTop: Spacing.sm },
    storageValueTotal: { fontSize: FontSize.md, fontWeight: '600', color: C.muted },
    storageCaption: { fontSize: FontSize.xs, color: C.muted, marginTop: 2 },
    storageBarWrap: { marginTop: Spacing.md },
    storageCta: {
      flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.md,
    },
    storageCtaText: { fontSize: FontSize.xs, fontWeight: '700', color: C.primary },
    aiCard: {
      backgroundColor: C.primary, borderRadius: Radius.lg,
      padding: Spacing.lg, gap: Spacing.md,
    },
    aiBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start',
      paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full,
    },
    aiBadgeText: { fontSize: FontSize.xs, fontWeight: '700', color: '#fff', letterSpacing: 1.2 },
    aiTitle: { fontSize: FontSize.md, fontWeight: '700', color: '#fff', lineHeight: 23, letterSpacing: 0, flex: 1 },
    aiActions: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', alignItems: 'center' },
    aiBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: '#ffffff', paddingHorizontal: Spacing.md,
      paddingVertical: 10, borderRadius: Radius.full,
    },
    aiBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: C.primary },
    aiCaption: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' },
    studyCard: {
      backgroundColor: C.card,
      borderColor: C.cardBorder,
      borderWidth: 1,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      gap: Spacing.md,
      marginTop: Spacing.xs,
    },
    studyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    studyIconWrap: {
      width: 40,
      height: 40,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    studyTitleWrap: {
      flex: 1,
      gap: 2,
    },
    studyTitle: {
      fontSize: FontSize.md,
      fontWeight: '700',
      color: C.text,
    },
    studySubtitle: {
      fontSize: FontSize.xs,
      color: C.muted,
    },
    studyDesc: {
      fontSize: FontSize.sm,
      color: C.textSecondary,
      lineHeight: 20,
    },
    statsRow: { flexDirection: 'row', gap: Spacing.sm },
    statCard: { flex: 1, alignItems: 'center', gap: 5, backgroundColor: C.card, borderRadius: Radius.lg, padding: Spacing.md },
    statIconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
    statValue: { fontSize: FontSize.xl, fontWeight: '800', color: C.text, letterSpacing: 0 },
    statLabel: { fontSize: FontSize.xs, color: C.muted, fontWeight: '500' },
    recentCard: {
      backgroundColor: C.card, borderRadius: Radius.lg, borderWidth: 1,
      borderColor: C.cardBorder, overflow: 'hidden',
    },
    recentHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
      borderBottomWidth: 1, borderBottomColor: C.cardBorder,
    },
    recentHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    recentHeaderIcon: {
      width: 28, height: 28, borderRadius: 8,
      backgroundColor: C.secondaryDim, alignItems: 'center', justifyContent: 'center',
    },
    recentTitle: { fontSize: FontSize.base, fontWeight: '600', color: C.text },
    viewAllBtn: {
      paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.md,
      borderWidth: 1, borderColor: C.cardBorder, backgroundColor: C.cardElevated,
    },
    viewAllText: { fontSize: FontSize.xs, color: C.textSecondary, fontWeight: '600' },
    fileRow: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
      borderBottomWidth: 1, borderBottomColor: C.cardBorder,
    },
    fileRowLast: { borderBottomWidth: 0 },
    fileIcon: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    fileInfo: { flex: 1, gap: 4 },
    fileName: { fontSize: FontSize.sm, color: C.text, fontWeight: '600' },
    fileMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    fileSubjectPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.full, backgroundColor: C.primaryDim },
    fileSubjectText: { fontSize: FontSize.xs, fontWeight: '600', color: C.primary },
    fileTime: { fontSize: FontSize.xs, color: C.muted },
    fileEmpty: { padding: Spacing.lg, alignItems: 'center', gap: 4 },
    fileEmptyText: { fontSize: FontSize.sm, color: C.muted, fontWeight: '500' },
    fileEmptyHint: { fontSize: FontSize.xs, color: C.muted },
    subjectCard: {
      backgroundColor: C.card, borderRadius: Radius.lg, borderWidth: 1,
      borderColor: C.cardBorder, padding: Spacing.md, gap: Spacing.sm,
      borderLeftWidth: 3, borderLeftColor: C.accent,
    },
    subjectHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    subjectHeaderIcon: {
      width: 28, height: 28, borderRadius: 8,
      backgroundColor: C.accentDim, alignItems: 'center', justifyContent: 'center',
    },
    subjectTitle: { fontSize: FontSize.base, fontWeight: '600', color: C.text },
    subjectList: { gap: Spacing.sm, marginTop: 4 },
    subjectRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 6, paddingHorizontal: 8,
      borderRadius: Radius.md, backgroundColor: C.cardElevated,
    },
    subjectLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    subjectDot: { width: 8, height: 8, borderRadius: 4 },
    subjectName: { fontSize: FontSize.sm, fontWeight: '600', color: C.text },
    subjectCountRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    subjectCount: { fontSize: FontSize.xs, fontWeight: '600' },
    subjectEmpty: { padding: Spacing.md, alignItems: 'center' },
    subjectEmptyText: { fontSize: FontSize.sm, color: C.muted },
    shortcutCard: {
      backgroundColor: C.card, borderRadius: Radius.lg, borderWidth: 1,
      borderColor: C.cardBorder, padding: Spacing.md,
      borderLeftWidth: 3, borderLeftColor: C.accentTeal,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    shortcutIcon: {
      width: 38, height: 38, borderRadius: 11,
      backgroundColor: C.accentTealDim, alignItems: 'center', justifyContent: 'center',
    },
  }), [C])

  return (
    <SafeAreaView style={styles.safe}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load() }}
              tintColor={C.primary}
            />
          }
        >
          {/* Top bar */}
          <View style={styles.topBar}>
            <BrandLogo size={32} />
            <View style={styles.topBarRight}>
              <Pressable style={styles.iconBtn}>
                <Bell size={19} color={C.textSecondary} strokeWidth={1.8} />
              </Pressable>
            </View>
          </View>

          {/* Page header */}
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>Dashboard</Text>
            <Text style={styles.pageSubtitle}>Manage documents, study sets, and recent activity.</Text>
          </View>

          {/* Storage plan + usage. Tapping anywhere opens the plans screen. */}
          <Pressable
            style={styles.storageCard}
            onPress={() => router.push('/(app)/storage')}
          >
            <View style={styles.storageTopRow}>
              <View style={styles.storageIconBadge}>
                <Database size={18} color={C.accentTeal} strokeWidth={2} />
              </View>
              <Text style={styles.storageLabel}>STORAGE PLAN</Text>
            </View>

            <View style={styles.storagePlanRow}>
              <Text style={styles.storagePlanName}>
                {storage?.package?.name ?? 'Free'}
              </Text>
              <Text
                style={[
                  styles.storageBadge,
                  storage?.status === 'FULL' || storage?.status === 'CRITICAL'
                    ? { backgroundColor: C.errorDim, color: C.error }
                    : storage?.status === 'WARNING'
                      ? { backgroundColor: C.warningDim, color: C.warning }
                      : { backgroundColor: C.successDim, color: C.success },
                ]}
              >
                {storage?.status === 'FULL'
                  ? 'Full'
                  : storage?.status === 'CRITICAL'
                    ? 'Almost full'
                    : storage?.status === 'WARNING'
                      ? 'Filling up'
                      : 'Active'}
              </Text>
            </View>

            <Text style={styles.storageValue}>
              {formatBytes(storage?.usedBytes ?? 0)}
              <Text style={styles.storageValueTotal}>
                {' / '}
                {formatBytes(storage?.quotaBytes ?? 0)}
              </Text>
            </Text>
            <Text style={styles.storageCaption}>
              {storage
                ? `${formatBytes(storage.availableBytes)} free · 10 MB max per file`
                : 'loading storage...'}
            </Text>

            <View style={styles.storageBarWrap}>
              <StorageUsageBar
                quotaBytes={storage?.quotaBytes ?? 0}
                showLabel={false}
                status={storage?.status ?? 'OK'}
                usedBytes={storage?.usedBytes ?? 0}
              />
            </View>

            <View style={styles.storageCta}>
              <Text style={styles.storageCtaText}>
                {storage?.status === 'FULL'
                  ? 'Storage is full — upgrade your plan'
                  : storage?.status === 'CRITICAL' || storage?.status === 'WARNING'
                    ? 'Running low — compare plans'
                    : 'Manage plan'}
              </Text>
              <ChevronRight size={15} color={C.primary} strokeWidth={2.2} />
            </View>
          </Pressable>

          {/* AI card */}
          <View style={styles.aiCard}>
            <View style={styles.aiBadge}>
              <Sparkles size={11} color="#fff" />
              <Text style={styles.aiBadgeText}>AI CHAT</Text>
            </View>
            <Text style={styles.aiTitle}>
              Chat with your documents using AI-powered search and summarization.
            </Text>
            <View style={styles.aiActions}>
              <Pressable
                style={styles.aiBtn}
                onPress={() => router.push('/(app)/chat/new')}
              >
                <MessageCircle size={15} color={C.primary} />
                <Text style={styles.aiBtnText}>Start Chat</Text>
              </Pressable>
              <Text style={styles.aiCaption}>
                {docs.length} documents indexed
              </Text>
            </View>
          </View>

          {/* Study Materials card */}
          <Pressable
            onPress={() => router.push('/(app)/study-materials' as any)}
            style={({ pressed }) => [
              styles.studyCard,
              pressed && { opacity: 0.88, transform: [{ scale: 0.995 }] }
            ]}
          >
            <View style={styles.studyHeader}>
              <View style={[styles.studyIconWrap, { backgroundColor: `${C.accent}14` }]}>
                <Brain size={18} color={C.accent} />
              </View>
              <View style={styles.studyTitleWrap}>
                <Text style={styles.studyTitle}>Study Materials</Text>
                <Text style={styles.studySubtitle}>Active Recall & Retention</Text>
              </View>
              <ChevronRight size={18} color={C.muted} />
            </View>
            <Text style={styles.studyDesc}>
              Generate interactive flashcards and multiple-choice quizzes from your uploaded documents to boost your study efficiency.
            </Text>
          </Pressable>

          {/* Stats row */}
          <View style={styles.statsRow}>
            {stats.map((stat) => (
              <Card key={stat.label} elevated style={styles.statCard} padding="md">
                <View style={[styles.statIconWrap, { backgroundColor: stat.bg }]}>
                  <stat.icon size={17} color={stat.color} strokeWidth={2} />
                </View>
                <Text style={styles.statValue}>{loading ? '—' : stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </Card>
            ))}
          </View>

          {/* Recent Archives */}
          <View style={styles.recentCard}>
            <View style={styles.recentHeader}>
              <View style={styles.recentHeaderLeft}>
                <View style={styles.recentHeaderIcon}>
                  <Archive size={14} color={C.secondary} strokeWidth={2} />
                </View>
                <Text style={styles.recentTitle}>Recent Documents</Text>
              </View>
              <Pressable
                style={styles.viewAllBtn}
                onPress={() => router.push('/(app)/documents')}
              >
                <Text style={styles.viewAllText}>View all</Text>
              </Pressable>
            </View>

            {recentDocs.length === 0 ? (
              <View style={styles.fileEmpty}>
                <Text style={styles.fileEmptyText}>No documents yet</Text>
                <Text style={styles.fileEmptyHint}>
                  Tap "View all" or use the upload shortcut below to add documents.
                </Text>
              </View>
            ) : (
              recentDocs.map((doc, i) => {
                const color = fileTypeColor(doc.fileType, C)
                const subjectLabel = getSubjectName(getAccessibleSubject(doc), '')
                return (
                  <Pressable
                    key={doc.id}
                    onPress={() => router.push(`/(app)/document/${doc.id}` as any)}
                  >
                    {({ pressed }) => (
                      <View
                        style={[
                          styles.fileRow,
                          i === recentDocs.length - 1 && styles.fileRowLast,
                          pressed && { backgroundColor: C.cardElevated },
                        ]}
                      >
                        <View style={[styles.fileIcon, { backgroundColor: `${color}14` }]}>
                          <FileText size={18} color={color} />
                        </View>
                        <View style={styles.fileInfo}>
                          <Text style={styles.fileName} numberOfLines={1}>{doc.title}</Text>
                          <View style={styles.fileMeta}>
                            {subjectLabel ? (
                              <View style={styles.fileSubjectPill}>
                                <Text style={styles.fileSubjectText}>{subjectLabel}</Text>
                              </View>
                            ) : null}
                            <Text style={styles.fileTime}>{timeAgo(doc.updatedAt)}</Text>
                          </View>
                        </View>
                      </View>
                    )}
                  </Pressable>
                )
              })
            )}
          </View>

          {/* Subject Clusters */}
          <View style={styles.subjectCard}>
            <View style={styles.subjectHeader}>
              <View style={styles.subjectHeaderIcon}>
                <BookOpen size={14} color={C.accent} strokeWidth={2} />
              </View>
              <Text style={styles.subjectTitle}>Top Subjects</Text>
            </View>
            {subjectsWithCount.length === 0 ? (
              <View style={styles.subjectEmpty}>
                <Text style={styles.subjectEmptyText}>
                  No subjects yet. Create one in the Subjects tab.
                </Text>
              </View>
            ) : (
              <View style={styles.subjectList}>
                {subjectsWithCount.map((subj) => (
                  <View key={subj.id} style={styles.subjectRow}>
                    <View style={styles.subjectLeft}>
                      <View style={[styles.subjectDot, { backgroundColor: subj.color || C.primary }]} />
                      <Text style={styles.subjectName}>{subj.name}</Text>
                    </View>
                    <View style={styles.subjectCountRow}>
                      <Text style={[styles.subjectCount, { color: C.primary }]}>
                        {subj.count} docs
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Sync Documents shortcut */}
          <Pressable onPress={() => router.push('/(app)/documents')}>
            {({ pressed }) => (
              <View style={[styles.shortcutCard, pressed && { opacity: 0.8 }]}>
                <View style={{ gap: 3 }}>
                  <Text style={{ fontSize: FontSize.base, fontWeight: '600', color: C.text }}>
                    Manage Documents
                  </Text>
                  <Text style={{ fontSize: FontSize.xs, color: C.muted }}>
                    Upload, organize, share, and recover files
                  </Text>
                </View>
                <View style={styles.shortcutIcon}>
                  <UploadCloud size={18} color={C.accentTeal} strokeWidth={2} />
                </View>
              </View>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
  )
}
