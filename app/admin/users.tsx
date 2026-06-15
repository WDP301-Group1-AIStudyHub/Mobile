import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Users, ShieldAlert } from 'lucide-react-native'
import Card from '../../components/ui/Card'
import { FontSize, Spacing, Radius } from '../../constants/colors'
import { useColors } from '../../contexts/ThemeContext'

export default function UsersPage() {
  const C = useColors()
  const [acknowledged, setAcknowledged] = useState(false)

  const styles = StyleSheet.create({
    safe: { flex: 1 },
    content: {
      padding: Spacing.lg,
      paddingBottom: Spacing.xxl,
      gap: Spacing.md,
    },
    pageTitle: { fontSize: FontSize.xxl, fontWeight: '700', color: C.text, letterSpacing: -0.5 },
    pageSubtitle: { fontSize: FontSize.sm, color: C.muted, lineHeight: 20 },
    warningCard: {
      padding: Spacing.lg,
      gap: Spacing.sm,
      borderLeftWidth: 3,
      borderLeftColor: C.warning,
    },
    warningHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    warningTitle: { fontSize: FontSize.base, fontWeight: '700', color: C.text },
    warningBody: { fontSize: FontSize.sm, color: C.muted, lineHeight: 22 },
    infoCard: {
      padding: Spacing.lg,
      gap: Spacing.sm,
    },
    infoTitle: { fontSize: FontSize.base, fontWeight: '700', color: C.text },
    bulletList: { gap: 4 },
    bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    bulletDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: C.primary,
      marginTop: 7,
    },
    bulletText: { flex: 1, fontSize: FontSize.sm, color: C.muted, lineHeight: 20 },
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
  })

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={{ gap: 4 }}>
            <Text style={styles.pageTitle}>User Management</Text>
            <Text style={styles.pageSubtitle}>
              Manage user accounts, roles, and access permissions.
            </Text>
          </View>

          <Card elevated style={styles.warningCard}>
            <View style={styles.warningHeader}>
              <ShieldAlert size={18} color={C.warning} />
              <Text style={styles.warningTitle}>Admin API not available</Text>
            </View>
            <Text style={styles.warningBody}>
              The current backend does not expose endpoints for listing or modifying user
              accounts. This page is read-only until the admin user-management API is added.
            </Text>
          </Card>

          <Card elevated style={styles.infoCard}>
            <View style={styles.warningHeader}>
              <Users size={18} color={C.primary} />
              <Text style={styles.infoTitle}>What will be available</Text>
            </View>
            <View style={styles.bulletList}>
              <View style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>List all registered users with role, status, and last-login info</Text>
              </View>
              <View style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Edit user full name, email, and role</Text>
              </View>
              <View style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Activate / deactivate user accounts</Text>
              </View>
              <View style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>Search and filter by role and status</Text>
              </View>
            </View>
          </Card>

          {!acknowledged && (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Users size={36} color={C.muted} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>No users to display</Text>
              <Text style={styles.emptyDesc}>
                Once the backend exposes the admin user-management endpoints, registered users
                will appear here automatically.
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
  )
}
