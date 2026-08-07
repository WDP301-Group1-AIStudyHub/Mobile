import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { ArrowLeft, BrainCircuit, Plus, RefreshCw, Trash2, X } from 'lucide-react-native'
import Card from '../../../components/ui/Card'
import { FontSize, Radius, Spacing } from '../../../constants/colors'
import { useColors } from '../../../contexts/ThemeContext'
import { deleteArtifact, getArtifactById, initiateArtifact, listArtifacts, type ArtifactRecord, type ArtifactType, type MindmapNode } from '../../../services/artifactApi'

const TYPES: ArtifactType[] = ['FLASHCARD', 'QUIZ', 'MINDMAP', 'REPORT', 'DATA_TABLE']

export default function ChatArtifactsPage() {
  const C = useColors()
  const params = useLocalSearchParams<{ threadId?: string; documentId?: string }>()
  const threadId = typeof params.threadId === 'string' && params.threadId !== 'new' ? params.threadId : undefined
  const documentId = typeof params.documentId === 'string' ? params.documentId : undefined
  const [items, setItems] = useState<ArtifactRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [type, setType] = useState<ArtifactType>('FLASHCARD')
  const [instructions, setInstructions] = useState('')
  const [preview, setPreview] = useState<ArtifactRecord | null>(null)

  const load = useCallback(async () => { try { setItems(await listArtifacts(threadId || 'none')) } catch (error) { Alert.alert('Artifacts unavailable', error instanceof Error ? error.message : 'Please try again.') } finally { setLoading(false) } }, [threadId])
  useEffect(() => { void load() }, [load])
  const generating = useMemo(() => items.some((item) => item.status === 'PENDING' || item.status === 'GENERATING'), [items])
  useEffect(() => { if (!generating) return; const timer = setInterval(() => void load(), 3000); return () => clearInterval(timer) }, [generating, load])

  const create = async () => {
    setCreating(true)
    try { const record = await initiateArtifact({ type, instructions: instructions.trim() || undefined, threadId, documentId }); setItems((current) => [record, ...current]); setInstructions(''); setShowCreate(false) }
    catch (error) { Alert.alert('Generation failed', error instanceof Error ? error.message : 'Please try again.') }
    finally { setCreating(false) }
  }
  const remove = (record: ArtifactRecord) => Alert.alert('Delete artifact', `Delete “${record.title}”?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { await deleteArtifact(record._id); setItems((current) => current.filter((item) => item._id !== record._id)); if (preview?._id === record._id) setPreview(null) } }])
  const open = async (record: ArtifactRecord) => { setPreview(record); if (record.status === 'COMPLETED' && !record.content) { try { setPreview(await getArtifactById(record._id)) } catch {} } }

  return <SafeAreaView style={[styles.safe, { backgroundColor: C.background }]}><View style={styles.header}><Pressable onPress={() => router.back()}><ArrowLeft color={C.text} /></Pressable><BrainCircuit color={C.primary} /><View style={{ flex: 1 }}><Text style={[styles.title, { color: C.text }]}>Chat artifacts</Text><Text style={{ color: C.muted }}>{threadId ? 'This conversation' : 'New conversation'}</Text></View><Pressable onPress={() => void load()}><RefreshCw color={C.muted} /></Pressable><Pressable onPress={() => setShowCreate(true)} style={[styles.iconButton, { backgroundColor: C.primary }]}><Plus color="#fff" /></Pressable></View><ScrollView contentContainerStyle={styles.content}>{loading ? <ActivityIndicator color={C.primary} /> : items.length === 0 ? <Text style={[styles.empty, { color: C.muted }]}>Create flashcards, quizzes, mind maps, reports, or data tables from this chat.</Text> : items.map((record) => <Pressable key={record._id} onPress={() => void open(record)}><Card><View style={styles.row}><BrainCircuit color={C.primary} /><View style={{ flex: 1 }}><Text style={[styles.itemTitle, { color: C.text }]}>{record.title}</Text><Text style={{ color: record.status === 'FAILED' ? C.error : C.muted }}>{record.type.replace('_', ' ')} · {record.status}{record.error ? ` · ${record.error}` : ''}</Text></View>{(record.status === 'PENDING' || record.status === 'GENERATING') && <ActivityIndicator color={C.primary} />}<Pressable onPress={() => remove(record)}><Trash2 color={C.error} /></Pressable></View></Card></Pressable>)}</ScrollView><Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}><View style={styles.overlay}><View style={[styles.sheet, { backgroundColor: C.card }]}><View style={styles.row}><Text style={[styles.title, { color: C.text, flex: 1 }]}>Create artifact</Text><Pressable onPress={() => setShowCreate(false)}><X color={C.text} /></Pressable></View><View style={styles.wrap}>{TYPES.map((value) => <Pressable key={value} onPress={() => setType(value)} style={[styles.choice, { borderColor: C.cardBorder }, type === value && { backgroundColor: C.primary }]}><Text style={{ color: type === value ? '#fff' : C.text }}>{value.replace('_', ' ')}</Text></Pressable>)}</View><TextInput value={instructions} onChangeText={setInstructions} placeholder="Topic or instructions (optional)" placeholderTextColor={C.muted} multiline style={[styles.input, { color: C.text, borderColor: C.cardBorder }]} /><Pressable onPress={() => void create()} disabled={creating} style={[styles.primary, { backgroundColor: C.primary }]}>{creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Generate</Text>}</Pressable></View></View></Modal><Modal visible={!!preview} transparent animationType="slide" onRequestClose={() => setPreview(null)}><View style={styles.overlay}><View style={[styles.sheet, { backgroundColor: C.card }]}><View style={styles.row}><Text style={[styles.title, { color: C.text, flex: 1 }]}>{preview?.title}</Text><Pressable onPress={() => setPreview(null)}><X color={C.text} /></Pressable></View><ScrollView>{preview?.status !== 'COMPLETED' ? <Text style={{ color: C.muted }}>{preview?.error || `Artifact is ${preview?.status.toLowerCase()}.`}</Text> : <ArtifactContent record={preview} />}</ScrollView></View></View></Modal></SafeAreaView>
}

function ArtifactContent({ record }: { record: ArtifactRecord }) { const C = useColors(); const content = record.content; if (!content) return <Text style={{ color: C.muted }}>No content returned.</Text>; if ('markdown' in content) return <Text selectable style={[styles.body, { color: C.text }]}>{content.markdown}</Text>; if ('root' in content) return <Mindmap node={content.root} />; if ('columns' in content) return <View><Text style={[styles.itemTitle, { color: C.text }]}>{content.columns.join(' | ')}</Text>{content.rows.map((row, index) => <Text key={index} selectable style={{ color: C.text, paddingVertical: 5 }}>{row.join(' | ')}</Text>)}</View>; return <View>{content.items.map((item, index) => <Card key={index}><Text selectable style={{ color: C.text }}>{typeof item === 'string' ? item : JSON.stringify(item, null, 2)}</Text></Card>)}</View> }
function Mindmap({ node, depth = 0 }: { node: MindmapNode; depth?: number }) { const C = useColors(); return <View style={{ marginLeft: depth * 12, paddingVertical: 4 }}><Text style={{ color: C.text, fontWeight: depth === 0 ? '800' : '500' }}>• {node.label}</Text>{node.children?.map((child, index) => <Mindmap key={`${child.label}-${index}`} node={child} depth={depth + 1} />)}</View> }
const styles = StyleSheet.create({ safe: { flex: 1 }, header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.lg }, title: { fontSize: FontSize.xl, fontWeight: '800' }, content: { padding: Spacing.lg, gap: Spacing.sm }, row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }, itemTitle: { fontSize: FontSize.md, fontWeight: '700' }, iconButton: { padding: 7, borderRadius: Radius.md }, empty: { textAlign: 'center', padding: Spacing.xl, lineHeight: 22 }, overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.55)', justifyContent: 'flex-end' }, sheet: { maxHeight: '85%', padding: Spacing.lg, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, gap: Spacing.md }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }, choice: { padding: Spacing.sm, borderWidth: 1, borderRadius: Radius.md }, input: { minHeight: 100, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, textAlignVertical: 'top' }, primary: { padding: Spacing.md, alignItems: 'center', borderRadius: Radius.md }, primaryText: { color: '#fff', fontWeight: '800' }, body: { lineHeight: 22 } })
