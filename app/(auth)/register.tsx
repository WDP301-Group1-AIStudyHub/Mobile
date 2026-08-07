import { useMemo, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react-native'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import BrandLogo from '../../components/ui/BrandLogo'
import { FontSize, Spacing, Radius } from '../../constants/colors'
import { useColors } from '../../contexts/ThemeContext'
import { useAuth } from '../../hooks/useAuth'
import { register } from '../../services/authApi'

export default function RegisterPage() {
  const C = useColors()
  const { signIn } = useAuth()
  const params = useLocalSearchParams<{ email?: string; invite?: string }>()
  const invitedEmail = typeof params.email === 'string' ? params.email.trim() : ''
  const inviteToken = typeof params.invite === 'string' ? params.invite.trim() : ''
  const [form, setForm] = useState({ fullName: '', email: invitedEmail, password: '', confirm: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!form.fullName || !form.email || !form.password) {
      setError('Please fill in all fields.')
      return
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const result = await register({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        inviteToken: inviteToken || undefined,
      })
      signIn(result.user)
      router.replace(
        result.redirectDocumentId
          ? (`/(app)/document/${result.redirectDocumentId}` as any)
          : '/(app)/dashboard',
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to create account.')
    } finally {
      setLoading(false)
    }
  }


  const styles = useMemo(() => StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    justifyContent: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    gap: 10,
  },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoText: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: C.text,
    letterSpacing: 0.5,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: C.text,
    letterSpacing: 0,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: C.muted,
    marginTop: 6,
  },
  card: {
    backgroundColor: C.cardElevated,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: Spacing.lg,
  },
  errorBox: {
    backgroundColor: C.errorDim,
    borderWidth: 1,
    borderColor: C.error,
    borderRadius: 10,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  errorText: {
    color: C.error,
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  footerText: {
    color: C.muted,
    fontSize: FontSize.sm,
  },
  footerLink: {
    color: C.primary,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
}), [C])

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Logo */}
            <View style={styles.logoRow}>
              <BrandLogo size={40} textSize={20} />
            </View>

            <View style={styles.header}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join your scholarly universe today</Text>
            </View>

            <View style={styles.card}>
              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Input
                label="Full Name"
                placeholder="Your Name"
                autoCapitalize="words"
                autoComplete="name"
                value={form.fullName}
                onChangeText={(v) => setForm((f) => ({ ...f, fullName: v }))}
                leftIcon={<User size={18} color={C.muted} />}
                editable={!loading && !invitedEmail}
                hint={invitedEmail ? 'Use the email address that received this invitation.' : undefined}
              />

              <Input
                label="Email Address"
                placeholder="you@university.edu"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={form.email}
                onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
                leftIcon={<Mail size={18} color={C.muted} />}
                containerStyle={{ marginTop: Spacing.md }}
                editable={!loading}
              />

              <Input
                label="Password"
                placeholder="Min. 8 characters"
                secureTextEntry={!showPassword}
                value={form.password}
                onChangeText={(v) => setForm((f) => ({ ...f, password: v }))}
                leftIcon={<Lock size={18} color={C.muted} />}
                rightIcon={
                  showPassword
                    ? <Eye size={18} color={C.muted} />
                    : <EyeOff size={18} color={C.muted} />
                }
                onRightIconPress={() => setShowPassword((s) => !s)}
                containerStyle={{ marginTop: Spacing.md }}
                editable={!loading}
              />

              <Input
                label="Confirm Password"
                placeholder="Re-enter password"
                secureTextEntry={!showPassword}
                value={form.confirm}
                onChangeText={(v) => setForm((f) => ({ ...f, confirm: v }))}
                leftIcon={<Lock size={18} color={C.muted} />}
                containerStyle={{ marginTop: Spacing.md }}
                editable={!loading}
              />

              <Button
                title="Create Account"
                loading={loading}
                onPress={handleSubmit}
                fullWidth
                style={{ marginTop: Spacing.xl }}
              />
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/(auth)/login',
                    params: invitedEmail ? { email: invitedEmail } : undefined,
                  })
                }
              >
                <Text style={styles.footerLink}>Sign in</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
  )
}
