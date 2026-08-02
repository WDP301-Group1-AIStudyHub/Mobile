import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { HardDrive, RefreshCw, Search, Users } from 'lucide-react-native'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import { FontSize, Radius, Spacing } from '../../constants/colors'
import { useColors } from '../../contexts/ThemeContext'
import { assignAdminStoragePackage, getAdminStorageOverview, getAdminStorageUser, listAdminStoragePackages, listAdminStorageUsers, reconcileAdminStorageUser, reconcileAllAdminStorage } from '../../services/adminStorageApi'
import type { AdminStorageOverview, AdminStoragePackage, AdminStorageUserDetail, AdminStorageUserRow, StorageAdminStatus } from '../../types/adminStorage'

const bytes = (value: number) => value < 1024 * 1024 ? `${Math.round(value / 1024)} KB` : value < 1024 * 1024 * 1024 ? `${(value / 1024 / 1024).toFixed(1)} MB` : `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`

export default function AdminStorageScreen() {
  const C = useColors()
  const [overview, setOverview] = useState<AdminStorageOverview | null>(null)
  const [users, setUsers] = useState<AdminStorageUserRow[]>([])
  const [packages, setPackages] = useState<AdminStoragePackage[]>([])
  const [detail, setDetail] = useState<AdminStorageUserDetail | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StorageAdminStatus | ''>('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const [nextOverview, nextUsers, nextPackages] = await Promise.all([getAdminStorageOverview(), listAdminStorageUsers({ search: search || undefined, status: status || undefined, limit: 50 }), listAdminStoragePackages()])
      setOverview(nextOverview); setUsers(nextUsers.items); setPackages(nextPackages)
    } catch (error) { Alert.alert('Error', error instanceof Error ? error.message : 'Could not load storage management') } finally { setLoading(false); setRefreshing(false) }
  }, [search, status])
  useEffect(() => { void load() }, [load])

  const changePackage = (userId: string, target: AdminStoragePackage) => {
    Alert.prompt('Change package', 'Enter a reason for this admin change.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Apply', onPress: async (reason?: string) => {
        if (!reason?.trim()) { Alert.alert('Reason required'); return }
        setBusy(true)
        try { await assignAdminStoragePackage(userId, target.id, reason.trim()); Alert.alert('Success', `${target.name} assigned.`); await load(); const next = await getAdminStorageUser(userId); setDetail(next) } catch (error) { Alert.alert('Error', error instanceof Error ? error.message : 'Package change failed') } finally { setBusy(false) }
      } },
    ], 'plain-text')
  }

  const showUserActions = (row: AdminStorageUserRow) => {
    if (!row.user) return
    Alert.alert(row.user.fullName, 'Storage actions', [
      { text: 'View detail', onPress: async () => { try { setDetail(await getAdminStorageUser(row.user!.id)) } catch (error) { Alert.alert('Error', error instanceof Error ? error.message : 'Unable to load detail') } } },
      { text: 'Reconcile', onPress: async () => { setBusy(true); try { await reconcileAdminStorageUser(row.user!.id); await load(); Alert.alert('Success', 'Storage reconciled.') } catch (error) { Alert.alert('Error', error instanceof Error ? error.message : 'Reconcile failed') } finally { setBusy(false) } } },
      ...packages.filter((pkg) => pkg.isActive && pkg.id !== row.storage.package?.id).slice(0, 3).map((pkg) => ({ text: `Assign ${pkg.name}`, onPress: () => changePackage(row.user!.id, pkg) })),
      { text: 'Cancel', style: 'cancel' as const },
    ])
  }

  const doReconcileAll = () => { setBusy(true); void reconcileAllAdminStorage().then((result) => { Alert.alert('Success', `Scanned ${result.scanned || 0}; corrected ${result.corrected || 0}.`); return load() }).catch((error) => Alert.alert('Error', error instanceof Error ? error.message : 'Reconcile failed')).finally(() => setBusy(false)) }
  const styles = useMemo(() => StyleSheet.create({ safe: { flex: 1, backgroundColor: C.background }, content: { padding: Spacing.lg, paddingBottom: Spacing.xxl + 96, gap: Spacing.md }, title: { fontSize: FontSize.xxl, fontWeight: '800', color: C.text }, subtitle: { color: C.muted, fontSize: FontSize.sm, lineHeight: 20 }, kpiRow: { flexDirection: 'row', gap: Spacing.sm }, kpi: { flex: 1, gap: 6 }, kpiLabel: { color: C.muted, fontSize: 11 }, kpiValue: { color: C.text, fontWeight: '800', fontSize: FontSize.lg }, userCard: { gap: 7 }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, userName: { color: C.text, fontWeight: '700', fontSize: FontSize.base, flex: 1 }, meta: { color: C.muted, fontSize: FontSize.xs }, badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full }, badgeText: { fontSize: 10, fontWeight: '800' }, filterChip: { borderWidth: 1, borderColor: C.cardBorder, paddingHorizontal: 10, paddingVertical: 7, borderRadius: Radius.full }, filterText: { color: C.textSecondary, fontSize: 11, fontWeight: '700' } }), [C])
  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background }}><ActivityIndicator size="large" color={C.primary} /></View>
  return <SafeAreaView style={styles.safe} edges={['bottom']}><ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load() }} tintColor={C.primary} />}><View style={{ gap: 4 }}><Text style={styles.title}>Storage Management</Text><Text style={styles.subtitle}>Quota is controlled by active storage packages; reconcile reads actual documents.</Text></View><View style={styles.kpiRow}><Card elevated style={styles.kpi} padding="sm"><Users size={18} color={C.primary} /><Text style={styles.kpiValue}>{overview?.totalUsers || 0}</Text><Text style={styles.kpiLabel}>Users</Text></Card><Card elevated style={styles.kpi} padding="sm"><HardDrive size={18} color={C.accentTeal} /><Text style={styles.kpiValue}>{bytes(overview?.totalUsedBytes || 0)}</Text><Text style={styles.kpiLabel}>Used</Text></Card><Card elevated style={styles.kpi} padding="sm"><HardDrive size={18} color={C.warning} /><Text style={styles.kpiValue}>{overview?.usersAtRisk || 0}</Text><Text style={styles.kpiLabel}>At risk</Text></Card></View><Pressable onPress={doReconcileAll} disabled={busy} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, borderRadius: Radius.md, padding: 12 }}><RefreshCw size={16} color="#fff" /><Text style={{ color: '#fff', fontWeight: '800' }}>Reconcile all users</Text></Pressable><View style={{ gap: Spacing.sm }}><Input placeholder="Search name or email" value={search} onChangeText={setSearch} leftIcon={<Search size={18} color={C.muted} />} /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>{(['', 'OK', 'WARNING', 'CRITICAL', 'FULL'] as const).map((item) => <Pressable key={item || 'ALL'} onPress={() => setStatus(item)} style={[styles.filterChip, status === item && { backgroundColor: C.primaryDim, borderColor: C.primary }]}><Text style={styles.filterText}>{item || 'All'}</Text></Pressable>)}</ScrollView></View>{users.length === 0 ? <Text style={{ color: C.muted, textAlign: 'center', padding: Spacing.xl }}>No storage users found.</Text> : users.map((row) => <Pressable key={row.user?.id} onPress={() => showUserActions(row)}><Card elevated style={styles.userCard} padding="md"><View style={styles.row}><Text style={styles.userName}>{row.user?.fullName || 'Unknown user'}</Text><View style={[styles.badge, { backgroundColor: row.storage.status === 'OK' ? C.successDim : C.warningDim }]}><Text style={[styles.badgeText, { color: row.storage.status === 'OK' ? C.success : C.warning }]}>{row.storage.status}</Text></View></View><Text style={styles.meta}>{row.user?.email}</Text><View style={styles.row}><Text style={styles.meta}>{row.storage.package?.name || 'No package'} · {bytes(row.storage.quotaBytes)}</Text><Text style={{ color: C.text, fontWeight: '700', fontSize: FontSize.sm }}>{row.storage.usagePercent}%</Text></View></Card></Pressable>)}{detail ? <Card elevated style={{ gap: Spacing.sm }}><View style={styles.row}><Text style={{ color: C.text, fontWeight: '800', fontSize: FontSize.lg }}>{detail.user.fullName}</Text><Pressable onPress={() => setDetail(null)}><Text style={{ color: C.primary, fontWeight: '700' }}>Close</Text></Pressable></View><Text style={styles.meta}>{detail.user.email}</Text><Text style={{ color: C.text }}>Used {bytes(detail.storage.usedBytes)} · reserved {bytes(detail.storage.reservedBytes)} · quota {bytes(detail.storage.quotaBytes)}</Text><Text style={{ color: C.muted, fontSize: FontSize.xs }}>Last reconciled: {detail.storage.lastReconciledAt ? new Date(detail.storage.lastReconciledAt).toLocaleString() : 'Never'}</Text><Text style={{ color: C.text, fontWeight: '700', marginTop: 4 }}>Assign package</Text>{packages.filter((pkg) => pkg.isActive).map((pkg) => <Pressable key={pkg.id} onPress={() => changePackage(detail.user.id, pkg)} style={{ borderWidth: 1, borderColor: C.cardBorder, borderRadius: Radius.md, padding: 10 }}><Text style={{ color: C.text, fontWeight: '700' }}>{pkg.name} · {bytes(pkg.capacityBytes)}</Text></Pressable>)}<Pressable onPress={() => showUserActions({ user: detail.user, storage: detail.storage })} style={{ backgroundColor: C.secondary, padding: 11, borderRadius: Radius.md, alignItems: 'center' }}><Text style={{ color: C.text, fontWeight: '700' }}>More actions</Text></Pressable></Card> : null}</ScrollView></SafeAreaView>
}
