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
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react-native'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import BrandLogo from '../../components/ui/BrandLogo'
import { FontSize, Spacing, Radius } from '../../constants/colors'
import { useColors } from '../../contexts/ThemeContext'
import { login } from '../../services/authApi'

export default function LoginPage() {
  const C = useColors()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!form.email || !form.password) {
      setError('Please fill in all fields.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await login({ email: form.email, password: form.password })
      router.replace('/(app)/dashboard')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to sign in.')
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
    marginBottom: Spacing.xxl,
    gap: 10,
  },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
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
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: C.muted,
    marginTop: 6,
  },
  card: {
    backgroundColor: C.cardElevated,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: Spacing.lg,
    gap: 0,
    shadowColor: C.cardShadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
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
  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  forgotText: {
    fontSize: FontSize.sm,
    color: C.primary,
    fontWeight: '500',
  },
  submitBtn: {
    marginTop: Spacing.xs,
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

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>
                Sign in to your scholarly universe
              </Text>
            </View>

            {/* Card */}
            <View style={styles.card}>
              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Input
                label="Email Address"
                placeholder="you@university.edu"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={form.email}
                onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
                leftIcon={<Mail size={18} color={C.muted} />}
                editable={!loading}
              />

              <Input
                label="Password"
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                autoComplete="password"
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

              <Pressable
                onPress={() => router.push('/(auth)/forgot-password')}
                style={styles.forgotRow}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Pressable>

              <Button
                title="Sign In"
                loading={loading}
                onPress={handleSubmit}
                fullWidth
                style={styles.submitBtn}
              />
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <Pressable onPress={() => router.push('/(auth)/register')}>
                <Text style={styles.footerLink}>Sign up</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
  )
}