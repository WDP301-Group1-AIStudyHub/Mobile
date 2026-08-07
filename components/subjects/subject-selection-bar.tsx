import { Pressable, StyleSheet, Text, View } from 'react-native'
import { CheckSquare, Download, Shield, X } from 'lucide-react-native'
import { FontSize, Radius, Spacing } from '../../constants/colors'
import { useColors } from '../../contexts/ThemeContext'

export default function SubjectSelectionBar({ count, allSelected, canManage, onSelectAll, onDownload, onAccess, onClear }: {
  count: number; allSelected: boolean; canManage: boolean; onSelectAll: () => void; onDownload: () => void; onAccess: () => void; onClear: () => void
}) {
  const C = useColors()
  if (!count) return null
  return <View style={[styles.bar, { backgroundColor: C.card, borderColor: C.cardBorder }]}>
    <Text style={[styles.count, { color: C.text }]}>{count} selected</Text>
    <Pressable accessibilityLabel="Select all documents" onPress={onSelectAll} style={styles.action}><CheckSquare color={C.primary} size={19} /><Text style={[styles.label, { color: C.primary }]}>{allSelected ? 'All' : 'Select all'}</Text></Pressable>
    <Pressable accessibilityLabel="Download selected documents" onPress={onDownload} style={styles.action}><Download color={C.primary} size={19} /></Pressable>
    {canManage ? <Pressable accessibilityLabel="Manage access for selected documents" onPress={onAccess} style={styles.action}><Shield color={C.primary} size={19} /></Pressable> : null}
    <Pressable accessibilityLabel="Clear selection" onPress={onClear} style={styles.action}><X color={C.textSecondary} size={20} /></Pressable>
  </View>
}

const styles = StyleSheet.create({
  bar: { alignItems: 'center', borderRadius: Radius.lg, borderWidth: 1, bottom: Spacing.md, flexDirection: 'row', gap: 4, left: Spacing.md, minHeight: 58, paddingHorizontal: Spacing.md, position: 'absolute', right: Spacing.md },
  count: { flex: 1, fontSize: FontSize.sm, fontWeight: '800' }, action: { alignItems: 'center', flexDirection: 'row', gap: 4, justifyContent: 'center', minHeight: 44, minWidth: 44, paddingHorizontal: 4 }, label: { fontSize: FontSize.xs, fontWeight: '800' },
})
