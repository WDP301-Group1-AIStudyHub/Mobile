import { useMemo, useEffect, useState } from 'react'
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
import { ArrowLeft, Camera, Check, User } from 'lucide-react-native'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { FontSize, Spacing, Radius } from '../../constants/colors'
import { useColors } from '../../contexts/ThemeContext'
import { updateProfile } from '../../services/authApi'
import { storeAuthSession, getStoredToken } from '../../services/authStorage'
import { useAuth } from '../../hooks/useAuth'

export default function EditProfilePage() {
  const C = useColors()
  const { state } = useAuth()
  const user = state.status === 'authenticated' ? state.user : null

  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setFullName(user?.fullName ?? '')
  }, [user?.fullName])

  const handleSave = async () => {
    const trimmed = fullName.trim()
    if (!trimmed) {
      setError('Full name is required.')
      return
    }
    if (trimmed.length > 100) {
      setError('Full name must be 100 characters or fewer.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const updated = await updateProfile({ fullName: trimmed })
      // Persist updated user while keeping the existing token
      const token = await getStoredToken()
      if (token) {
        await storeAuthSession(token, updated)
      }
      setSuccess(true)
      setTimeout(() => router.back(), 1200)
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
    borderRadius: 10,
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
  avatarSection: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: C.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  cameraBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -16,
    borderWidth: 2,
    borderColor: C.background,
  },
  avatarHint: {
    fontSize: FontSize.xs,
    color: C.muted,
    marginTop: 2,
  },
  card: {
    backgroundColor: C.cardElevated,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: Spacing.lg,
    shadowColor: C.cardShadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 4,
  },
  fields: {
    gap: Spacing.md,
  },
  readonlyField: {
    gap: 6,
  },
  readonlyLabel: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: C.textSecondary,
    marginBottom: 2,
  },
  readonlyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.cardElevated,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 12,
    height: 52,
    paddingHorizontal: Spacing.md,
    opacity: 0.6,
  },
  readonlyValue: {
    fontSize: FontSize.sm,
    color: C.mutedLight,
  },
  readonlyNote: {
    fontSize: FontSize.xs,
    color: C.muted,
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
  successText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: C.success,
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
                <ArrowLeft size={20} color={C.mutedLight} />
              </Pressable>
              <Text style={styles.pageTitle}>Edit Profile</Text>
              <View style={{ width: 36 }} />
            </View>

            {/* Avatar */}
            <View style={styles.avatarSection}>
              <View style={[styles.avatarRing, { backgroundColor: C.primary }]} >
                <View style={styles.avatarInner}>
                  <User size={40} color={C.primary} />
                </View>
              </View>
              <Pressable style={styles.cameraBtn}>
                <Camera size={16} color={C.text} />
              </Pressable>
              <Text style={styles.avatarHint}>Tap to change photo</Text>
            </View>

            {/* Form */}
            <View style={styles.card}>
              {success ? (
                <View style={styles.successBox}>
                  <View style={styles.successIconWrap}>
                    <Check size={24} color={C.success} />
                  </View>
                  <Text style={styles.successText}>Profile updated!</Text>
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
                      label="Full Name"
                      placeholder="Your display name"
                      autoCapitalize="words"
                      autoComplete="name"
                      value={fullName}
                      onChangeText={setFullName}
                      leftIcon={<User size={18} color={C.muted} />}
                      editable={!loading}
                    />

                    <View style={styles.readonlyField}>
                      <Text style={styles.readonlyLabel}>Email Address</Text>
                      <View style={styles.readonlyInput}>
                        <Text style={styles.readonlyValue}>{user?.email ?? ''}</Text>
                        <Text style={styles.readonlyNote}>Cannot be changed</Text>
                      </View>
                    </View>

                    <View style={styles.readonlyField}>
                      <Text style={styles.readonlyLabel}>Account Role</Text>
                      <View style={styles.readonlyInput}>
                        <Text style={styles.readonlyValue}>
                          {user?.role === 'admin' ? 'Administrator' : 'Student'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Button
                    title="Save Changes"
                    loading={loading}
                    onPress={handleSave}
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
