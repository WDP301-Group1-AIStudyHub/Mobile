import { ScrollView, StyleSheet, Text, View, Pressable, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import {
  Activity,
  Check,
  ChevronRight,
  FileText,
  ShieldCheck,
  Users,
  MessageSquare,
  BookOpen,
  HeartPulse
} from 'lucide-react-native'
import Card from '../../components/ui/Card'
import { FontSize, Spacing, Radius } from '../../constants/colors'
import { useEffect, useState, useMemo } from 'react'
import { useColors } from '../../contexts/ThemeContext'
import { getDashboardStats, listSystemActivities } from '../../services/adminApi'
import type { DashboardStats, SystemActivity } from '../../types/admin'

type StatItem = { label: string; value: string; icon: any; color: string; bg: string; note?: string }

const SEV_LABEL: Record<string, string> = {
  info: 'Info',
  success: 'Success',
  warning: 'Warning',
  critical: 'Critical',
}

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function AdminDashboard() {
  const C = useColors()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activities, setActivities] = useState<SystemActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      try {
        const [statsData, activitiesData] = await Promise.all([
          getDashboardStats(),
          listSystemActivities()
        ])
        setStats(statsData)
        setActivities(activitiesData.slice(0, 6)) // only show 6 recent
      } catch (error) {
        console.error('Failed to load dashboard data', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const STATS: StatItem[] = [
    { label: 'Total Users', value: String(stats?.usageStatistics.totalUsers ?? 0), icon: Users, color: C.primary, bg: C.primaryDim },
    { label: 'Chat threads', value: String(stats?.usageStatistics.totalChatThreads ?? 0), icon: MessageSquare, color: C.accentTeal, bg: C.accentTealDim },
    { label: 'Study materials', value: String(stats?.usageStatistics.totalStudyMaterials ?? 0), icon: BookOpen, color: C.accentCoral, bg: C.errorDim },
    { label: 'Documents', value: String(stats?.usageStatistics.totalDocuments ?? 0), icon: FileText, color: C.accentGold, bg: C.accentGoldDim },
  ]
  
  const SEV_COLOR: Record<string, string> = {
    info: C.info,
    success: C.success,
    warning: C.warning,
    critical: C.error,
  }

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxl + 96 },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
      marginBottom: Spacing.lg,
    },
    statCard: {
      width: '47.5%',
      gap: 6,
    },
    statIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    statValue: {
      fontSize: FontSize.xl,
      fontWeight: '800',
      color: C.text,
      letterSpacing: -1,
    },
    statLabel: {
      fontSize: FontSize.sm,
      fontWeight: '600',
      color: C.textSecondary,
    },
    statNote: {
      fontSize: 10,
      color: C.muted,
      marginTop: 1,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.sm,
      marginTop: 4,
    },
    sectionTitle: {
      fontSize: FontSize.md,
      fontWeight: '700',
      color: C.text,
      letterSpacing: -0.3,
    },
    seeAllBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    seeAllText: {
      fontSize: FontSize.xs,
      color: C.primary,
      fontWeight: '600',
    },
    activityCard: {
      gap: 4,
      marginBottom: Spacing.sm,
    },
    activityTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    activityTime: {
      fontSize: FontSize.xs,
      color: C.muted,
    },
    sevBadge: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: Radius.full,
    },
    sevText: {
      fontSize: 10,
      fontWeight: '700',
    },
    activityDesc: {
      fontSize: FontSize.sm,
      fontWeight: '600',
      color: C.text,
    },
    activityActors: {
      fontSize: FontSize.xs,
      color: C.muted,
    },
    healthCard: {
      gap: Spacing.md,
      marginBottom: Spacing.lg,
    },
    healthHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginBottom: 4,
    },
    healthIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.errorDim,
    },
    healthTitle: {
      fontSize: FontSize.md,
      fontWeight: '700',
      color: C.text,
    },
    healthRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: C.cardBorder,
    },
    healthLabel: {
      fontSize: FontSize.sm,
      color: C.textSecondary,
    },
    healthValue: {
      fontSize: FontSize.sm,
      fontWeight: '600',
      color: C.text,
    },
    footer: {
      alignItems: 'center',
      paddingTop: Spacing.lg,
    },
    footerText: {
      fontSize: FontSize.xs,
      color: C.mutedLight,
    },
  }), [C])

  const health = stats?.platformHealth

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    )
  }

  return (
    <View style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Stats 2×2 */}
        <View style={styles.statsGrid}>
          {STATS.map((s) => {
            const Icon = s.icon
            return (
              <Card elevated key={s.label} style={[styles.statCard, { borderTopColor: s.color, borderTopWidth: 3 }]} padding="md">
                <View style={[styles.statIconWrap, { backgroundColor: s.bg }]}>
                  <Icon size={20} color={s.color} />
                </View>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
                {s.note ? <Text style={styles.statNote}>{s.note}</Text> : null}
              </Card>
            )
          })}
        </View>

        {/* Platform Health */}
        <Card elevated style={styles.healthCard} padding="lg">
          <View style={styles.healthHeader}>
            <View style={styles.healthIconWrap}>
              <HeartPulse size={16} color={C.error} />
            </View>
            <Text style={styles.healthTitle}>Platform Health</Text>
          </View>
          
          <View style={styles.healthRow}>
            <Text style={styles.healthLabel}>Overall status</Text>
            <View style={[styles.sevBadge, { backgroundColor: health?.status === 'Healthy' ? C.successDim : C.warningDim }]}>
              <Text style={[styles.sevText, { color: health?.status === 'Healthy' ? C.success : C.warning }]}>{health?.status || 'Unknown'}</Text>
            </View>
          </View>
          <View style={styles.healthRow}>
            <Text style={styles.healthLabel}>Database</Text>
            <View style={[styles.sevBadge, { backgroundColor: health?.databaseConnected ? C.successDim : C.errorDim }]}>
              <Text style={[styles.sevText, { color: health?.databaseConnected ? C.success : C.error }]}>{health?.databaseConnected ? 'Connected' : 'Disconnected'}</Text>
            </View>
          </View>
          <View style={styles.healthRow}>
            <Text style={styles.healthLabel}>Chunks processed</Text>
            <Text style={styles.healthValue}>{health?.documentProcessing.totalChunksProcessed || 0}</Text>
          </View>
          <View style={styles.healthRow}>
            <Text style={styles.healthLabel}>Successful extractions</Text>
            <View style={[styles.sevBadge, { backgroundColor: C.successDim }]}>
              <Text style={[styles.sevText, { color: C.success }]}>{health?.documentProcessing.completedExtractions || 0}</Text>
            </View>
          </View>
          <View style={styles.healthRow}>
            <Text style={styles.healthLabel}>Extractions failed</Text>
            <View style={[styles.sevBadge, { backgroundColor: (health?.documentProcessing.failedExtractions || 0) > 0 ? C.warningDim : C.successDim }]}>
              <Text style={[styles.sevText, { color: (health?.documentProcessing.failedExtractions || 0) > 0 ? C.warning : C.success }]}>{health?.documentProcessing.failedExtractions || 0}</Text>
            </View>
          </View>
          <View style={[styles.healthRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <Text style={styles.healthLabel}>Failure rate</Text>
            <Text style={styles.healthValue}>{health?.documentProcessing.failureRatePercentage || '0'}%</Text>
          </View>
        </Card>

        {/* Activity Stream */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent activity stream</Text>
          <Pressable
            onPress={() => router.push('/admin/activity' as never)}
            style={styles.seeAllBtn}
          >
            <Text style={styles.seeAllText}>Open activity</Text>
            <ChevronRight size={14} color={C.primary} />
          </Pressable>
        </View>

        {activities.map((ev) => (
          <Card key={ev.id} style={styles.activityCard} padding="md">
            <View style={styles.activityTopRow}>
              <Text style={styles.activityTime}>{formatDateTime(ev.createdAt)}</Text>
              <View style={[styles.sevBadge, { backgroundColor: `${SEV_COLOR[ev.severity]}18` }]}>
                <Text style={[styles.sevText, { color: SEV_COLOR[ev.severity] }]}>{SEV_LABEL[ev.severity]}</Text>
              </View>
            </View>
            <Text style={styles.activityDesc}>{ev.description}</Text>
            <Text style={styles.activityActors}>{ev.actor} -&gt; {ev.target}</Text>
          </Card>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>AIStudyHub · Admin Review Mode</Text>
        </View>
      </ScrollView>
    </View>
  )
}
