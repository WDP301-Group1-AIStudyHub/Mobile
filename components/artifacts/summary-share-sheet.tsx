import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Mail, Trash2, Users, X } from 'lucide-react-native'

import { FontSize, Radius, Spacing } from '../../constants/colors'
import { useColors } from '../../contexts/ThemeContext'
import { getApiErrorDetails } from '../../services/apiClient'
import {
  listArtifactShares,
  revokeArtifactShare,
  shareArtifact,
  type ArtifactShare,
} from '../../services/artifactApi'

type Props = {
  artifactId: string | null
  visible: boolean
  onClose: () => void
  title?: string
}

/**
 * Share sheet for an AI summary artifact. Simpler than DocumentShareSheet:
 * always VIEW (no permission segment) and always active immediately (no
 * resend/notificationStatus — summary shares have no pending state).
 */
export default function SummaryShareSheet({ artifactId, onClose, title, visible }: Props) {
  const C = useColors()
  const [email, setEmail] = useState('')
  const [shares, setShares] = useState<ArtifactShare[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = useMemo(
    () => Boolean(artifactId && email.trim() && !saving),
    [artifactId, email, saving],
  )

  useEffect(() => {
    if (!visible || !artifactId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    listArtifactShares(artifactId)
      .then((items) => {
        if (!cancelled) setShares(items)
      })
      .catch((caught) => {
        if (!cancelled) setError(getApiErrorDetails(caught).message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [artifactId, visible])

  useEffect(() => {
    if (!visible) {
      setEmail('')
      setError(null)
    }
  }, [visible])

  const submitShare = async () => {
    if (!artifactId || !canSubmit) return
    setSaving(true)
    setError(null)
    try {
      const next = await shareArtifact(artifactId, email.trim().toLowerCase())
      setShares((current) => {
        const exists = current.some((item) => item.id === next.id)
        return exists
          ? current.map((item) => (item.id === next.id ? next : item))
          : [next, ...current]
      })
      setEmail('')
    } catch (caught) {
      const details = getApiErrorDetails(caught)
      setError(
        details.code === 'RECIPIENT_NOT_FOUND'
          ? 'No AI Study Hub account found for that email.'
          : details.message,
      )
    } finally {
      setSaving(false)
    }
  }

  const revoke = async (share: ArtifactShare) => {
    if (!artifactId || busyId) return
    setBusyId(share.id)
    setError(null)
    try {
      await revokeArtifactShare(artifactId, share.id)
      setShares((current) => current.filter((item) => item.id !== share.id))
    } catch (caught) {
      setError(getApiErrorDetails(caught).message)
    } finally {
      setBusyId(null)
    }
  }

  const confirmRevoke = (share: ArtifactShare) => {
    Alert.alert(
      'Revoke access?',
      `${share.sharedWithUser.email} will immediately lose access to this summary.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Revoke', style: 'destructive', onPress: () => void revoke(share) },
      ],
    )
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <KeyboardAvoidingView
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.cardBorder }]}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <View style={[styles.icon, { backgroundColor: C.primaryDim }]}>
                <Users color={C.primary} size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text selectable style={[styles.title, { color: C.text }]}>Share summary</Text>
                <Text numberOfLines={1} style={[styles.subtitle, { color: C.muted }]}>
                  {title || 'Document summary'}
                </Text>
              </View>
            </View>
            <Pressable accessibilityLabel="Close sharing" hitSlop={8} onPress={onClose}>
              <X color={C.muted} size={21} />
            </Pressable>
          </View>

          <View style={styles.form}>
            <View style={[styles.inputWrap, { backgroundColor: C.cardElevated, borderColor: C.cardBorder }]}>
              <Mail color={C.muted} size={17} />
              <TextInput
                autoCapitalize="none"
                editable={!saving}
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="teammate@example.com"
                placeholderTextColor={C.muted}
                style={[styles.input, { color: C.text }]}
                value={email}
              />
            </View>
            <Pressable
              accessibilityLabel="Share summary"
              disabled={!canSubmit}
              onPress={submitShare}
              style={[styles.shareButton, { backgroundColor: C.primary }, !canSubmit && styles.disabled]}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.shareButtonText}>Share</Text>}
            </Pressable>
          </View>

          {error ? (
            <Text selectable style={[styles.error, { color: C.error, backgroundColor: `${C.error}16` }]}>
              {error}
            </Text>
          ) : null}

          <ScrollView
            contentContainerStyle={styles.list}
            contentInsetAdjustmentBehavior="automatic"
            keyboardShouldPersistTaps="handled"
          >
            {loading ? (
              <ActivityIndicator color={C.primary} style={{ padding: Spacing.xl }} />
            ) : shares.length === 0 ? (
              <Text selectable style={[styles.empty, { color: C.muted }]}>This summary has not been shared yet.</Text>
            ) : (
              shares.map((share) => {
                const busy = busyId === share.id
                return (
                  <View key={share.id} style={[styles.row, { borderColor: C.cardBorder, backgroundColor: C.cardElevated }]}>
                    <View style={styles.person}>
                      <Text numberOfLines={1} selectable style={[styles.personName, { color: C.text }]}>
                        {share.sharedWithUser.fullName}
                      </Text>
                      <Text numberOfLines={1} selectable style={[styles.personEmail, { color: C.muted }]}>
                        {share.sharedWithUser.email}
                      </Text>
                    </View>
                    <Pressable
                      accessibilityLabel={`Revoke ${share.sharedWithUser.email}`}
                      disabled={busy}
                      hitSlop={6}
                      onPress={() => confirmRevoke(share)}
                      style={styles.deleteButton}
                    >
                      {busy ? <ActivityIndicator color={C.error} size="small" /> : <Trash2 color={C.error} size={17} />}
                    </Pressable>
                  </View>
                )
              })
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(23,32,26,0.35)' },
  sheet: { maxHeight: '88%', minHeight: '50%', borderTopLeftRadius: 12, borderTopRightRadius: 12, borderWidth: 1, padding: Spacing.lg, paddingBottom: 36, gap: Spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  headerCopy: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: FontSize.lg, fontWeight: '800' },
  subtitle: { fontSize: FontSize.xs, paddingTop: 2 },
  form: { gap: Spacing.sm },
  inputWrap: { height: 48, borderRadius: Radius.lg, borderWidth: 1, paddingHorizontal: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  input: { flex: 1, fontSize: FontSize.sm },
  shareButton: { minHeight: 44, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  shareButtonText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  error: { borderRadius: Radius.md, padding: Spacing.sm, fontSize: FontSize.xs, lineHeight: 18 },
  list: { gap: Spacing.sm, paddingBottom: Spacing.lg },
  empty: { textAlign: 'center', padding: Spacing.xl, fontSize: FontSize.sm },
  row: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  person: { minWidth: 0, flex: 1 },
  personName: { fontSize: FontSize.sm, fontWeight: '700' },
  personEmail: { fontSize: FontSize.xs, paddingTop: 2 },
  deleteButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
})
