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
import { ArrowLeft, Check, Eye, EyeOff, Lock } from 'lucide-react-native'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { FontSize, Spacing, Radius } from '../../constants/colors'
import { useColors } from '../../contexts/ThemeContext'
import { changePassword } from '../../services/authApi'

export default function ChangePasswordPage() {
  const C = useColors()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all fields.')
      return
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }
    if (newPassword === currentPassword) {
      setError('New password must differ from your current password.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await changePassword({ currentPassword, newPassword })
      setSuccess(true)
      setTimeout(() => router.back(), 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }


  const styles = useMemo(() => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl + 96,
    gap: Spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: C.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: C.text,
    letterSpacing: -0.3,
  },
  iconSection: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.cardShadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  iconSubtitle: {
    fontSize: FontSize.sm,
    color: C.muted,
    textAlign: 'center',
    maxWidth: 260,
  },
  card: {
    backgroundColor: C.cardElevated,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: Spacing.lg,
    shadowColor: C.cardShadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  fields: {
    gap: Spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: C.cardBorder,
    marginVertical: Spacing.xs,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  strengthBar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: FontSize.xs,
    color: C.muted,
    marginLeft: Spacing.xs,
    minWidth: 50,
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
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  successIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.successDim,
    borderWidth: 1,
    borderColor: C.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: C.success,
  },
  successText: {
    fontSize: FontSize.sm,
    color: C.mutedLight,
    textAlign: 'center',
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
            {/* Header */}
            <View style={styles.topBar}>
              <Pressable onPress={() => router.back()} style={styles.backBtn}>
                <ArrowLeft size={20} color={C.primary} />
              </Pressable>
              <Text style={styles.pageTitle}>Change Password</Text>
              <View style={{ width: 36 }} />
            </View>

            {/* Icon */}
            <View style={styles.iconSection}>
              <View style={[styles.iconWrap, { backgroundColor: C.primary }]} >
                <Lock size={28} color="#fff" />
              </View>
              <Text style={styles.iconSubtitle}>
                Choose a strong password with at least 8 characters.
              </Text>
            </View>

            {/* Form */}
            <View style={styles.card}>
              {success ? (
                <View style={styles.successBox}>
                  <View style={styles.successIconWrap}>
                    <Check size={24} color={C.success} />
                  </View>
                  <Text style={styles.successTitle}>Password Changed!</Text>
                  <Text style={styles.successText}>
                    Your password has been updated successfully.
                  </Text>
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
                      label="Current Password"
                      placeholder="Enter current password"
                      secureTextEntry={!showCurrent}
                      autoCapitalize="none"
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      leftIcon={<Lock size={18} color={C.muted} />}
                      rightIcon={
                        showCurrent
                          ? <EyeOff size={18} color={C.muted} />
                          : <Eye size={18} color={C.muted} />
                      }
                      onRightIconPress={() => setShowCurrent((v) => !v)}
                      editable={!loading}
                    />

                    <View style={styles.divider} />

                    <Input
                      label="New Password"
                      placeholder="Min. 8 characters"
                      secureTextEntry={!showNew}
                      autoCapitalize="none"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      leftIcon={<Lock size={18} color={C.muted} />}
                      rightIcon={
                        showNew
                          ? <EyeOff size={18} color={C.muted} />
                          : <Eye size={18} color={C.muted} />
                      }
                      onRightIconPress={() => setShowNew((v) => !v)}
                      editable={!loading}
                    />

                    <Input
                      label="Confirm New Password"
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

                  {/* Strength hint */}
                  {newPassword.length > 0 && (
                    <View style={styles.strengthRow}>
                      {[1, 2, 3, 4].map((i) => (
                        <View
                          key={i}
                          style={[
                            styles.strengthBar,
                            {
                              backgroundColor:
                                newPassword.length >= i * 3
                                  ? newPassword.length >= 12
                                    ? C.success
                                    : newPassword.length >= 8
                                    ? C.warning
                                    : C.error
                                  : C.cardBorder,
                            },
                          ]}
                        />
                      ))}
                      <Text style={styles.strengthLabel}>
                        {newPassword.length < 8
                          ? 'Too short'
                          : newPassword.length < 12
                          ? 'Fair'
                          : 'Strong'}
                      </Text>
                    </View>
                  )}

                  <Button
                    title="Update Password"
                    loading={loading}
                    onPress={handleSubmit}
                    fullWidth
                    style={{ marginTop: Spacing.xl }}
                  />
                </>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
  )
}
