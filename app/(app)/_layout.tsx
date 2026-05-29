import { useMemo } from 'react'
import { Tabs } from 'expo-router'
import { LayoutDashboard, BookOpen, MessageCircle, User } from 'lucide-react-native'
import { View, StyleSheet, Platform } from 'react-native'

import { useColors, useTheme } from '../../contexts/ThemeContext'
import { LinearGradient } from 'expo-linear-gradient'

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
        <LinearGradient
          colors={C.gradientPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 12 }]}
        />
      )}
      <Icon
        size={21}
        color={focused ? '#fff' : C.muted}
        strokeWidth={focused ? 2.2 : 1.8}
      />
    </View>
  )
}

export default function AppLayout() {
  const C = useColors()
  const { isDark } = useTheme()

  const styles = useMemo(() => StyleSheet.create({
  tabBar: {
    backgroundColor: isDark ? 'rgba(10,14,26,0.82)' : 'rgba(255,255,252,0.90)',
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
    fontWeight: '600',
    letterSpacing: 0.2,
    marginTop: 2,
  },
}), [C, isDark])

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.muted,
      }}
    >
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
        name="chat"
        options={{
          title: 'AI Chat',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={MessageCircle} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={BookOpen} focused={focused} />
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
    </Tabs>
  )
}