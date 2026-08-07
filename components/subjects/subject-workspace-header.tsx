import { Pressable, StyleSheet, Text, View } from 'react-native'
import { ArrowLeft, UploadCloud } from 'lucide-react-native'
import { FontSize, Radius, Spacing } from '../../constants/colors'
import { useColors } from '../../contexts/ThemeContext'
import type { SubjectItem } from '../../types/subject'

export default function SubjectWorkspaceHeader({ subject, canManage, onBack, onUpload }: {
  subject: SubjectItem
  canManage: boolean
  onBack: () => void
  onUpload: () => void
}) {
  const C = useColors()
  return <View style={[styles.wrap, { borderBottomColor: C.cardBorder }]}>
    <View style={styles.topRow}>
      <Pressable accessibilityLabel="Back to subjects" hitSlop={10} onPress={onBack} style={styles.iconButton}>
        <ArrowLeft color={C.text} size={22} />
      </Pressable>
      <View style={styles.titleBlock}>
        <Text numberOfLines={1} style={[styles.title, { color: C.text }]}>{subject.name}</Text>
        <Text numberOfLines={1} style={[styles.meta, { color: C.textSecondary }]}>
          {[subject.code, subject.semester].filter(Boolean).join(' / ') || 'Subject workspace'}
        </Text>
      </View>
      {canManage ? <Pressable accessibilityLabel="Upload document" onPress={onUpload} style={[styles.upload, { backgroundColor: C.primary }]}>
        <UploadCloud color="#fff" size={18} />
        <Text style={styles.uploadText}>Upload</Text>
      </Pressable> : null}
    </View>
    <View style={styles.badges}>
      <View style={[styles.badge, { backgroundColor: C.primaryDim }]}>
        <Text style={[styles.badgeText, { color: C.primary }]}>{subject.currentUserRole || 'NO ACCESS'}</Text>
      </View>
      {subject.currentUserTeams?.map((team) => <View key={team.id} style={[styles.badge, { borderColor: C.cardBorder }]}>
        <Text numberOfLines={1} style={[styles.badgeText, { color: C.textSecondary }]}>Team: {team.name}</Text>
      </View>)}
    </View>
  </View>
}

const styles = StyleSheet.create({
  wrap: { borderBottomWidth: 1, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, paddingTop: Spacing.sm, gap: Spacing.sm },
  topRow: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm },
  iconButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  titleBlock: { flex: 1, minWidth: 0 },
  title: { fontSize: FontSize.lg, fontWeight: '800' },
  meta: { fontSize: FontSize.sm, marginTop: 2 },
  upload: { alignItems: 'center', borderRadius: Radius.md, flexDirection: 'row', gap: 6, minHeight: 44, paddingHorizontal: 12 },
  uploadText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '800' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, paddingLeft: 52 },
  badge: { borderRadius: Radius.full, borderWidth: 1, maxWidth: 180, paddingHorizontal: 9, paddingVertical: 5 },
  badgeText: { fontSize: FontSize.xs, fontWeight: '800' },
})
