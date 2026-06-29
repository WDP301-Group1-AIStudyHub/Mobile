import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  RefreshControl,
  ActivityIndicator,
  Modal
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Activity,
  Filter,
  Search,
  User,
  Tag,
  Globe,
  Database,
  Network,
  Monitor,
  X
} from 'lucide-react-native'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import { FontSize, Spacing, Radius } from '../../constants/colors'
import { useColors } from '../../contexts/ThemeContext'
import { listSystemActivities } from '../../services/adminApi'
import type { SystemActivity } from '../../types/admin'

type Severity = SystemActivity['severity']
type ActivityType = SystemActivity['type']

const SEVERITY_FILTERS: Array<Severity | 'all'> = ['all', 'info', 'success', 'warning', 'critical']
const TYPE_FILTERS: Array<ActivityType | 'all'> = ['all', 'auth', 'user', 'document', 'system']

const SEV_LABEL: Record<string, string> = {
  info: 'Info',
  success: 'Success',
  warning: 'Warning',
  critical: 'Critical',
}
const TYPE_LABEL: Record<string, string> = {
  auth: 'Auth',
  user: 'User',
  document: 'Document',
  system: 'System',
}

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function ActivityPage() {
  const C = useColors()

  const SEV_COLOR: Record<string, string> = {
    info: C.info,
    success: C.success,
    warning: C.warning,
    critical: C.error,
  }
  const SEV_BG: Record<string, string> = {
    info: C.infoDim,
    success: C.successDim,
    warning: C.warningDim,
    critical: C.errorDim,
  }
  const TYPE_COLOR: Record<string, string> = {
    auth: C.primary,
    user: C.secondary, // wait secondary is very light in botanical, but fallback to something else if needed
    document: C.accentGold,
    system: C.accentTeal,
  }
  const TYPE_BG: Record<string, string> = {
    auth: C.primaryDim,
    user: C.secondaryDim,
    document: C.accentGoldDim,
    system: C.accentTealDim,
  }

  const [logs, setLogs] = useState<SystemActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<ActivityType | 'all'>('all')
  const [viewingActivity, setViewingActivity] = useState<SystemActivity | null>(null)

  const loadLogs = useCallback(async () => {
    try {
      const data = await listSystemActivities()
      setLogs(data)
    } catch (error) {
      console.error('Failed to load system activities', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return logs.filter((ev) => {
      const matchSearch =
        !q ||
        ev.description.toLowerCase().includes(q) ||
        ev.actor.toLowerCase().includes(q) ||
        ev.target.toLowerCase().includes(q)
      const matchSev = severityFilter === 'all' || ev.severity === severityFilter
      const matchType = typeFilter === 'all' || ev.type === typeFilter
      return matchSearch && matchSev && matchType
    })
  }, [logs, search, severityFilter, typeFilter])

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
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
    filtersScroll: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      gap: Spacing.sm,
    },
    filterGroupLabel: {
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
      color: C.muted,
      letterSpacing: 0.5,
      alignSelf: 'center',
      marginRight: 4,
    },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: C.cardBorder,
      backgroundColor: C.card,
    },
    filterChipActive: {
      borderColor: C.primary,
      backgroundColor: C.primaryDim,
    },
    filterText: {
      fontSize: FontSize.xs,
      fontWeight: '600',
      color: C.textSecondary,
      textTransform: 'capitalize',
    },
    filterTextActive: {
      color: C.primary,
    },
    listContent: {
      padding: Spacing.lg,
      paddingBottom: Spacing.xxl + 96,
    },
    eventCard: {
      marginBottom: Spacing.sm,
    },
    eventTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
    eventTime: {
      fontSize: FontSize.xs,
      fontWeight: '600',
      color: C.muted,
    },
    eventBadges: {
      flexDirection: 'row',
      gap: Spacing.xs,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: Radius.full,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
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
    },
    eventText: {
      flex: 1,
      gap: 2,
    },
    eventDesc: {
      fontSize: FontSize.sm,
      fontWeight: '700',
      color: C.text,
      lineHeight: 20,
    },
    eventActors: {
      fontSize: FontSize.xs,
      color: C.textSecondary,
      fontWeight: '500',
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
    emptyTitle: {
      fontSize: FontSize.md,
      fontWeight: '700',
      color: C.text,
    },
    emptyDesc: {
      fontSize: FontSize.sm,
      color: C.muted,
      textAlign: 'center',
      maxWidth: 280,
      lineHeight: 20,
    },
  }), [C])

  const renderEvent = ({ item }: { item: SystemActivity }) => (
    <Pressable onPress={() => setViewingActivity(item)}>
      <Card style={styles.eventCard} padding="md">
        <View style={styles.eventTopRow}>
          <Text style={styles.eventTime}>{formatDateTime(item.createdAt)}</Text>
          <View style={styles.eventBadges}>
            <View style={[styles.badge, { backgroundColor: SEV_BG[item.severity] }]}>
              <Text style={[styles.badgeText, { color: SEV_COLOR[item.severity] }]}>
                {SEV_LABEL[item.severity]}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: TYPE_BG[item.type] || C.cardBorder }]}>
              <Text style={[styles.badgeText, { color: TYPE_COLOR[item.type] || C.textSecondary }]}>
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
            <Text style={styles.eventDesc}>{item.description}</Text>
            <Text style={styles.eventActors} numberOfLines={1}>{item.actor} -&gt; {item.target}</Text>
          </View>
        </View>
      </Card>
    </Pressable>
  )

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.searchRow}>
        <View style={styles.searchFlex}>
          <Input
            placeholder="Search by description, actor..."
            value={search}
            onChangeText={setSearch}
            leftIcon={<Search size={18} color={C.muted} />}
          />
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{filtered.length}</Text>
        </View>
      </View>

      <View style={{ borderBottomWidth: 1, borderBottomColor: C.cardBorder }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScroll}
        >
          <Text style={styles.filterGroupLabel}>Severity</Text>
          {SEVERITY_FILTERS.map((f) => (
            <Pressable
              key={`sev-${f}`}
              style={[styles.filterChip, severityFilter === f && styles.filterChipActive]}
              onPress={() => setSeverityFilter(f)}
            >
              <Text style={[styles.filterText, severityFilter === f && styles.filterTextActive]}>
                {f}
              </Text>
            </Pressable>
          ))}

          <View style={{ width: 1, height: 20, backgroundColor: C.cardBorder, alignSelf: 'center', marginHorizontal: 8 }} />
          
          <Text style={styles.filterGroupLabel}>Type</Text>
          {TYPE_FILTERS.map((f) => (
            <Pressable
              key={`type-${f}`}
              style={[styles.filterChip, typeFilter === f && styles.filterChipActive]}
              onPress={() => setTypeFilter(f)}
            >
              <Text style={[styles.filterText, typeFilter === f && styles.filterTextActive]}>
                {f}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderEvent}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadLogs(); }} tintColor={C.primary} />
        }
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Filter size={36} color={C.muted} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>No matching activities</Text>
            <Text style={styles.emptyDesc}>Try adjusting your search query or filters.</Text>
          </View>
        )}
      />

      <Modal visible={!!viewingActivity} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setViewingActivity(null)}>
        {viewingActivity && (
          <View style={{ flex: 1, backgroundColor: C.background }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: C.cardBorder, backgroundColor: C.cardElevated }}>
              <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: C.text }}>Activity Details</Text>
              <Pressable onPress={() => setViewingActivity(null)} style={{ padding: 4 }}>
                <X size={24} color={C.text} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: Spacing.md, gap: Spacing.lg }}>
              {/* Description & Time */}
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: C.text }}>{viewingActivity.description}</Text>
                <Text style={{ fontSize: FontSize.sm, color: C.muted }}>{formatDateTime(viewingActivity.createdAt)}</Text>
                
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <View style={[styles.badge, { backgroundColor: SEV_BG[viewingActivity.severity] }]}>
                    <Text style={[styles.badgeText, { color: SEV_COLOR[viewingActivity.severity] }]}>{SEV_LABEL[viewingActivity.severity]}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: TYPE_BG[viewingActivity.type] || C.cardBorder }]}>
                    <Text style={[styles.badgeText, { color: TYPE_COLOR[viewingActivity.type] || C.textSecondary }]}>{TYPE_LABEL[viewingActivity.type]}</Text>
                  </View>
                </View>
              </View>

              {/* General Info */}
              <View style={{ gap: Spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <User size={14} color={C.primary} style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: C.textSecondary }}>General Information</Text>
                </View>
                <Card elevated style={{ padding: Spacing.md, gap: Spacing.sm }}>
                  <View>
                    <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: C.muted, textTransform: 'uppercase' }}>Actor</Text>
                    <Text style={{ fontSize: FontSize.base, fontWeight: '500', color: C.text, marginTop: 2 }}>{viewingActivity.actor}</Text>
                  </View>
                  {!!viewingActivity.entityType && (
                    <View style={{ marginTop: 8 }}>
                      <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: C.muted, textTransform: 'uppercase' }}>Entity Affected</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Tag size={14} color={C.textSecondary} />
                        <Text style={{ fontSize: FontSize.base, fontWeight: '500', color: C.text }}>{viewingActivity.entityType}</Text>
                      </View>
                      {!!viewingActivity.entityId && (
                        <Text style={{ fontSize: FontSize.xs, color: C.muted, marginTop: 2 }}>ID: {viewingActivity.entityId}</Text>
                      )}
                    </View>
                  )}
                </Card>
              </View>

              {/* Technical Details */}
              <View style={{ gap: Spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Globe size={14} color={C.primary} style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: C.textSecondary }}>Technical Details</Text>
                </View>
                <Card elevated style={{ padding: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: C.cardBorder }}>
                    <Database size={16} color={C.muted} style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: C.muted }}>Log ID</Text>
                      <Text style={{ fontSize: FontSize.sm, color: C.text, fontFamily: 'monospace', marginTop: 2 }}>{viewingActivity.id}</Text>
                    </View>
                  </View>

                  {!!viewingActivity.ipAddress && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: C.cardBorder }}>
                      <Network size={16} color={C.muted} style={{ marginRight: 8 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: C.muted }}>IP Address</Text>
                        <Text style={{ fontSize: FontSize.sm, color: C.text, fontFamily: 'monospace', marginTop: 2 }}>{viewingActivity.ipAddress}</Text>
                      </View>
                    </View>
                  )}

                  {!!viewingActivity.userAgent && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', padding: Spacing.md }}>
                      <Monitor size={16} color={C.muted} style={{ marginRight: 8 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: C.muted }}>Device Info</Text>
                        <Text style={{ fontSize: FontSize.sm, color: C.text, fontFamily: 'monospace', marginTop: 2 }}>{viewingActivity.userAgent}</Text>
                      </View>
                    </View>
                  )}
                </Card>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  )
}
