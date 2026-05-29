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
import { ArrowLeft, Mail } from 'lucide-react-native'
import VideoBg from '../../components/ui/VideoBg'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import BrandLogo from '../../components/ui/BrandLogo'
import { FontSize, Spacing, Radius } from '../../constants/colors'
import { useColors } from '../../contexts/ThemeContext'
import { forgotPassword } from '../../services/authApi'

export default function ForgotPasswordPage() {
  const C = useColors()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!email) {
      setError('Please enter your email address.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await forgotPassword({ email })
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
    color: C.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '500',
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
    textAlign: 'center',
    maxWidth: 260,
  },
  card: {
    backgroundColor: C.cardElevated,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: Spacing.lg,
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
  successBox: {
    backgroundColor: C.successDim,
    borderWidth: 1,
    borderColor: C.success,
    borderRadius: 10,
    padding: Spacing.md,
  },
  successText: {
    color: C.success,
    fontSize: FontSize.sm,
    textAlign: 'center',
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  footerLink: {
    color: C.primary,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
}), [C])

  return (
    <VideoBg>
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
              <ArrowLeft size={20} color={C.textSecondary} />
              <Text style={styles.backText}>Back</Text>
            </Pressable>

            <View style={styles.logoRow}>
              <BrandLogo size={40} textSize={20} />
            </View>

            <View style={styles.header}>
              <Text style={styles.title}>Forgot Password</Text>
              <Text style={styles.subtitle}>
                Enter your email and we'll send you a reset link
              </Text>
            </View>

            <View style={styles.card}>
              {success ? (
                <View style={styles.successBox}>
                  <Text style={styles.successText}>
                    ✓ Reset link sent! Check your inbox.
                  </Text>
                </View>
              ) : (
                <>
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
                    value={email}
                    onChangeText={setEmail}
                    leftIcon={<Mail size={18} color={C.muted} />}
                    editable={!loading}
                  />

                  <Button
                    title="Send Reset Link"
                    loading={loading}
                    onPress={handleSubmit}
                    fullWidth
                    style={{ marginTop: Spacing.xl }}
                  />
                </>
              )}
            </View>

            <View style={styles.footer}>
              <Pressable onPress={() => router.push('/(auth)/login')}>
                <Text style={styles.footerLink}>Back to sign in</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </VideoBg>
  )
}