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
import { CircleAlert, Clock3, Mail, MailCheck, RotateCw, Trash2, Users, X } from 'lucide-react-native'

import { FontSize, Radius, Spacing } from '../../constants/colors'
import { useColors } from '../../contexts/ThemeContext'
import {
  listDocumentShares,
  revokeDocumentShare,
  resendDocumentShareEmail,
  shareDocument,
  updateDocumentShare,
} from '../../services/documentApi'
import type {
  DocumentItem,
  DocumentShare,
  DocumentSharePermission,
} from '../../types/document'

type Props = {
  document: DocumentItem | null
  visible: boolean
  onClose: () => void
}

const getDocumentId = (document: DocumentItem | null): string =>
  document?.id || (document as (DocumentItem & { _id?: string }) | null)?._id || ''

const errorMessage = (error: unknown): string => {
  const candidate = error as {
    response?: { data?: { message?: string } }
    message?: string
  }
  return candidate.response?.data?.message || candidate.message || 'Request failed'
}

const formatExpiry = (value?: string): string => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function DocumentShareSheet({ document, onClose, visible }: Props) {
  const C = useColors()
  const documentId = getDocumentId(document)
  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState<DocumentSharePermission>('VIEW')
  const [shares, setShares] = useState<DocumentShare[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'warning'; message: string } | null>(null)

  const canSubmit = useMemo(
    () => Boolean(documentId && email.trim() && !saving),
    [documentId, email, saving],
  )

  useEffect(() => {
    if (!visible || !documentId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    listDocumentShares(documentId)
      .then((items) => {
        if (!cancelled) setShares(items)
      })
      .catch((caught) => {
        if (!cancelled) setError(errorMessage(caught))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [documentId, visible])

  useEffect(() => {
    if (!visible) {
      setEmail('')
      setPermission('VIEW')
      setError(null)
      setFeedback(null)
    }
  }, [visible])

  const submitShare = async () => {
    if (!canSubmit) return
    setSaving(true)
    setError(null)
    setFeedback(null)
    try {
      const next = await shareDocument(documentId, {
        email: email.trim().toLowerCase(),
        permission,
      })
      setShares((current) => {
        const exists = current.some((item) => item.id === next.id)
        return exists
          ? current.map((item) => (item.id === next.id ? next : item))
          : [next, ...current]
      })
      setEmail('')
      setPermission('VIEW')
      setFeedback(
        next.notificationStatus === 'FAILED'
          ? { tone: 'warning', message: 'Shared, but the notification email was not delivered.' }
          : next.notificationStatus === 'SKIPPED'
            ? { tone: 'warning', message: 'Shared. Email delivery is not configured.' }
            : { tone: 'success', message: 'Document shared and notification accepted.' },
      )
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  const changePermission = async (
    share: DocumentShare,
    nextPermission: DocumentSharePermission,
  ) => {
    if (share.permission === nextPermission || busyId) return
    setBusyId(share.id)
    setError(null)
    setFeedback(null)
    try {
      const updated = await updateDocumentShare(
        documentId,
        share.id,
        nextPermission,
      )
      setShares((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
      setFeedback(
        updated.notificationStatus === 'FAILED'
          ? { tone: 'warning', message: 'Permission updated, but the email was not delivered.' }
          : { tone: 'success', message: 'Permission updated.' },
      )
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusyId(null)
    }
  }

  const revoke = async (share: DocumentShare) => {
    if (busyId) return
    setBusyId(share.id)
    setError(null)
    try {
      await revokeDocumentShare(documentId, share.id)
      setShares((current) => current.filter((item) => item.id !== share.id))
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusyId(null)
    }
  }

  const confirmRevoke = (share: DocumentShare) => {
    Alert.alert(
      'Revoke access?',
      `${share.sharedWithUser.email} will immediately lose access to this document.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Revoke', style: 'destructive', onPress: () => void revoke(share) },
      ],
    )
  }

  const resend = async (share: DocumentShare) => {
    if (busyId) return
    setBusyId(share.id)
    setError(null)
    setFeedback(null)
    try {
      const updated = await resendDocumentShareEmail(documentId, share.id)
      setShares((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
      setFeedback(
        updated.notificationStatus === 'ACCEPTED'
          ? { tone: 'success', message: 'Notification email accepted for delivery.' }
          : { tone: 'warning', message: 'Access is active, but the email could not be sent.' },
      )
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
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
                <Text selectable style={[styles.title, { color: C.text }]}>Share document</Text>
                <Text numberOfLines={1} style={[styles.subtitle, { color: C.muted }]}>
                  {document?.title || 'Document'}
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
            <View style={[styles.segment, { backgroundColor: C.cardElevated }]}>
              {(['VIEW', 'EDIT'] as const).map((value) => {
                const active = permission === value
                return (
                  <Pressable
                    accessibilityRole="button"
                    key={value}
                    onPress={() => setPermission(value)}
                    style={[styles.segmentButton, active && { backgroundColor: C.primary }]}
                  >
                    <Text style={[styles.segmentText, { color: active ? '#fff' : C.muted }]}>
                      {value === 'VIEW' ? 'Viewer' : 'Editor'}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
            <Pressable
              accessibilityLabel="Share document"
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
          {feedback ? (
            <View
              style={[
                styles.feedback,
                {
                  backgroundColor: feedback.tone === 'success' ? C.successDim : C.warningDim,
                  borderColor: feedback.tone === 'success' ? C.success : C.warning,
                },
              ]}
            >
              {feedback.tone === 'success' ? (
                <MailCheck color={C.success} size={16} />
              ) : (
                <CircleAlert color={C.warning} size={16} />
              )}
              <Text selectable style={[styles.feedbackText, { color: feedback.tone === 'success' ? C.success : C.warning }]}>
                {feedback.message}
              </Text>
            </View>
          ) : null}

          <ScrollView
            contentContainerStyle={styles.list}
            contentInsetAdjustmentBehavior="automatic"
            keyboardShouldPersistTaps="handled"
          >
            {loading ? (
              <ActivityIndicator color={C.primary} style={{ padding: Spacing.xl }} />
            ) : shares.length === 0 ? (
              <Text selectable style={[styles.empty, { color: C.muted }]}>No one has access yet.</Text>
            ) : (
              shares.map((share) => {
                const pending = share.status === 'PENDING'
                const busy = busyId === share.id
                return (
                  <View key={share.id} style={[styles.row, { borderColor: C.cardBorder, backgroundColor: C.cardElevated }]}>
                    <View style={styles.person}>
                      <Text numberOfLines={1} selectable style={[styles.personName, { color: C.text }]}>
                        {pending ? 'Invitation pending' : share.sharedWithUser.fullName}
                      </Text>
                      <Text numberOfLines={1} selectable style={[styles.personEmail, { color: C.muted }]}>
                        {share.sharedWithUser.email}
                      </Text>
                      {pending ? (
                        <View style={styles.pendingLine}>
                          <Clock3 color={C.secondary} size={12} />
                          <Text style={[styles.pendingText, { color: C.secondary }]}>
                            Pending{share.expiresAt ? ` · expires ${formatExpiry(share.expiresAt)}` : ''}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.rowActions}>
                      <View style={[styles.miniSegment, { borderColor: C.cardBorder }]}>
                        {(['VIEW', 'EDIT'] as const).map((value) => {
                          const active = share.permission === value
                          return (
                            <Pressable
                              disabled={busy}
                              key={value}
                              onPress={() => changePermission(share, value)}
                              style={[styles.miniButton, active && { backgroundColor: C.primaryDim }]}
                            >
                              <Text style={[styles.miniText, { color: active ? C.primary : C.muted }]}>
                                {value === 'VIEW' ? 'View' : 'Edit'}
                              </Text>
                            </Pressable>
                          )
                        })}
                      </View>
                      <Pressable
                        accessibilityLabel={`Resend email to ${share.sharedWithUser.email}`}
                        disabled={busy}
                        hitSlop={6}
                        onPress={() => void resend(share)}
                        style={styles.deleteButton}
                      >
                        {busy ? <ActivityIndicator color={C.primary} size="small" /> : <RotateCw color={C.primary} size={17} />}
                      </Pressable>
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
  sheet: { maxHeight: '88%', minHeight: '58%', borderTopLeftRadius: 12, borderTopRightRadius: 12, borderWidth: 1, padding: Spacing.lg, paddingBottom: 36, gap: Spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  headerCopy: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: FontSize.lg, fontWeight: '800' },
  subtitle: { fontSize: FontSize.xs, paddingTop: 2 },
  form: { gap: Spacing.sm },
  inputWrap: { height: 48, borderRadius: Radius.lg, borderWidth: 1, paddingHorizontal: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  input: { flex: 1, fontSize: FontSize.sm },
  segment: { flexDirection: 'row', borderRadius: Radius.md, padding: 3 },
  segmentButton: { flex: 1, minHeight: 36, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontSize: FontSize.xs, fontWeight: '700' },
  shareButton: { minHeight: 44, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  shareButtonText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  error: { borderRadius: Radius.md, padding: Spacing.sm, fontSize: FontSize.xs, lineHeight: 18 },
  feedback: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.sm, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  feedbackText: { flex: 1, fontSize: FontSize.xs, lineHeight: 18, fontWeight: '600' },
  list: { gap: Spacing.sm, paddingBottom: Spacing.lg },
  empty: { textAlign: 'center', padding: Spacing.xl, fontSize: FontSize.sm },
  row: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm },
  person: { minWidth: 0 },
  personName: { fontSize: FontSize.sm, fontWeight: '700' },
  personEmail: { fontSize: FontSize.xs, paddingTop: 2 },
  pendingLine: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 6 },
  pendingText: { fontSize: 10, fontWeight: '700' },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  miniSegment: { flex: 1, flexDirection: 'row', borderWidth: 1, borderRadius: Radius.md, overflow: 'hidden' },
  miniButton: { flex: 1, minHeight: 34, alignItems: 'center', justifyContent: 'center' },
  miniText: { fontSize: 11, fontWeight: '700' },
  deleteButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
})
