import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Check, FileText, Shield } from 'lucide-react-native'
import Card from '../ui/Card'
import { FontSize, Radius, Spacing } from '../../constants/colors'
import { useColors } from '../../contexts/ThemeContext'
import type { DocumentItem } from '../../types/document'

const idOf = (value: { id?: string; _id?: string }) => String(value.id || value._id || '')
const titleOf = (document: DocumentItem) => document.title || document.fileName || 'Untitled document'
const roleLabel = (role?: string) => role === 'OWNER' ? 'Manager' : role === 'EDITOR' ? 'Editor' : 'Viewer'

export default function SubjectDocumentList({ documents, selectedIds, canManage, onOpen, onLongPress, onToggle, onAccess }: {
  documents: DocumentItem[]
  selectedIds: Set<string>
  canManage: boolean
  onOpen: (document: DocumentItem) => void
  onLongPress: (document: DocumentItem) => void
  onToggle: (document: DocumentItem) => void
  onAccess: (document: DocumentItem) => void
}) {
  const C = useColors()
  if (!documents.length) return <View style={[styles.empty, { borderColor: C.cardBorder }]}><FileText color={C.muted} size={34} /><Text style={[styles.emptyTitle, { color: C.text }]}>No documents here</Text><Text style={[styles.emptyText, { color: C.textSecondary }]}>Documents appear when they are uploaded or shared with you.</Text></View>
  return <View style={styles.list}>{documents.map((document) => {
    const id = idOf(document)
    const selected = selectedIds.has(id)
    return <Pressable key={id} onLongPress={() => onLongPress(document)} onPress={() => selectedIds.size ? onToggle(document) : onOpen(document)}>
      <Card style={[styles.card, selected && { borderColor: C.primary, backgroundColor: C.primaryDim }]}>
        <View style={styles.row}>
          <View style={[styles.fileIcon, { backgroundColor: C.secondaryDim }]}>{selected ? <Check color={C.primary} size={20} /> : <FileText color={C.primary} size={21} />}</View>
          <View style={styles.main}>
            <Text numberOfLines={1} style={[styles.title, { color: C.text }]}>{titleOf(document)}</Text>
            <Text numberOfLines={1} style={[styles.fileMeta, { color: C.textSecondary }]}>{document.fileType || 'File'}</Text>
            <View style={styles.tags}>
              <Text style={[styles.permission, { backgroundColor: C.primaryDim, color: C.primary }]}>{roleLabel(document.accessRole)}</Text>
              <Text style={[styles.updated, { color: C.muted }]}>{document.updatedAt ? new Date(document.updatedAt).toLocaleDateString() : ''}</Text>
            </View>
          </View>
          {canManage && !selectedIds.size ? <Pressable accessibilityLabel={`Manage access for ${titleOf(document)}`} hitSlop={8} onPress={() => onAccess(document)} style={styles.iconAction}><Shield color={C.primary} size={20} /></Pressable> : null}
        </View>
      </Card>
    </Pressable>
  })}</View>
}

const styles = StyleSheet.create({
  list: { gap: Spacing.sm }, card: { borderWidth: 1, padding: Spacing.md }, row: { alignItems: 'center', flexDirection: 'row', gap: Spacing.md },
  fileIcon: { alignItems: 'center', borderRadius: Radius.md, height: 44, justifyContent: 'center', width: 44 }, main: { flex: 1, minWidth: 0 },
  title: { fontSize: FontSize.base, fontWeight: '800' }, fileMeta: { fontSize: FontSize.sm, marginTop: 3, textTransform: 'capitalize' }, tags: { alignItems: 'center', flexDirection: 'row', gap: Spacing.sm, marginTop: 8 },
  permission: { borderRadius: Radius.full, fontSize: FontSize.xs, fontWeight: '800', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 4 }, updated: { fontSize: FontSize.xs }, iconAction: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  empty: { alignItems: 'center', borderRadius: Radius.lg, borderStyle: 'dashed', borderWidth: 1, gap: Spacing.sm, marginTop: Spacing.lg, padding: Spacing.xxl }, emptyTitle: { fontSize: FontSize.md, fontWeight: '800' }, emptyText: { fontSize: FontSize.sm, textAlign: 'center' },
})
