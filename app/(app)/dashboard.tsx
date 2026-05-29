import { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import {
  Archive,
  Bell,
  BookOpen,
  Database,
  FileText,
  MessageCircle,
  Sparkles,
  UploadCloud,
} from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import VideoBg from '../../components/ui/VideoBg'
import Card from '../../components/ui/Card'
import BrandLogo from '../../components/ui/BrandLogo'
import ThemeToggle from '../../components/ui/ThemeToggle'
import { FontSize, Spacing, Radius } from '../../constants/colors'
import { useColors } from '../../contexts/ThemeContext'

const recentFiles = [
  { name: 'Quantum Entanglement Patterns.pdf', modified: '2h ago', subject: 'Physics', type: 'pdf' },
  { name: 'Neural Network Topologies.epub', modified: '5h ago', subject: 'AI Research', type: 'epub' },
  { name: 'Global Economic Shifts 2025.pdf', modified: 'Yesterday', subject: 'Economics', type: 'pdf' },
  { name: 'Metaphysics of Digital Reality.docx', modified: '2 days ago', subject: 'Philosophy', type: 'docx' },
]

export default function DashboardPage() {
  const C = useColors()

  const subjects = useMemo(() => [
    { name: 'Theoretical Physics', count: 124, color: C.primary },
    { name: 'Neural Engineering', count: 89, color: C.accentTeal },
    { name: 'Ethics in AI', count: 56, color: C.accent },
    { name: 'Astro-Biology', count: 42, color: C.accentGold },
  ], [C])

  const stats = useMemo(() => [
    { label: 'Documents', value: '342', icon: Database, color: C.primary, bg: C.primaryDim },
    { label: 'Chats', value: '18', icon: MessageCircle, color: C.accentTeal, bg: `${C.accentTeal}18` },
    { label: 'Subjects', value: '12', icon: Archive, color: C.accent, bg: `${C.accent}18` },
  ], [C])

  function fileTypeColor(type: string): string {
    if (type === 'pdf') return C.error
    if (type === 'epub') return C.secondary
    if (type === 'docx') return C.info
    return C.muted
  }

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
      shadowColor: C.cardShadowColor, shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    },
    pageHeader: { gap: 4 },
    pageTitle: { fontSize: FontSize.xxl, fontWeight: '700', color: C.text, letterSpacing: -0.5 },
    pageSubtitle: { fontSize: FontSize.sm, color: C.muted, lineHeight: 20 },
    storageCard: {
      backgroundColor: C.card, borderRadius: Radius.lg, borderWidth: 1,
      borderColor: C.cardBorder, padding: Spacing.lg, gap: Spacing.sm,
      borderLeftWidth: 3, borderLeftColor: C.accentTeal,
      shadowColor: C.cardShadowColor, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08, shadowRadius: 14, elevation: 3,
    },
    storageTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    storageIconBadge: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: `${C.accentTeal}18`,
      alignItems: 'center', justifyContent: 'center',
    },
    storageLabel: { fontSize: FontSize.xs, fontWeight: '700', color: C.muted, letterSpacing: 1.5 },
    storageValue: { fontSize: FontSize.xxxl, fontWeight: '300', color: C.text, letterSpacing: -1, marginTop: Spacing.lg },
    storageCaption: { fontSize: FontSize.xs, color: C.muted, marginTop: 2 },
    storageBarTrack: { height: 4, borderRadius: 2, backgroundColor: C.cardBorder, marginTop: Spacing.md, overflow: 'hidden' },
    storageBarFill: { height: 4, borderRadius: 2, backgroundColor: C.accentTeal, width: '3.2%' },
    aiCard: {
      borderRadius: Radius.lg, overflow: 'hidden',
      shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.22, shadowRadius: 18, elevation: 8,
    },
    aiGrad: { padding: Spacing.lg, gap: Spacing.md, borderRadius: Radius.lg, overflow: 'hidden', minHeight: 180 },
    aiCircle: {
      position: 'absolute', width: 200, height: 200, borderRadius: 100,
      backgroundColor: 'rgba(255,255,255,0.08)', right: -50, top: -50,
    },
    aiCircle2: {
      position: 'absolute', width: 120, height: 120, borderRadius: 60,
      backgroundColor: 'rgba(255,255,255,0.05)', right: 60, bottom: -20,
    },
    aiBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: 'rgba(255,255,255,0.18)', alignSelf: 'flex-start',
      paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full,
    },
    aiBadgeText: { fontSize: FontSize.xs, fontWeight: '700', color: 'rgba(255,255,255,0.95)', letterSpacing: 1.2 },
    aiTitle: { fontSize: FontSize.xl, fontWeight: '300', color: '#fff', lineHeight: 28, letterSpacing: -0.2, flex: 1 },
    aiActions: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', alignItems: 'center' },
    aiBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: 'rgba(255,255,255,0.96)', paddingHorizontal: Spacing.md,
      paddingVertical: 10, borderRadius: Radius.full,
    },
    aiBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: C.primary },
    aiCaption: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' },
    statsRow: { flexDirection: 'row', gap: Spacing.sm },
    statCard: { flex: 1, alignItems: 'center', gap: 5 },
    statIconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
    statValue: { fontSize: FontSize.xl, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
    statLabel: { fontSize: FontSize.xs, color: C.muted, fontWeight: '500' },
    recentCard: {
      backgroundColor: C.card, borderRadius: Radius.lg, borderWidth: 1,
      borderColor: C.cardBorder, overflow: 'hidden',
      shadowColor: C.cardShadowColor, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.07, shadowRadius: 14, elevation: 3,
    },
    recentHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
      borderBottomWidth: 1, borderBottomColor: C.cardBorder,
    },
    recentHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    recentHeaderIcon: {
      width: 28, height: 28, borderRadius: 8,
      backgroundColor: `${C.secondary}18`, alignItems: 'center', justifyContent: 'center',
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
      borderBottomWidth: 1, borderBottomColor: `${C.cardBorder}80`,
    },
    fileRowLast: { borderBottomWidth: 0 },
    fileIcon: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    fileInfo: { flex: 1, gap: 4 },
    fileName: { fontSize: FontSize.sm, color: C.text, fontWeight: '600' },
    fileMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    fileSubjectPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.full },
    fileSubjectText: { fontSize: FontSize.xs, fontWeight: '600' },
    fileTime: { fontSize: FontSize.xs, color: C.muted },
    subjectCard: {
      backgroundColor: C.card, borderRadius: Radius.lg, borderWidth: 1,
      borderColor: C.cardBorder, padding: Spacing.md, gap: Spacing.sm,
      borderLeftWidth: 3, borderLeftColor: C.accent,
      shadowColor: C.cardShadowColor, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.07, shadowRadius: 14, elevation: 3,
    },
    subjectHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    subjectHeaderIcon: {
      width: 28, height: 28, borderRadius: 8,
      backgroundColor: `${C.accent}18`, alignItems: 'center', justifyContent: 'center',
    },
    subjectTitle: { fontSize: FontSize.base, fontWeight: '600', color: C.text },
    subjectList: { gap: Spacing.sm, marginTop: 4 },
    subjectRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 6, paddingHorizontal: 8,
      borderRadius: Radius.md, backgroundColor: `${C.cardBorder}30`,
    },
    subjectLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    subjectDot: { width: 8, height: 8, borderRadius: 4 },
    subjectName: { fontSize: FontSize.sm, fontWeight: '600', color: C.text },
    subjectCountRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    subjectCount: { fontSize: FontSize.xs, fontWeight: '600' },
    statusCard: {
      backgroundColor: C.card, borderRadius: Radius.lg, borderWidth: 1,
      borderColor: C.cardBorder, padding: Spacing.md, gap: Spacing.md,
      borderLeftWidth: 3, borderLeftColor: C.accentTeal,
      flexDirection: 'row', alignItems: 'center',
    },
    statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.accentTeal, flexShrink: 0 },
    statusText: { flex: 1, fontSize: FontSize.xs, color: C.muted, fontStyle: 'italic', lineHeight: 18 },
    statusMeta: { gap: 6 },
    statusMetaRow: { alignItems: 'flex-end', gap: 2 },
    statusMetaLabel: { fontSize: 10, fontWeight: '700', color: C.muted, letterSpacing: 1 },
    statusMetaValue: { fontSize: FontSize.xs, color: C.text, fontWeight: '500' },
  }), [C])

  return (
    <VideoBg>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Top bar */}
          <View style={styles.topBar}>
            <BrandLogo size={32} />
            <View style={styles.topBarRight}>
              <ThemeToggle size={38} />
              <Pressable style={styles.iconBtn}>
                <Bell size={19} color={C.textSecondary} strokeWidth={1.8} />
              </Pressable>
            </View>
          </View>

          {/* Page header */}
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>Commander's Deck</Text>
            <Text style={styles.pageSubtitle}>Your scholarly universe, synchronized.</Text>
          </View>

          {/* Storage card — teal accent */}
          <View style={styles.storageCard}>
            <View style={styles.storageTopRow}>
              <View style={styles.storageIconBadge}>
                <Database size={18} color={C.accentTeal} strokeWidth={2} />
              </View>
              <Text style={styles.storageLabel}>STORAGE</Text>
            </View>
            <Text style={styles.storageValue}>0.00 GB</Text>
            <Text style={styles.storageCaption}>of 10 GB limit used</Text>
            <View style={styles.storageBarTrack}>
              <View style={styles.storageBarFill} />
            </View>
          </View>

          {/* Zenith Intelligence card */}
          <View style={styles.aiCard}>
            <LinearGradient
              colors={C.gradientPrimary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.aiGrad}
            >
              <View style={styles.aiCircle} />
              <View style={styles.aiCircle2} />
              <View style={styles.aiBadge}>
                <Sparkles size={11} color="rgba(255,255,255,0.95)" />
                <Text style={styles.aiBadgeText}>ZENITH INTELLIGENCE</Text>
              </View>
              <Text style={styles.aiTitle}>
                Transcend with AI: Interrogate your entire research library.
              </Text>
              <View style={styles.aiActions}>
                <Pressable
                  style={styles.aiBtn}
                  onPress={() => router.push('/(app)/chat/new')}
                >
                  <MessageCircle size={15} color={C.primary} />
                  <Text style={styles.aiBtnText}>Initiate Dialogue</Text>
                </Pressable>
                <Text style={styles.aiCaption}>Searching your archives...</Text>
              </View>
            </LinearGradient>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            {stats.map((stat) => (
              <Card key={stat.label} elevated style={styles.statCard} padding="md">
                <View style={[styles.statIconWrap, { backgroundColor: stat.bg }]}>
                  <stat.icon size={17} color={stat.color} strokeWidth={2} />
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </Card>
            ))}
          </View>

          {/* Recent Archives — blue accent */}
          <View style={styles.recentCard}>
            <View style={styles.recentHeader}>
              <View style={styles.recentHeaderLeft}>
                <View style={styles.recentHeaderIcon}>
                  <Archive size={14} color={C.secondary} strokeWidth={2} />
                </View>
                <Text style={styles.recentTitle}>Recent Archives</Text>
              </View>
              <Pressable
                style={styles.viewAllBtn}
                onPress={() => router.push('/(app)/library')}
              >
                <Text style={styles.viewAllText}>View all</Text>
              </Pressable>
            </View>

            {recentFiles.map((file, i) => (
              <Pressable key={i}>
                {({ pressed }) => (
                  <View style={[
                    styles.fileRow,
                    i === recentFiles.length - 1 && styles.fileRowLast,
                    pressed && { backgroundColor: `${C.cardBorder}40` },
                  ]}>
                    <View style={[styles.fileIcon, { backgroundColor: `${fileTypeColor(file.type)}14` }]}>
                      <FileText size={18} color={fileTypeColor(file.type)} />
                    </View>
                    <View style={styles.fileInfo}>
                      <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                      <View style={styles.fileMeta}>
                        <View style={[styles.fileSubjectPill, { backgroundColor: C.primaryDim }]}>
                          <Text style={[styles.fileSubjectText, { color: C.primary }]}>{file.subject}</Text>
                        </View>
                        <Text style={styles.fileTime}>{file.modified}</Text>
                      </View>
                    </View>
                  </View>
                )}
              </Pressable>
            ))}
          </View>

          {/* Subject Clusters — violet accent */}
          <View style={styles.subjectCard}>
            <View style={styles.subjectHeader}>
              <View style={styles.subjectHeaderIcon}>
                <BookOpen size={14} color={C.accent} strokeWidth={2} />
              </View>
              <Text style={styles.subjectTitle}>Subject Clusters</Text>
            </View>
            <View style={styles.subjectList}>
              {subjects.map((subj, i) => (
                <View key={i} style={styles.subjectRow}>
                  <View style={styles.subjectLeft}>
                    <View style={[styles.subjectDot, { backgroundColor: subj.color }]} />
                    <Text style={styles.subjectName}>{subj.name}</Text>
                  </View>
                  <View style={styles.subjectCountRow}>
                    <Text style={[styles.subjectCount, { color: subj.color }]}>{subj.count}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Status bar */}
          <View style={styles.statusCard}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>
              The library grows at 2.4 documents per day. 342 total archives available.
            </Text>
            <View style={styles.statusMeta}>
              <View style={styles.statusMetaRow}>
                <Text style={styles.statusMetaLabel}>UPTIME</Text>
                <Text style={styles.statusMetaValue}>99.98%</Text>
              </View>
              <View style={styles.statusMetaRow}>
                <Text style={styles.statusMetaLabel}>SYNC</Text>
                <Text style={styles.statusMetaValue}>Active</Text>
              </View>
            </View>
          </View>

          {/* Sync Documents shortcut */}
          <Pressable onPress={() => router.push('/(app)/library')}>
            {({ pressed }) => (
              <View style={[{
                backgroundColor: C.card, borderRadius: Radius.lg, borderWidth: 1,
                borderColor: C.cardBorder, padding: Spacing.md,
                borderLeftWidth: 3, borderLeftColor: C.accentTeal,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                opacity: pressed ? 0.75 : 1,
              }]}>
                <View style={{ gap: 3 }}>
                  <Text style={{ fontSize: FontSize.base, fontWeight: '600', color: C.text }}>Sync Documents</Text>
                  <Text style={{ fontSize: FontSize.xs, color: C.muted }}>Upload to library</Text>
                </View>
                <View style={{
                  width: 38, height: 38, borderRadius: 11,
                  backgroundColor: `${C.accentTeal}18`, alignItems: 'center', justifyContent: 'center',
                }}>
                  <UploadCloud size={18} color={C.accentTeal} strokeWidth={2} />
                </View>
              </View>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </VideoBg>
  )
}
