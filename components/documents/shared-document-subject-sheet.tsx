import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { BookOpen, Check, FolderPlus, X } from 'lucide-react-native'
import { Radius, Spacing, FontSize } from '../../constants/colors'
import { useColors } from '../../contexts/ThemeContext'
import { updateSharedDocumentProfile } from '../../services/documentApi'
import type { DocumentItem } from '../../types/document'
import type { SubjectItem } from '../../types/subject'

type Props = {
  document: DocumentItem | null
  subjects: SubjectItem[]
  visible: boolean
  onClose: () => void
  onUpdated: (document: DocumentItem) => void
}

const getSafeId = (item: unknown): string => {
  if (!item || typeof item !== 'object') return ''
  const obj = item as { _id?: string; id?: string }
  return obj._id?.toString() || obj.id?.toString() || ''
}

const getSubjectLabel = (subject: SubjectItem): string => {
  const parts = [subject.code, subject.semester].filter(Boolean)
  return parts.length ? parts.join(' | ') : 'Personal subject'
}

export default function SharedDocumentSubjectSheet({
  document,
  subjects,
  visible,
  onClose,
  onUpdated,
}: Props) {
  const C = useColors()
  const [savingId, setSavingId] = useState<string | null>(null)

  const documentId = document ? getSafeId(document) : ''
  const activeSubjectId = document?.personalSubjectId || document?.subjectId || ''

  const save = async (subjectId: string | null) => {
    if (!documentId) return
    const key = subjectId || '__unassigned__'
    setSavingId(key)
    try {
      const updated = await updateSharedDocumentProfile(documentId, { subjectId })
      onUpdated(updated)
      onClose()
    } catch (error) {
      Alert.alert(
        'Update failed',
        error instanceof Error ? error.message : 'Could not update subject.',
      )
    } finally {
      setSavingId(null)
    }
  }

  const openSubjects = () => {
    onClose()
    router.push({ pathname: '/(app)/subjects', params: { create: '1' } })
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: C.card }]} onPress={() => {}}>
          <View style={[styles.handle, { backgroundColor: C.cardBorder }]} />
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text selectable style={[styles.title, { color: C.text }]}>
                Assign subject
              </Text>
              <Text numberOfLines={1} style={[styles.subtitle, { color: C.muted }]}>
                {document?.title || 'Shared document'}
              </Text>
            </View>
            <Pressable hitSlop={8} onPress={onClose}>
              <X size={20} color={C.muted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Pressable
              onPress={() => save(null)}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: !activeSubjectId ? C.primaryDim : C.cardElevated,
                  borderColor: !activeSubjectId ? C.primary : C.cardBorder,
                },
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.icon, { backgroundColor: C.overlayDark }]}>
                <BookOpen size={18} color={C.muted} />
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: C.text }]}>Unassigned</Text>
                <Text style={[styles.optionMeta, { color: C.muted }]}>
                  Keep this shared document out of subject chat groups.
                </Text>
              </View>
              {savingId === '__unassigned__' ? (
                <ActivityIndicator color={C.primary} />
              ) : !activeSubjectId ? (
                <Check size={18} color={C.primary} />
              ) : null}
            </Pressable>

            {subjects.map((subject, index) => {
              const subjectId = getSafeId(subject)
              const active = Boolean(subjectId && subjectId === activeSubjectId)
              const saving = savingId === subjectId

              return (
                <Pressable
                  key={subjectId || `subject-${index}`}
                  onPress={() => save(subjectId)}
                  style={({ pressed }) => [
                    styles.option,
                    {
                      backgroundColor: active ? C.primaryDim : C.cardElevated,
                      borderColor: active ? C.primary : C.cardBorder,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={[styles.icon, { backgroundColor: C.primaryDim }]}>
                    <BookOpen size={18} color={C.primary} />
                  </View>
                  <View style={styles.optionText}>
                    <Text numberOfLines={1} style={[styles.optionTitle, { color: C.text }]}>
                      {subject.name}
                    </Text>
                    <Text numberOfLines={1} style={[styles.optionMeta, { color: C.muted }]}>
                      {getSubjectLabel(subject)}
                    </Text>
                  </View>
                  {saving ? (
                    <ActivityIndicator color={C.primary} />
                  ) : active ? (
                    <Check size={18} color={C.primary} />
                  ) : null}
                </Pressable>
              )
            })}

            <Pressable
              onPress={openSubjects}
              style={({ pressed }) => [
                styles.createButton,
                { borderColor: C.primary, backgroundColor: C.cardElevated },
                pressed && styles.pressed,
              ]}
            >
              <FolderPlus size={16} color={C.primary} />
              <Text style={[styles.createText, { color: C.primary }]}>Create subject</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 14, 26, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
    minWidth: 0,
  },
  optionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  optionMeta: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  createButton: {
    minHeight: 44,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: Spacing.sm,
  },
  createText: {
    fontSize: FontSize.sm,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.65,
  },
})
