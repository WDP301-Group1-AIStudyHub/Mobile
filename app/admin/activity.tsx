import { useMemo, useState } from 'react'
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Activity,
  Filter,
  Search,
} from 'lucide-react-native'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import { FontSize, Spacing, Radius } from '../../constants/colors'
import { useColors } from '../../contexts/ThemeContext'

type Severity = 'info' | 'success' | 'warning' | 'critical'
type ActivityType = 'auth' | 'user' | 'document' | 'system'

type ActivityEvent = {
  id: string
  time: string
  desc: string
  actor: string
  target: string
  severity: Severity
  type: ActivityType
}

const ALL_EVENTS: ActivityEvent[] = [
  { id: 'a1', time: 'Today 09:42', desc: 'User login detected', actor: 'sarah.chen@edu.vn', target: 'Auth Service', severity: 'info', type: 'auth' },
  { id: 'a2', time: 'Today 09:38', desc: 'Document indexed successfully', actor: 'System', target: 'doc-quantum-001', severity: 'success', type: 'document' },
  { id: 'a3', time: 'Today 09:21', desc: 'Account deactivated by admin', actor: 'admin@aistudyhub', target: 'lin.zhao@edu.vn', severity: 'warning', type: 'user' },
  { id: 'a4', time: 'Today 08:57', desc: 'Index pipeline failed', actor: 'Indexer', target: 'doc-dsa-005', severity: 'critical', type: 'document' },
  { id: 'a5', time: 'Today 08:44', desc: 'New user registration', actor: 'Register Service', target: 'emma.t@edu.vn', severity: 'info', type: 'auth' },
  { id: 'a6', time: 'Today 08:30', desc: 'Password reset completed', actor: 'Auth Service', target: 'david.kim@edu.vn', severity: 'success', type: 'auth' },
  { id: 'a7', time: 'Yesterday 22:10', desc: 'System health check passed', actor: 'Monitor', target: 'All Services', severity: 'success', type: 'system' },
  { id: 'a8', time: 'Yesterday 21:45', desc: 'High memory usage detected', actor: 'Monitor', target: 'Indexer Service', severity: 'warning', type: 'system' },
  { id: 'a9', time: 'Yesterday 19:12', desc: 'Unauthorized API access attempt', actor: '192.168.1.100', target: '/api/admin', severity: 'critical', type: 'system' },
  { id: 'a10', time: 'Yesterday 17:34', desc: 'User role updated to Admin', actor: 'admin@aistudyhub', target: 'james.r@edu.vn', severity: 'info', type: 'user' },
  { id: 'a11', time: 'Yesterday 15:20', desc: 'Bulk document metadata update', actor: 'admin@aistudyhub', target: '12 documents', severity: 'info', type: 'document' },
  { id: 'a12', time: 'Yesterday 10:05', desc: 'Database backup completed', actor: 'System', target: 'DB Backup Service', severity: 'success', type: 'system' },
]

const SEVERITY_FILTERS: Array<Severity | 'all'> = ['all', 'info', 'success', 'warning', 'critical']
const TYPE_FILTERS: Array<ActivityType | 'all'> = ['all', 'auth', 'user', 'document', 'system']

const SEV_LABEL: Record<Severity, string> = {
  info: 'Info',
  success: 'Success',
  warning: 'Warning',
  critical: 'Critical',
}
const TYPE_LABEL: Record<ActivityType, string> = {
  auth: 'Auth',
  user: 'User',
  document: 'Document',
  system: 'System',
}

export default function ActivityPage() {
  const C = useColors()

  const SEV_COLOR: Record<Severity, string> = {
    info: C.info,
    success: C.success,
    warning: C.warning,
    critical: C.error,
  }
  const SEV_BG: Record<Severity, string> = {
    info: C.infoDim,
    success: C.successDim,
    warning: C.warningDim,
    critical: C.errorDim,
  }
  const TYPE_COLOR: Record<ActivityType, string> = {
    auth: C.primary,
    user: C.secondary,
    document: C.accentGold,
    system: C.accentTeal,
  }
  const TYPE_BG: Record<ActivityType, string> = {
    auth: C.primaryDim,
    user: C.secondaryDim,
    document: 'rgba(201,134,14,0.1)',
    system: 'rgba(13,148,136,0.1)',
  }
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<ActivityType | 'all'>('all')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return ALL_EVENTS.filter((ev) => {
      const matchSearch =
        !q ||
        ev.desc.toLowerCase().includes(q) ||
        ev.actor.toLowerCase().includes(q) ||
        ev.target.toLowerCase().includes(q)
      const matchSev = severityFilter === 'all' || ev.severity === severityFilter
      const matchType = typeFilter === 'all' || ev.type === typeFilter
      return matchSearch && matchSev && matchType
    })
  }, [search, severityFilter, typeFilter])

  const renderEvent = ({ item }: { item: ActivityEvent }) => (
    <Card style={styles.eventCard} padding="md">
      <View style={styles.eventTopRow}>
        <Text style={styles.eventTime}>{item.time}</Text>
        <View style={styles.eventBadges}>
          <View style={[styles.badge, { backgroundColor: SEV_BG[item.severity] }]}>
            <Text style={[styles.badgeText, { color: SEV_COLOR[item.severity] }]}>
              {SEV_LABEL[item.severity]}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: TYPE_BG[item.type] }]}>
            <Text style={[styles.badgeText, { color: TYPE_COLOR[item.type] }]}>
              {TYPE_LABEL[item.type]}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.eventBody}>
        <View style={[styles.eventIconWrap, { backgroundColor: `${SEV_COLOR[item.severity]}15` }]}>
          <Activity size={14} color={SEV_COLOR[item.severity]} />
        </View>
        <View style={styles.eventText}>
          <Text style={styles.eventDesc}>{item.desc}</Text>
          <Text style={styles.eventActors} numberOfLines={1}>{item.actor} → {item.target}</Text>
        </View>
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
  filterBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingLeft: Spacing.lg,
    paddingBottom: 6,
  },
  filterRow: {
    gap: 6,
    paddingRight: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: C.cardElevated,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  chipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  chipText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: C.muted,
  },
  chipTextActive: {
    color: '#fff',
  },
  list: {
    padding: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: Spacing.xxl + 16,
  },
  eventCard: { gap: Spacing.sm },
  eventTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventTime: {
    fontSize: FontSize.xs,
    color: C.muted,
  },
  eventBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  eventBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  eventIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  eventText: { flex: 1, gap: 3 },
  eventDesc: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: C.text,
  },
  eventActors: {
    fontSize: FontSize.xs,
    color: C.muted,
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
    backgroundColor: C.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: FontSize.sm,
    color: C.muted,
    textAlign: 'center',
    maxWidth: 240,
  },
}), [C])

  return (
    <SafeAreaView style={styles.safe}>
      {/* Search + Count */}
      <View style={styles.searchRow}>
          <View style={styles.searchFlex}>
            <Input
              placeholder="Search actor, target, or activity"
              value={search}
              onChangeText={setSearch}
              leftIcon={<Search size={16} color={C.muted} />}
            />
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{filtered.length}</Text>
          </View>
        </View>

        {/* Severity Filters */}
        <View style={styles.filterBlock}>
          <Filter size={13} color={C.muted} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {SEVERITY_FILTERS.map((f) => (
              <Pressable
                key={f}
                onPress={() => setSeverityFilter(f)}
                style={[
                  styles.chip,
                  severityFilter === f && styles.chipActive,
                  f !== 'all' && severityFilter === f && { backgroundColor: `${SEV_COLOR[f as Severity]}20`, borderColor: SEV_COLOR[f as Severity] },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    severityFilter === f && styles.chipTextActive,
                    f !== 'all' && severityFilter === f && { color: SEV_COLOR[f as Severity] },
                  ]}
                >
                  {f === 'all' ? 'All' : SEV_LABEL[f as Severity]}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Type Filters */}
        <View style={styles.filterBlock}>
          <View style={{ width: 13 }} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {TYPE_FILTERS.map((f) => (
              <Pressable
                key={f}
                onPress={() => setTypeFilter(f)}
                style={[
                  styles.chip,
                  typeFilter === f && styles.chipActive,
                  f !== 'all' && typeFilter === f && { backgroundColor: TYPE_BG[f as ActivityType], borderColor: TYPE_COLOR[f as ActivityType] },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    typeFilter === f && styles.chipTextActive,
                    f !== 'all' && typeFilter === f && { color: TYPE_COLOR[f as ActivityType] },
                  ]}
                >
                  {f === 'all' ? 'All' : TYPE_LABEL[f as ActivityType]}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Event List */}
        <FlatList
          data={filtered}
          keyExtractor={(e) => e.id}
          renderItem={renderEvent}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Filter size={32} color={C.muted} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>No activity matches the current filters.</Text>
            </View>
          }
        />
      </SafeAreaView>
  )
}