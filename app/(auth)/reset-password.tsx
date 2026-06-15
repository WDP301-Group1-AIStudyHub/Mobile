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
import { ArrowLeft, Eye, EyeOff, Lock } from 'lucide-react-native'
import BrandLogo from '../../components/ui/BrandLogo'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { FontSize, Spacing } from '../../constants/colors'
import { useColors } from '../../contexts/ThemeContext'
import { resetPassword } from '../../services/authApi'

export default function ResetPasswordPage() {
  const C = useColors()
  const { token } = useLocalSearchParams<{ token?: string }>()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!password || !confirmPassword) {
      setError('Please fill in all fields.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (!token) {
      setError('Invalid or missing reset token. Please request a new link.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await resetPassword({ token, password })
      setSuccess(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
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
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.xl,
    alignSelf: 'flex-start',
  },
  backText: {
    color: C.mutedLight,
    fontSize: 13,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    gap: 10,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.primaryDim,
    borderWidth: 1,
    borderColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text,
    letterSpacing: 0.5,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: C.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: C.muted,
    marginTop: 6,
    textAlign: 'center',
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: Spacing.lg,
  },
  fields: {
    gap: Spacing.md,
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
    fontSize: 13,
    textAlign: 'center',
  },
  successBox: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  successIcon: {
    fontSize: 32,
    color: C.success,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text,
  },
  successText: {
    fontSize: 13,
    color: C.mutedLight,
    textAlign: 'center',
  },
  loginBtn: {
    marginTop: Spacing.md,
    backgroundColor: C.primaryDim,
    borderWidth: 1,
    borderColor: C.primary,
    borderRadius: 12,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  loginBtnText: {
    color: C.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  footerLink: {
    color: C.primaryLight,
    fontSize: 13,
    fontWeight: '600',
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
            <Pressable onPress={() => router.back()} style={styles.back}>
              <ArrowLeft size={20} color={C.mutedLight} />
              <Text style={styles.backText}>Back</Text>
            </Pressable>

            <View style={styles.logoRow}>
              <BrandLogo size={40} textSize={20} />
            </View>

            <View style={styles.header}>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>
                Enter your new password below
              </Text>
            </View>

            <View style={styles.card}>
              {success ? (
                <View style={styles.successBox}>
                  <Text style={styles.successIcon}>✓</Text>
                  <Text style={styles.successTitle}>Password Reset!</Text>
                  <Text style={styles.successText}>
                    Your password has been updated successfully.
                  </Text>
                  <Pressable
                    onPress={() => router.replace('/(auth)/login')}
                    style={styles.loginBtn}
                  >
                    <Text style={styles.loginBtnText}>Back to Sign In</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  {error ? (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  ) : null}

                  <View style={styles.fields}>
                    <Input
                      label="New Password"
                      placeholder="Min. 8 characters"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      value={password}
                      onChangeText={setPassword}
                      leftIcon={<Lock size={18} color={C.muted} />}
                      rightIcon={
                        showPassword
                          ? <EyeOff size={18} color={C.muted} />
                          : <Eye size={18} color={C.muted} />
                      }
                      onRightIconPress={() => setShowPassword((v) => !v)}
                      editable={!loading}
                    />

                    <Input
                      label="Confirm Password"
                      placeholder="Repeat new password"
                      secureTextEntry={!showConfirm}
                      autoCapitalize="none"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      leftIcon={<Lock size={18} color={C.muted} />}
                      rightIcon={
                        showConfirm
                          ? <EyeOff size={18} color={C.muted} />
                          : <Eye size={18} color={C.muted} />
                      }
                      onRightIconPress={() => setShowConfirm((v) => !v)}
                      editable={!loading}
                    />
                  </View>

                  <Button
                    title="Reset Password"
                    loading={loading}
                    onPress={handleSubmit}
                    fullWidth
                    style={{ marginTop: Spacing.xl }}
                  />
                </>
              )}
            </View>

            {!success && (
              <View style={styles.footer}>
                <Pressable onPress={() => router.push('/(auth)/login')}>
                  <Text style={styles.footerLink}>Back to sign in</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
  )
}