import { useEffect, useState, useMemo, useCallback } from 'react'
import { ScrollView, StyleSheet, Text, View, Pressable, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Users, Ban, CheckCircle, ShieldAlert, MoreVertical, Search } from 'lucide-react-native'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import { FontSize, Spacing, Radius } from '../../constants/colors'
import { useColors } from '../../contexts/ThemeContext'
import { listAdminUsers, banUser, unbanUser } from '../../services/adminApi'
import type { AdminUser } from '../../types/admin'

export default function UsersPage() {
  const C = useColors()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return users
    return users.filter(
      (u) =>
        (u.fullName || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
    )
  }, [users, search])

  const fetchUsers = useCallback(async () => {
    try {
      const data = await listAdminUsers()
      setUsers(data)
    } catch (error) {
      console.error('Failed to fetch users', error)
      Alert.alert('Error', 'Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleBan = (user: AdminUser) => {
    Alert.prompt(
      'Ban User',
      `Enter reason for banning ${user.email}:`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Ban', 
          style: 'destructive',
          onPress: async (reason?: string) => {
            if (!reason) {
              Alert.alert('Error', 'Reason is required')
              return
            }
            try {
              setActionLoadingId(user.id)
              await banUser(user.id, reason)
              await fetchUsers()
            } catch (error) {
              Alert.alert('Error', 'Failed to ban user')
            } finally {
              setActionLoadingId(null)
            }
          }
        }
      ]
    )
  }

  const handleUnban = (user: AdminUser) => {
    Alert.alert(
      'Unban User',
      `Are you sure you want to unban ${user.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unban',
          style: 'default',
          onPress: async () => {
            try {
              setActionLoadingId(user.id)
              await unbanUser(user.id)
              await fetchUsers()
            } catch (error) {
              Alert.alert('Error', 'Failed to unban user')
            } finally {
              setActionLoadingId(null)
            }
          }
        }
      ]
    )
  }

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1 },
    content: {
      padding: Spacing.lg,
      paddingBottom: Spacing.xxl + 40,
      gap: Spacing.md,
    },
    pageTitle: { fontSize: FontSize.xxl, fontWeight: '700', color: C.text, letterSpacing: -0.5 },
    pageSubtitle: { fontSize: FontSize.sm, color: C.muted, lineHeight: 20 },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    userCard: {
      padding: Spacing.md,
      gap: Spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: C.primaryDim,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: FontSize.lg,
      fontWeight: '700',
      color: C.primary,
    },
    userInfo: {
      flex: 1,
      gap: 2,
    },
    userName: {
      fontSize: FontSize.base,
      fontWeight: '700',
      color: C.text,
    },
    userEmail: {
      fontSize: FontSize.sm,
      color: C.muted,
    },
    badgeRow: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 4,
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
    actionBtn: {
      width: 40,
      height: 40,
      borderRadius: Radius.md,
      backgroundColor: C.cardElevated,
      alignItems: 'center',
      justifyContent: 'center',
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
  }), [C])

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 4, marginBottom: Spacing.sm }}>
          <Text style={styles.pageTitle}>User Management</Text>
          <Text style={styles.pageSubtitle}>
            Manage user accounts, roles, and access permissions.
          </Text>
        </View>

        <View style={styles.searchWrap}>
          <View style={{ flex: 1 }}>
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChangeText={setSearch}
              leftIcon={<Search size={18} color={C.muted} />}
            />
          </View>
        </View>

        {filteredUsers.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Users size={36} color={C.muted} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>No users found</Text>
            {search ? (
              <Text style={{ fontSize: FontSize.sm, color: C.muted, textAlign: 'center' }}>
                Try a different search term.
              </Text>
            ) : null}
          </View>
        ) : (
          filteredUsers.map(user => (
            <Card elevated key={user.id} style={styles.userCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user.fullName ? user.fullName[0].toUpperCase() : 'U'}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.fullName || 'No Name'}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, { backgroundColor: user.role === 'admin' ? C.accentGoldDim : C.primaryDim }]}>
                    <Text style={[styles.badgeText, { color: user.role === 'admin' ? C.accentGold : C.primary }]}>{user.role}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: user.isActive ? C.successDim : C.errorDim }]}>
                    <Text style={[styles.badgeText, { color: user.isActive ? C.success : C.error }]}>{user.isActive ? 'ACTIVE' : 'BANNED'}</Text>
                  </View>
                </View>
              </View>
              <Pressable
                style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
                onPress={() => user.isActive ? handleBan(user) : handleUnban(user)}
                disabled={actionLoadingId === user.id}
              >
                {actionLoadingId === user.id ? (
                  <ActivityIndicator size="small" color={C.textSecondary} />
                ) : user.isActive ? (
                  <Ban size={20} color={C.error} />
                ) : (
                  <CheckCircle size={20} color={C.success} />
                )}
              </Pressable>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
