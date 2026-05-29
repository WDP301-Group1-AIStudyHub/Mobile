import { useState, useMemo } from 'react'
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  FileText,
  Search,
  Users,
  X,
} from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import VideoBg from '../../components/ui/VideoBg'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import { FontSize, Spacing, Radius } from '../../constants/colors'
import { useColors } from '../../contexts/ThemeContext'

type UserRole = 'admin' | 'user'
type UserStatus = 'active' | 'inactive'
type MockUser = {
  id: string
  name: string
  email: string
  role: UserRole
  status: UserStatus
  docs: number
  lastLogin: string
  avatar: string
}

const INITIAL_USERS: MockUser[] = [
  { id: '1', name: 'Sarah Chen', email: 'sarah.chen@edu.vn', role: 'admin', status: 'active', docs: 14, lastLogin: '2 min ago', avatar: 'SC' },
  { id: '2', name: 'Marcus Williams', email: 'marcus.w@edu.vn', role: 'user', status: 'active', docs: 7, lastLogin: '1h ago', avatar: 'MW' },
  { id: '3', name: 'Priya Patel', email: 'priya.p@edu.vn', role: 'user', status: 'active', docs: 23, lastLogin: '3h ago', avatar: 'PP' },
  { id: '4', name: 'David Kim', email: 'david.kim@edu.vn', role: 'user', status: 'inactive', docs: 5, lastLogin: '5 days ago', avatar: 'DK' },
  { id: '5', name: 'Emma Thompson', email: 'emma.t@edu.vn', role: 'user', status: 'active', docs: 11, lastLogin: '30 min ago', avatar: 'ET' },
  { id: '6', name: 'James Rodriguez', email: 'james.r@edu.vn', role: 'admin', status: 'active', docs: 18, lastLogin: '1 day ago', avatar: 'JR' },
  { id: '7', name: 'Lin Zhao', email: 'lin.zhao@edu.vn', role: 'user', status: 'inactive', docs: 2, lastLogin: '2 weeks ago', avatar: 'LZ' },
]

const ROLE_FILTERS: Array<UserRole | 'all'> = ['all', 'admin', 'user']
const STATUS_FILTERS: Array<UserStatus | 'all'> = ['all', 'active', 'inactive']

export default function UsersPage() {
  const C = useColors()
  const [users, setUsers] = useState<MockUser[]>(INITIAL_USERS)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all')

  const [editVisible, setEditVisible] = useState(false)
  const [editUser, setEditUser] = useState<MockUser | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRole, setEditRole] = useState<UserRole>('user')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return users.filter((u) => {
      const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      const matchRole = roleFilter === 'all' || u.role === roleFilter
      const matchStatus = statusFilter === 'all' || u.status === statusFilter
      return matchSearch && matchRole && matchStatus
    })
  }, [users, search, roleFilter, statusFilter])

  const openEdit = (u: MockUser) => {
    setEditUser(u)
    setEditName(u.name)
    setEditEmail(u.email)
    setEditRole(u.role)
    setEditVisible(true)
  }

  const saveEdit = () => {
    if (!editUser) return
    if (!editName.trim()) { Alert.alert('Validation', 'Full name is required.'); return }
    setUsers((prev) =>
      prev.map((u) =>
        u.id === editUser.id ? { ...u, name: editName.trim(), email: editEmail.trim(), role: editRole } : u,
      ),
    )
    setEditVisible(false)
  }

  const toggleStatus = (id: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' } : u,
      ),
    )
  }

  const renderUser = ({ item }: { item: MockUser }) => (
    <Card elevated style={styles.userCard} padding="md">
      <View style={styles.userTop}>
        {/* Avatar */}
        <View style={[styles.avatar, item.status === 'active' ? styles.avatarActive : styles.avatarInactive]}>
          <Text style={styles.avatarText}>{item.avatar}</Text>
        </View>

        {/* Info */}
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.roleBadge, item.role === 'admin' ? styles.roleBadgeAdmin : styles.roleBadgeUser]}>
              <Text style={[styles.roleBadgeText, item.role === 'admin' ? styles.roleBadgeTextAdmin : styles.roleBadgeTextUser]}>
                {item.role === 'admin' ? 'Admin' : 'User'}
              </Text>
            </View>
            <View style={[styles.statusBadge, item.status === 'active' ? styles.statusActive : styles.statusInactive]}>
              <Text style={[styles.statusBadgeText, item.status === 'active' ? styles.statusActiveText : styles.statusInactiveText]}>
                {item.status === 'active' ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Meta */}
      <View style={styles.userMeta}>
        <View style={styles.metaItem}>
          <FileText size={12} color={C.muted} />
          <Text style={styles.metaText}>{item.docs} docs</Text>
        </View>
        <Text style={styles.metaSep}>·</Text>
        <Text style={styles.metaText}>Last login: {item.lastLogin}</Text>
      </View>

      {/* Actions */}
      <View style={styles.actionRow}>
        <Pressable
          onPress={() => openEdit(item)}
          style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.editBtnText}>Edit</Text>
        </Pressable>
        <Pressable
          onPress={() => toggleStatus(item.id)}
          style={({ pressed }) => [
            styles.toggleBtn,
            item.status === 'active' ? styles.deactivateBtn : styles.activateBtn,
            pressed && { opacity: 0.75 },
          ]}
        >
          <Text style={[styles.toggleBtnText, item.status === 'active' ? styles.deactivateBtnText : styles.activateBtnText]}>
            {item.status === 'active' ? 'Deactivate' : 'Activate'}
          </Text>
        </Pressable>
      </View>
    </Card>
  )


  const styles = useMemo(() => StyleSheet.create({
  safe: { flex: 1 },
  searchWrap: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  filtersRow: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: 6,
    alignItems: 'center',
    flexDirection: 'row',
  },
  filterGroupLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: C.muted,
    marginRight: 2,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
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
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: C.cardBorder,
    marginHorizontal: 4,
  },
  list: {
    padding: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: Spacing.xxl + 16,
  },
  userCard: { gap: Spacing.sm },
  userTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primaryDim,
    borderWidth: 2,
    flexShrink: 0,
  },
  avatarActive: {
    borderColor: C.accentTeal,
    shadowColor: C.accentTeal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarInactive: {
    borderColor: C.cardBorder,
  },
  avatarText: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: C.primary,
  },
  userInfo: { flex: 1, gap: 3 },
  userName: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: C.text,
  },
  userEmail: {
    fontSize: FontSize.xs,
    color: C.muted,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  roleBadgeAdmin: {
    backgroundColor: 'rgba(217,119,6,0.12)',
  },
  roleBadgeUser: {
    backgroundColor: C.primaryDim,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  roleBadgeTextAdmin: { color: C.accentGold },
  roleBadgeTextUser: { color: C.primary },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  statusActive: { backgroundColor: C.successDim },
  statusInactive: { backgroundColor: C.errorDim },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusActiveText: { color: C.success },
  statusInactiveText: { color: C.error },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: C.cardBorder,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: FontSize.xs,
    color: C.muted,
  },
  metaSep: {
    color: C.cardBorder,
    fontSize: FontSize.xs,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  editBtn: {
    flex: 1,
    height: 36,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: C.primary,
  },
  toggleBtn: {
    flex: 1,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deactivateBtn: {
    backgroundColor: C.errorDim,
    borderWidth: 1,
    borderColor: `${C.error}30`,
  },
  activateBtn: {
    backgroundColor: C.successDim,
    borderWidth: 1,
    borderColor: `${C.success}30`,
  },
  toggleBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  deactivateBtnText: { color: C.error },
  activateBtnText: { color: C.success },
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
  },
  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10,14,26,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.background,
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
  roleSelector: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  roleChip: {
    flex: 1,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: C.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.cardElevated,
  },
  roleChipActive: {
    borderColor: C.primary,
    backgroundColor: C.primaryDim,
  },
  roleChipText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: C.muted,
  },
  roleChipTextActive: {
    color: C.primary,
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
  saveBtn: {},
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
    <VideoBg>
      <SafeAreaView style={styles.safe}>
        {/* Search */}
        <View style={styles.searchWrap}>
          <Input
            placeholder="Search users by name or email"
            value={search}
            onChangeText={setSearch}
            leftIcon={<Search size={16} color={C.muted} />}
          />
        </View>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          <Text style={styles.filterGroupLabel}>Role:</Text>
          {ROLE_FILTERS.map((f) => (
            <Pressable
              key={f}
              onPress={() => setRoleFilter(f)}
              style={[styles.chip, roleFilter === f && styles.chipActive]}
            >
              <Text style={[styles.chipText, roleFilter === f && styles.chipTextActive]}>
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </Pressable>
          ))}
          <View style={styles.filterDivider} />
          <Text style={styles.filterGroupLabel}>Status:</Text>
          {STATUS_FILTERS.map((f) => (
            <Pressable
              key={f}
              onPress={() => setStatusFilter(f)}
              style={[styles.chip, statusFilter === f && styles.chipActive]}
            >
              <Text style={[styles.chipText, statusFilter === f && styles.chipTextActive]}>
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* List */}
        <FlatList
          data={filtered}
          keyExtractor={(u) => u.id}
          renderItem={renderUser}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Users size={32} color={C.muted} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>No users match the current filters.</Text>
            </View>
          }
        />
      </SafeAreaView>

      {/* Edit Bottom Sheet */}
      <Modal
        visible={editVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setEditVisible(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Edit User</Text>
              <Pressable onPress={() => setEditVisible(false)} hitSlop={8}>
                <X size={20} color={C.muted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Full Name <Text style={styles.req}>*</Text></Text>
                <TextInput
                  style={styles.textField}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Full name"
                  placeholderTextColor={C.muted}
                  returnKeyType="next"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Email</Text>
                <TextInput
                  style={styles.textField}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder="Email address"
                  placeholderTextColor={C.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Role</Text>
                <View style={styles.roleSelector}>
                  {(['user', 'admin'] as UserRole[]).map((r) => (
                    <Pressable
                      key={r}
                      onPress={() => setEditRole(r)}
                      style={[styles.roleChip, editRole === r && styles.roleChipActive]}
                    >
                      <Text style={[styles.roleChipText, editRole === r && styles.roleChipTextActive]}>
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
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
                style={[styles.sheetBtn, styles.saveBtn]}
              >
                <LinearGradient
                  colors={C.gradientPrimary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.saveBtnGrad}
                >
                  <Text style={styles.saveBtnText}>Save</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </VideoBg>
  )
}