import { useMemo } from 'react'
import { Tabs, router } from 'expo-router'
import { Activity, FileText, LayoutGrid, ShieldCheck, Users, X } from 'lucide-react-native'
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { FontSize, Spacing, Radius } from '../../constants/colors'
import { useColors } from '../../contexts/ThemeContext'

const adminTabStyles = StyleSheet.create({
  tabIconWrap: {
    width: 38,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

function TabIcon({
  icon: Icon,
  focused,
  color,
}: {
  icon: typeof ShieldCheck
  focused: boolean
  color: string
}) {
  const C = useColors()
  return (
    <View style={[adminTabStyles.tabIconWrap, focused && { backgroundColor: `${color}18` }]}>
      <Icon size={20} color={focused ? color : C.muted} strokeWidth={focused ? 2.2 : 1.7} />
    </View>
  )
}

function AdminHeader() {
  const C = useColors()
  const insets = useSafeAreaInsets()
  const hStyles = useMemo(() => StyleSheet.create({
    adminHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.md,
      backgroundColor: C.background,
      borderBottomWidth: 1,
      borderBottomColor: C.cardBorder,
    },
    adminHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    adminHeaderIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    adminEyebrow: {
      fontSize: FontSize.xs,
      fontWeight: '700',
      color: C.accent,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    adminTitle: {
      fontSize: FontSize.base,
      fontWeight: '800',
      color: C.text,
      letterSpacing: -0.3,
    },
    exitBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: C.cardElevated,
      borderWidth: 1,
      borderColor: C.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
  }), [C])
  return (
    <View style={[hStyles.adminHeader, { paddingTop: insets.top + 8 }]}>
      <View style={hStyles.adminHeaderLeft}>
        <LinearGradient
          colors={['#7c3aed', '#4f63d2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={hStyles.adminHeaderIcon}
        >
          <ShieldCheck size={16} color="#fff" />
        </LinearGradient>
        <View>
          <Text style={hStyles.adminEyebrow}>Admin Panel</Text>
          <Text style={hStyles.adminTitle}>AIStudyHub</Text>
        </View>
      </View>
      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => [hStyles.exitBtn, pressed && { opacity: 0.7 }]}
        hitSlop={8}
      >
        <X size={18} color={C.muted} />
      </Pressable>
    </View>
  )
}

export default function AdminLayout() {
  const C = useColors()

  const styles = useMemo(() => StyleSheet.create({
  tabBar: {
    backgroundColor: C.background,
    borderTopWidth: 1,
    borderTopColor: C.cardBorder,
    height: Platform.OS === 'ios' ? 80 : 62,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    paddingTop: 8,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: -2,
  },
}), [C])

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        header: () => <AdminHeader />,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
        tabBarInactiveTintColor: C.muted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarActiveTintColor: C.accent,
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={LayoutGrid} focused={focused} color={C.accent} />
          ),
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Users',
          tabBarActiveTintColor: C.primary,
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={Users} focused={focused} color={C.primary} />
          ),
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: 'Docs',
          tabBarActiveTintColor: C.accentGold,
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={FileText} focused={focused} color={C.accentGold} />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarActiveTintColor: C.accentTeal,
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={Activity} focused={focused} color={C.accentTeal} />
          ),
        }}
      />
    </Tabs>
  )
}
