import { Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Download, ExternalLink, FileText, Pencil, Shield, X } from 'lucide-react-native'
import { FontSize, Radius, Spacing } from '../../constants/colors'
import { useColors } from '../../contexts/ThemeContext'
import type { DocumentItem } from '../../types/document'
import type { SubjectItem } from '../../types/subject'

const titleOf = (document: DocumentItem) => document.title || document.fileName || 'Untitled document'
const extensionOf = (document: DocumentItem) => (document.fileName?.split('.').pop() || document.fileType || '').toLowerCase()

export default function SubjectDocumentPreview({ document, subject, canManage, onClose, onDownload, onEdit, onAccess }: {
  document: DocumentItem | null; subject: SubjectItem; canManage: boolean; onClose: () => void; onDownload: (document: DocumentItem) => void; onEdit: (document: DocumentItem) => void; onAccess: (document: DocumentItem) => void
}) {
  const C = useColors()
  if (!document) return null
  const ext = extensionOf(document)
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext) || document.fileType?.startsWith('image/')
  const hasText = Boolean(document.extractedText?.trim())
  const canEdit = document.accessRole === 'OWNER' || document.accessRole === 'EDITOR'
  const role = document.accessRole === 'OWNER' ? 'Manager' : document.accessRole === 'EDITOR' ? 'Editor' : 'Viewer'
  return <Modal animationType="slide" onRequestClose={onClose} visible>
    <View style={[styles.screen, { backgroundColor: C.background }]}>
      <View style={[styles.header, { borderBottomColor: C.cardBorder }]}><View style={styles.heading}><Text numberOfLines={1} style={[styles.title, { color: C.text }]}>{titleOf(document)}</Text><Text numberOfLines={1} style={[styles.meta, { color: C.textSecondary }]}>{[subject.name, subject.code, subject.semester, role].filter(Boolean).join(' / ')}</Text></View><Pressable accessibilityLabel="Close preview" onPress={onClose} style={styles.iconButton}><X color={C.text} /></Pressable></View>
      <View style={styles.body}>{isImage && document.fileUrl ? <Image resizeMode="contain" source={{ uri: document.fileUrl }} style={styles.image} /> : hasText ? <ScrollView contentContainerStyle={styles.textPreview}><Text selectable style={[styles.extracted, { color: C.text }]}>{document.extractedText}</Text></ScrollView> : <View style={[styles.fallback, { borderColor: C.cardBorder }]}><View style={[styles.fileIcon, { backgroundColor: C.primaryDim }]}><FileText color={C.primary} size={34} /></View><Text style={[styles.fallbackTitle, { color: C.text }]}>Inline preview is not available</Text><Text style={[styles.fallbackText, { color: C.textSecondary }]}>Open or download this {ext ? ext.toUpperCase() : 'file'} with a compatible app.</Text><View style={styles.fallbackActions}>{document.fileUrl ? <Pressable onPress={() => void Linking.openURL(document.fileUrl)} style={[styles.secondary, { borderColor: C.cardBorder }]}><ExternalLink color={C.text} size={18} /><Text style={[styles.buttonText, { color: C.text }]}>Open file</Text></Pressable> : null}<Pressable onPress={() => onDownload(document)} style={[styles.primary, { backgroundColor: C.primary }]}><Download color="#fff" size={18} /><Text style={styles.primaryText}>Download</Text></Pressable></View></View>}</View>
      <View style={[styles.footer, { borderTopColor: C.cardBorder }]}><Pressable onPress={() => onDownload(document)} style={[styles.secondary, { borderColor: C.cardBorder }]}><Download color={C.text} size={18} /><Text style={[styles.buttonText, { color: C.text }]}>Download</Text></Pressable>{canEdit ? <Pressable onPress={() => onEdit(document)} style={[styles.secondary, { borderColor: C.cardBorder }]}><Pencil color={C.primary} size={18} /><Text style={[styles.buttonText, { color: C.primary }]}>Edit / versions</Text></Pressable> : null}{canManage ? <Pressable onPress={() => onAccess(document)} style={[styles.secondary, { borderColor: C.cardBorder }]}><Shield color={C.primary} size={18} /><Text style={[styles.buttonText, { color: C.primary }]}>Access</Text></Pressable> : null}</View>
    </View>
  </Modal>
}

const styles = StyleSheet.create({ screen: { flex: 1 }, header: { alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm }, heading: { flex: 1, minWidth: 0 }, title: { fontSize: FontSize.md, fontWeight: '800' }, meta: { fontSize: FontSize.sm, marginTop: 3 }, iconButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 }, body: { flex: 1, padding: Spacing.md }, image: { flex: 1, width: '100%' }, textPreview: { padding: Spacing.md }, extracted: { fontSize: FontSize.base, lineHeight: 24 }, fallback: { alignItems: 'center', borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.md, margin: 'auto', maxWidth: 520, padding: Spacing.xl }, fileIcon: { alignItems: 'center', borderRadius: Radius.lg, height: 62, justifyContent: 'center', width: 62 }, fallbackTitle: { fontSize: FontSize.md, fontWeight: '800', textAlign: 'center' }, fallbackText: { fontSize: FontSize.sm, lineHeight: 20, textAlign: 'center' }, fallbackActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'center' }, footer: { borderTopWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, padding: Spacing.md }, secondary: { alignItems: 'center', borderRadius: Radius.md, borderWidth: 1, flexDirection: 'row', gap: 7, minHeight: 44, paddingHorizontal: Spacing.md }, primary: { alignItems: 'center', borderRadius: Radius.md, flexDirection: 'row', gap: 7, minHeight: 44, paddingHorizontal: Spacing.md }, buttonText: { fontSize: FontSize.sm, fontWeight: '800' }, primaryText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '800' } })
