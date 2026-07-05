import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import {
  Bell,
  BookOpen,
  ChevronRight,
  Lock,
  LogOut,
  Settings,
  Shield,
  Sparkles,
  Sun,
  User,
} from 'lucide-react-native'
import Card from '../../components/ui/Card'
import ThemeToggle from '../../components/ui/ThemeToggle'
import { FontSize, Spacing, Radius } from '../../constants/colors'
import { useColors, useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../hooks/useAuth'
import { listChatHistory } from '../../services/chatApi'
import { listDocuments } from '../../services/documentApi'
import { listSubjects } from '../../services/subjectApi'

type MenuKey = 'profile' | 'password' | 'notifications' | 'theme' | 'subjects' | 'model' | 'security' | 'settings'

export default function ProfilePage() {
  const { state, signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const C = useColors()
  const { isDark, toggle } = useTheme()
  const [stats, setStats] = useState({ documents: 0, chats: 0, subjects: 0 })

  const user = state.status === 'authenticated' ? state.user : null

  useEffect(() => {
    let active = true
    if (!user || user.role === 'admin') return

    Promise.all([
      listDocuments().catch(() => []),
      listChatHistory().catch(() => ({ histories: [], total: 0 })),
      listSubjects().catch(() => []),
    ]).then(([documents, chats, subjects]) => {
      if (!active) return
      setStats({
        documents: documents.length,
        chats: chats.total || chats.histories.length,
        subjects: subjects.length,
      })
    })

    return () => {
      active = false
    }
  }, [user])
  
  const menuSections = useMemo(() => {
    const sections = [
      {
        title: 'Account',
        items: [
          { icon: User, label: 'Edit Profile', key: 'profile' as MenuKey, color: C.primary },
          { icon: Lock, label: 'Change Password', key: 'password' as MenuKey, color: C.accent },
          { icon: Bell, label: 'Notifications', key: 'notifications' as MenuKey, color: C.accentGold },
        ],
      },
    {
      title: 'Preferences',
      items: [
        { icon: Sun, label: isDark ? 'Light Mode' : 'Dark Mode', key: 'theme' as MenuKey, color: C.info },
        { icon: BookOpen, label: 'My Subjects', key: 'subjects' as MenuKey, color: C.accentTeal },
        { icon: Sparkles, label: 'AI Model', key: 'model' as MenuKey, color: C.accent },
      ],
    },
    {
      title: 'Security',
      items: [
        { icon: Shield, label: 'Privacy & Security', key: 'security' as MenuKey, color: C.error },
        { icon: Settings, label: 'App Settings', key: 'settings' as MenuKey, color: C.muted },
      ],
    }
    ]
    return sections
  }, [C, isDark, user?.role])

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    content: { padding: Spacing.lg, paddingBottom: Spacing.xxl + 96, gap: Spacing.lg },
    pageTitle: { fontSize: FontSize.xxl, fontWeight: '700', color: C.text, letterSpacing: -0.5 },
    profileCard: {
      backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder,
      borderRadius: 20, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    },
    avatarContainer: { flexShrink: 0 },
    avatarRing: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center', padding: 3, backgroundColor: C.primary },
    avatarInner: {
      width: 64, height: 64, borderRadius: 32, backgroundColor: C.primaryDim,
      alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.cardElevated,
    },
    profileInfo: { flex: 1, gap: 3 },
    profileName: { fontSize: FontSize.md, fontWeight: '700', color: C.text },
    profileEmail: { fontSize: FontSize.xs, color: C.muted },
    adminBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    adminBadgeText: { fontSize: FontSize.xs, color: C.warning, fontWeight: '600' },
    editChip: {
      paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: Spacing.md,
      borderWidth: 1, borderColor: C.primary, backgroundColor: C.primaryDim,
    },
    editChipText: { fontSize: FontSize.xs, color: C.primaryLight, fontWeight: '600' },
    statsRow: {
      flexDirection: 'row', backgroundColor: C.card, borderWidth: 1,
      borderColor: C.cardBorder, borderRadius: 16, overflow: 'hidden',
    },
    statItem: {
      flex: 1, alignItems: 'center', paddingVertical: Spacing.md, gap: 4,
    },
    statValue: { fontSize: FontSize.xl, fontWeight: '700', color: C.text },
    statLabel: { fontSize: FontSize.xs, color: C.muted },
    menuSection: { gap: Spacing.sm },
    menuSectionTitle: {
      fontSize: FontSize.xs, fontWeight: '600', color: C.muted,
      textTransform: 'uppercase', letterSpacing: 1, paddingLeft: 4,
    },
    menuCard: { padding: 0, overflow: 'hidden' },
    menuItem: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
      paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    },
    menuItemInner: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1,
    },
    menuIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    menuLabel: { flex: 1, fontSize: FontSize.sm, fontWeight: '500', color: C.text },
    divider: { height: 1, backgroundColor: C.cardBorder, marginLeft: 68 },
    signOutBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
      backgroundColor: C.errorDim, borderWidth: 1, borderColor: C.error, borderRadius: 14, paddingVertical: Spacing.md,
    },
    signOutText: { fontSize: FontSize.sm, fontWeight: '600', color: C.error },
    version: { textAlign: 'center', fontSize: FontSize.xs, color: C.muted },
  }), [C])



  const handleMenuPress = (key: MenuKey) => {
    const basePath = user?.role === 'admin' ? '/admin' : '/(app)'
    if (key === 'profile') {
      router.push(`${basePath}/edit-profile` as any)
    } else if (key === 'password') {
      router.push(`${basePath}/change-password` as any)
    } else if (key === 'theme') {
      toggle()
    } else if (key === 'subjects') {
      if (user?.role !== 'admin') {
        router.push('/(app)/subjects')
      }
    }
  }

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true)
            try {
              await signOut()
            } finally {
              setSigningOut(false)
            }
          },
        },
      ],
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.pageTitle}>Profile</Text>
            <ThemeToggle size={38} />
          </View>

          {/* Avatar & Info */}
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarRing}>
                <View style={styles.avatarInner}>
                  <User size={36} color={C.primary} />
                </View>
              </View>
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {user?.fullName ?? 'Loading...'}
              </Text>
              <Text style={styles.profileEmail}>
                {user?.email ?? ''}
              </Text>
              {user?.role === 'admin' && (
                <View style={styles.adminBadge}>
                  <Shield size={11} color={C.warning} />
                  <Text style={styles.adminBadgeText}>Administrator</Text>
                </View>
              )}
            </View>

            <Pressable style={styles.editChip} onPress={() => router.push('/(app)/edit-profile')}>
              <Text style={styles.editChipText}>Edit</Text>
            </Pressable>
          </View>

          {/* Stats Row - Only for normal users */}
          {user?.role !== 'admin' && (
            <View style={styles.statsRow}>
              {[
                { label: 'Documents', value: String(stats.documents) },
                { label: 'Chats', value: String(stats.chats) },
                { label: 'Subjects', value: String(stats.subjects) },
              ].map((s, idx) => (
                <View
                  key={s.label}
                  style={[
                    styles.statItem,
                    idx < 2 && { borderRightWidth: 1, borderRightColor: C.cardBorder },
                  ]}
                >
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Menu Sections */}
          {menuSections.map((section) => (
            <View key={section.title} style={styles.menuSection}>
              <Text style={styles.menuSectionTitle}>{section.title}</Text>
              <Card style={styles.menuCard}>
                {section.items.map((item, i) => (
                  <View key={item.key}>
                    <Pressable style={styles.menuItem} onPress={() => handleMenuPress(item.key)}>
                      {({ pressed }) => (
                        <View style={[styles.menuItemInner, pressed && { opacity: 0.7 }]}>
                          <View style={[styles.menuIconWrap, { backgroundColor: `${item.color}14` }]}>
                            <item.icon size={18} color={item.color} />
                          </View>
                          <Text style={styles.menuLabel}>{item.label}</Text>
                          <ChevronRight size={16} color={C.muted} />
                        </View>
                      )}
                    </Pressable>
                    {i < section.items.length - 1 && (
                      <View style={styles.divider} />
                    )}
                  </View>
                ))}
              </Card>
            </View>
          ))}

          {/* Sign Out */}
          <Pressable
            onPress={handleSignOut}
            disabled={signingOut}
            style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.7 }]}
          >
            <LogOut size={18} color={C.error} />
            <Text style={styles.signOutText}>
              {signingOut ? 'Signing out...' : 'Sign Out'}
            </Text>
          </Pressable>

          <Text style={styles.version}>AI Study Hub v1.0.0</Text>
        </ScrollView>
      </SafeAreaView>
  )
}
