import { useEffect, useMemo } from 'react'
import { Tabs, router } from 'expo-router'
import { LayoutDashboard, MessageCircle, User, BarChart2, FileText, FolderOpen } from 'lucide-react-native'
import { View, StyleSheet, Platform, ActivityIndicator } from 'react-native'

import { useColors } from '../../contexts/ThemeContext'
import { useAuth } from '../../hooks/useAuth'

const tabIconStyles = StyleSheet.create({
  iconWrap: {
    width: 40,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    overflow: 'hidden',
  },
  iconWrapActive: {
    width: 40,
    height: 34,
  },
})

function TabIcon({ icon: Icon, focused }: { icon: typeof LayoutDashboard; focused: boolean }) {
  const C = useColors()
  return (
    <View style={[tabIconStyles.iconWrap, focused && tabIconStyles.iconWrapActive]}>
      {focused && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: C.primary, borderRadius: 12 }]} />
      )}
      <Icon
        size={21}
        color={focused ? '#fff' : (C.background === 'transparent' ? '#000000' : C.muted)}
        strokeWidth={focused ? 2.2 : 2.5}
      />
    </View>
  )
}

export default function AppLayout() {
  const C = useColors()
  const { state, signOut } = useAuth()

  // Safety net: if we are still in 'loading' state after 5s, the auth check
  // is hung (e.g. backend unreachable). Force-clear the session and redirect
  // to login so the user is not stuck on a spinner.
  useEffect(() => {
    if (state.status !== 'loading') return
    const t = setTimeout(() => {
      console.warn('[app/_layout] auth loading timeout, forcing unauth')
      signOut()
    }, 5000)
    return () => clearTimeout(t)
  }, [state.status, signOut])

  // Auth guard: redirect to login if not authenticated
  useEffect(() => {
    if (state.status === 'unauthenticated') {
      router.replace('/(auth)/login')
    }
  }, [state.status])

  const styles = useMemo(() => StyleSheet.create({
    tabBar: {
      backgroundColor: C.card,
      borderTopWidth: 1,
      borderTopColor: C.cardBorder,
      height: Platform.OS === 'ios' ? 84 : 72,
      paddingBottom: Platform.OS === 'ios' ? 24 : 12,
      paddingTop: 8,
      shadowColor: C.cardShadowColor,
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
      elevation: 16,
    },
    tabLabel: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.2,
      marginTop: 2,
    },
  }), [C])

  // Don't render tabs until auth state is resolved
  if (state.status !== 'authenticated') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    )
  }

  return (
    <Tabs
      screenOptions={{
        sceneStyle: { backgroundColor: 'transparent' },
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.background === 'transparent' ? '#000000' : C.muted,
      }}
    >
      {/* Documents - shows subjects and their documents */}
      <Tabs.Screen
        name="documents"
        options={{
          title: 'Documents',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={FileText} focused={focused} />
          ),
        }}
      />
      {/* Subjects - manage subjects */}
      <Tabs.Screen
        name="subjects"
        options={{
          title: 'Subjects',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={FolderOpen} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'AI Chat',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={MessageCircle} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={LayoutDashboard} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="benchmarks"
        options={{
          title: 'Benchmarks',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={BarChart2} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={User} focused={focused} />
          ),
        }}
      />
      {/* Hidden screens — not shown in tab bar */}
      <Tabs.Screen
        name="edit-profile"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="change-password"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="document/[id]"
        options={{ href: null }}
      />
    </Tabs>
  )
}
