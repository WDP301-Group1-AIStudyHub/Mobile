import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native'
import { router } from 'expo-router'
import {
  Activity,
  Check,
  ChevronRight,
  FileText,
  ShieldCheck,
  Users,
} from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import VideoBg from '../../components/ui/VideoBg'
import Card from '../../components/ui/Card'
import { FontSize, Spacing, Radius } from '../../constants/colors'
import { useColors } from '../../contexts/ThemeContext'

type Severity = 'info' | 'success' | 'warning' | 'critical'
type ActivityEvent = { id: string; time: string; desc: string; actor: string; target: string; severity: Severity }
type StatItem = { label: string; value: string; icon: typeof Users; color: string; bg: string; note?: string }

const ACTIVITY: ActivityEvent[] = [
  { id: '1', time: '09:42 AM', desc: 'User login detected', actor: 'sarah.chen@edu.vn', target: 'Auth Service', severity: 'info' },
  { id: '2', time: '09:38 AM', desc: 'Document indexed successfully', actor: 'System', target: 'doc-quantum-001', severity: 'success' },
  { id: '3', time: '09:21 AM', desc: 'Account deactivated by admin', actor: 'admin@aistudyhub', target: 'lin.zhao@edu.vn', severity: 'warning' },
  { id: '4', time: '08:57 AM', desc: 'Index pipeline failed', actor: 'Indexer', target: 'doc-dsa-005', severity: 'critical' },
  { id: '5', time: '08:44 AM', desc: 'New user registration', actor: 'Register Service', target: 'emma.t@edu.vn', severity: 'info' },
  { id: '6', time: '08:30 AM', desc: 'Password reset completed', actor: 'Auth Service', target: 'david.kim@edu.vn', severity: 'success' },
]

const USECASES = [
  'View user list',
  'Activate / Deactivate accounts',
  'Update user information',
  'Edit document metadata',
  'Monitor system activities',
]

const SEV_LABEL: Record<Severity, string> = {
  info: 'Info',
  success: 'Success',
  warning: 'Warning',
  critical: 'Critical',
}

export default function AdminDashboard() {
  const C = useColors()

  const STATS: StatItem[] = [
    { label: 'Total Users', value: '1,247', icon: Users, color: C.primary, bg: C.primaryDim },
    { label: 'Active Users', value: '983', icon: ShieldCheck, color: C.accentTeal, bg: 'rgba(13,148,136,0.1)' },
    { label: 'Indexed Docs', value: '3,891', icon: FileText, color: C.accentGold, bg: 'rgba(201,134,14,0.1)' },
    { label: 'Critical Events', value: '4', icon: Activity, color: C.accentCoral, bg: 'rgba(224,90,72,0.1)', note: 'last 24h' },
  ]
  const SEV_COLOR: Record<Severity, string> = {
    info: C.info,
    success: C.success,
    warning: C.warning,
    critical: C.error,
  }

  const styles = useMemo(() => StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxl + 16 },
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
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -1,
  },
  statLabel: {
    fontSize: FontSize.xs,
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
  usecaseCard: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.25)',
    backgroundColor: 'rgba(124,58,237,0.05)',
  },
  usecaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  usecaseIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  usecaseTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: C.accent,
  },
  usecaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  usecaseCheck: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: C.successDim,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  usecaseText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: C.textSecondary,
  },
  readyBadge: {
    backgroundColor: C.successDim,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  readyText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.success,
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

  return (
    <VideoBg>
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

          {/* Activity Stream */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>System Activity Stream</Text>
            <Pressable
              onPress={() => router.push('/admin/activity' as never)}
              style={styles.seeAllBtn}
            >
              <Text style={styles.seeAllText}>Open activity</Text>
              <ChevronRight size={14} color={C.primary} />
            </Pressable>
          </View>

          {ACTIVITY.map((ev) => (
            <Card key={ev.id} style={styles.activityCard} padding="md">
              <View style={styles.activityTopRow}>
                <Text style={styles.activityTime}>{ev.time}</Text>
                <View style={[styles.sevBadge, { backgroundColor: `${SEV_COLOR[ev.severity]}18` }]}>
                  <Text style={[styles.sevText, { color: SEV_COLOR[ev.severity] }]}>{SEV_LABEL[ev.severity]}</Text>
                </View>
              </View>
              <Text style={styles.activityDesc}>{ev.desc}</Text>
              <Text style={styles.activityActors}>{ev.actor} → {ev.target}</Text>
            </Card>
          ))}

          {/* Usecase Coverage */}
          <Card elevated style={styles.usecaseCard} padding="md">
            <View style={styles.usecaseHeader}>
              <LinearGradient
                colors={['#7c3aed', '#5b21b6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.usecaseIconWrap}
              >
                <ShieldCheck size={16} color="#fff" />
              </LinearGradient>
              <Text style={styles.usecaseTitle}>Usecase Coverage</Text>
            </View>
            {USECASES.map((uc) => (
              <View key={uc} style={styles.usecaseRow}>
                <View style={styles.usecaseCheck}>
                  <Check size={12} color={C.success} strokeWidth={2.5} />
                </View>
                <Text style={styles.usecaseText}>{uc}</Text>
                <View style={styles.readyBadge}>
                  <Text style={styles.readyText}>ready</Text>
                </View>
              </View>
            ))}
          </Card>

          <View style={styles.footer}>
            <Text style={styles.footerText}>AIStudyHub · Admin Review Mode</Text>
          </View>
        </ScrollView>
      </View>
    </VideoBg>
  )
}