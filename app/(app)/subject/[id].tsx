import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { ArrowLeft, FileText, Plus, Shield, Trash2, Users, X } from 'lucide-react-native'
import Card from '../../../components/ui/Card'
import { FontSize, Radius, Spacing } from '../../../constants/colors'
import { useColors } from '../../../contexts/ThemeContext'
import {
  addSubjectMember,
  addSubjectTeamMember,
  createSubjectDocumentAccess,
  createSubjectTeam,
  deleteSubjectTeam,
  getSubject,
  listSubjectDocumentAccess,
  listSubjectDocuments,
  listSubjectMembers,
  listSubjectTeams,
  removeSubjectMember,
  removeSubjectTeamMember,
  revokeSubjectDocumentAccess,
  updateSubjectDocumentAccess,
  updateSubjectMemberRole,
} from '../../../services/subjectApi'
import type { DocumentItem } from '../../../types/document'
import type { SubjectAccessGrant, SubjectDocumentPermission, SubjectItem, SubjectMember, SubjectTeam } from '../../../types/subject'

type Tab = 'documents' | 'members' | 'teams'
const idOf = (value: { id?: string; _id?: string }) => String(value.id || value._id || '')
const titleOf = (document: DocumentItem) => document.title || document.fileName || 'Untitled document'

export default function SubjectWorkspacePage() {
  const C = useColors()
  const { id } = useLocalSearchParams<{ id: string }>()
  const subjectId = typeof id === 'string' ? id : ''
  const [subject, setSubject] = useState<SubjectItem | null>(null)
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [members, setMembers] = useState<SubjectMember[]>([])
  const [teams, setTeams] = useState<SubjectTeam[]>([])
  const [tab, setTab] = useState<Tab>('documents')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [memberEmail, setMemberEmail] = useState('')
  const [memberRole, setMemberRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER')
  const [teamName, setTeamName] = useState('')
  const [teamDescription, setTeamDescription] = useState('')
  const [accessDocument, setAccessDocument] = useState<DocumentItem | null>(null)
  const [grants, setGrants] = useState<SubjectAccessGrant[]>([])
  const [grantTarget, setGrantTarget] = useState('')
  const [grantType, setGrantType] = useState<'USER' | 'TEAM'>('USER')
  const [permission, setPermission] = useState<SubjectDocumentPermission>('VIEW')

  const canManage = subject?.currentUserRole === 'OWNER' || subject?.currentUserRole === 'ADMIN'
  const targets = useMemo(() => grantType === 'TEAM'
    ? teams.map((team) => ({ id: team.id, label: team.name }))
    : members.filter((member) => member.role !== 'OWNER').map((member) => ({ id: member.user.id, label: member.user.fullName || member.user.email })), [grantType, members, teams])

  const load = useCallback(async () => {
    if (!subjectId) return
    setLoading(true)
    try {
      const nextSubject = await getSubject(subjectId)
      setSubject(nextSubject)
      const [nextDocuments, nextMembers, nextTeams] = await Promise.all([
        listSubjectDocuments(subjectId),
        listSubjectMembers(subjectId).catch(() => []),
        listSubjectTeams(subjectId).catch(() => []),
      ])
      setDocuments(nextDocuments)
      setMembers(nextMembers)
      setTeams(nextTeams)
    } catch (error) {
      Alert.alert('Unable to load workspace', error instanceof Error ? error.message : 'Please try again.')
    } finally { setLoading(false) }
  }, [subjectId])

  useEffect(() => { void load() }, [load])

  const inviteMember = async () => {
    if (!memberEmail.trim()) return
    setBusy('member')
    try {
      const created = await addSubjectMember(subjectId, { email: memberEmail.trim(), role: memberRole })
      setMembers((current) => [created, ...current.filter((item) => item.id !== created.id)])
      setMemberEmail('')
    } catch (error) { Alert.alert('Invite failed', error instanceof Error ? error.message : 'Please try again.') }
    finally { setBusy('') }
  }

  const removeMember = (member: SubjectMember) => Alert.alert('Remove member', `Remove ${member.user.fullName || member.user.email}?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: async () => {
      setBusy(member.id)
      try { await removeSubjectMember(subjectId, member.id); setMembers((current) => current.filter((item) => item.id !== member.id)) }
      catch (error) { Alert.alert('Remove failed', error instanceof Error ? error.message : 'Please try again.') }
      finally { setBusy('') }
    } },
  ])

  const toggleRole = async (member: SubjectMember) => {
    const role = member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN'
    setBusy(member.id)
    try { const updated = await updateSubjectMemberRole(subjectId, member.id, role); setMembers((current) => current.map((item) => item.id === updated.id ? updated : item)) }
    catch (error) { Alert.alert('Update failed', error instanceof Error ? error.message : 'Please try again.') }
    finally { setBusy('') }
  }

  const createTeam = async () => {
    if (!teamName.trim()) return
    setBusy('team')
    try { const created = await createSubjectTeam(subjectId, { name: teamName.trim(), description: teamDescription.trim() || undefined }); setTeams((current) => [created, ...current]); setTeamName(''); setTeamDescription('') }
    catch (error) { Alert.alert('Create failed', error instanceof Error ? error.message : 'Please try again.') }
    finally { setBusy('') }
  }

  const removeTeam = (team: SubjectTeam) => Alert.alert('Delete team', `Delete ${team.name}?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { try { await deleteSubjectTeam(subjectId, team.id); setTeams((current) => current.filter((item) => item.id !== team.id)) } catch (error) { Alert.alert('Delete failed', error instanceof Error ? error.message : 'Please try again.') } } },
  ])

  const addToTeam = async (team: SubjectTeam, userId: string) => {
    setBusy(`${team.id}:${userId}`)
    try { const updated = await addSubjectTeamMember(subjectId, team.id, userId); setTeams((current) => current.map((item) => item.id === team.id ? updated : item)) }
    catch (error) { Alert.alert('Add failed', error instanceof Error ? error.message : 'Please try again.') }
    finally { setBusy('') }
  }

  const removeFromTeam = async (team: SubjectTeam, userId: string) => {
    setBusy(`${team.id}:${userId}`)
    try { const updated = await removeSubjectTeamMember(subjectId, team.id, userId); setTeams((current) => current.map((item) => item.id === team.id ? updated : item)) }
    catch (error) { Alert.alert('Remove failed', error instanceof Error ? error.message : 'Please try again.') }
    finally { setBusy('') }
  }

  const openAccess = async (document: DocumentItem) => {
    setAccessDocument(document); setGrants([]); setGrantTarget('')
    try { setGrants(await listSubjectDocumentAccess(subjectId, idOf(document))) }
    catch (error) { Alert.alert('Access unavailable', error instanceof Error ? error.message : 'Please try again.') }
  }

  const grantAccess = async () => {
    if (!accessDocument || !grantTarget) return
    setBusy('grant')
    try { const created = await createSubjectDocumentAccess(subjectId, idOf(accessDocument), { granteeType: grantType, granteeId: grantTarget, permission }); setGrants((current) => [created, ...current.filter((item) => item.id !== created.id)]); setGrantTarget('') }
    catch (error) { Alert.alert('Grant failed', error instanceof Error ? error.message : 'Please try again.') }
    finally { setBusy('') }
  }

  if (loading) return <SafeAreaView style={[styles.center, { backgroundColor: C.background }]}><ActivityIndicator color={C.primary} /></SafeAreaView>

  return <SafeAreaView style={[styles.safe, { backgroundColor: C.background }]}>
    <View style={styles.header}><Pressable onPress={() => router.back()}><ArrowLeft color={C.text} /></Pressable><View style={{ flex: 1 }}><Text style={[styles.title, { color: C.text }]}>{subject?.name || 'Subject'}</Text><Text style={{ color: C.muted }}>{subject?.code || subject?.semester || 'Workspace'}</Text></View></View>
    <View style={styles.tabs}>{(['documents', 'members', 'teams'] as Tab[]).map((item) => <Pressable key={item} onPress={() => setTab(item)} style={[styles.tab, tab === item && { backgroundColor: C.primary }]}><Text style={{ color: tab === item ? '#fff' : C.textSecondary, fontWeight: '700' }}>{item[0].toUpperCase() + item.slice(1)}</Text></Pressable>)}</View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {tab === 'documents' && <>{documents.length === 0 ? <Empty text="No documents in this subject." /> : documents.map((document) => <Card key={idOf(document)}><View style={styles.itemRow}><FileText color={C.primary} /><Pressable style={{ flex: 1 }} onPress={() => router.push(`/(app)/document/${idOf(document)}` as any)}><Text style={[styles.itemTitle, { color: C.text }]}>{titleOf(document)}</Text><Text style={{ color: C.muted }}>{document.accessRole || 'Subject document'}</Text></Pressable>{canManage && <Pressable onPress={() => void openAccess(document)}><Shield color={C.primary} /></Pressable>}</View></Card>)}</>}
      {tab === 'members' && <>{canManage && <Card><TextInput value={memberEmail} onChangeText={setMemberEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Member email" placeholderTextColor={C.muted} style={[styles.input, { color: C.text, borderColor: C.cardBorder }]} /><View style={styles.itemRow}>{(['MEMBER', 'ADMIN'] as const).map((role) => <Pressable key={role} onPress={() => setMemberRole(role)} style={[styles.choice, { borderColor: C.cardBorder }, memberRole === role && { backgroundColor: C.primary }]}><Text style={{ color: memberRole === role ? '#fff' : C.text }}>{role}</Text></Pressable>)}<Pressable onPress={() => void inviteMember()} style={[styles.add, { backgroundColor: C.primary }]}><Plus color="#fff" /></Pressable></View></Card>}{members.map((member) => <Card key={member.id}><View style={styles.itemRow}><Users color={C.primary} /><View style={{ flex: 1 }}><Text style={[styles.itemTitle, { color: C.text }]}>{member.user.fullName || member.user.email}</Text><Text style={{ color: C.muted }}>{member.user.email} · {member.role}{member.status === 'PENDING' ? ' · Pending' : ''}</Text></View>{canManage && member.role !== 'OWNER' && <><Pressable onPress={() => void toggleRole(member)}><Text style={{ color: C.primary }}>{member.role === 'ADMIN' ? 'Make member' : 'Make admin'}</Text></Pressable><Pressable onPress={() => removeMember(member)}><Trash2 color={C.error} /></Pressable></>}</View></Card>)}</>}
      {tab === 'teams' && <>{canManage && <Card><TextInput value={teamName} onChangeText={setTeamName} placeholder="Team name" placeholderTextColor={C.muted} style={[styles.input, { color: C.text, borderColor: C.cardBorder }]} /><TextInput value={teamDescription} onChangeText={setTeamDescription} placeholder="Description (optional)" placeholderTextColor={C.muted} style={[styles.input, { color: C.text, borderColor: C.cardBorder }]} /><Pressable onPress={() => void createTeam()} style={[styles.primary, { backgroundColor: C.primary }]}><Text style={styles.primaryText}>Create team</Text></Pressable></Card>}{teams.map((team) => <Card key={team.id}><View style={styles.itemRow}><Users color={C.primary} /><View style={{ flex: 1 }}><Text style={[styles.itemTitle, { color: C.text }]}>{team.name}</Text><Text style={{ color: C.muted }}>{team.description || `${team.members.length} members`}</Text></View>{canManage && <Pressable onPress={() => removeTeam(team)}><Trash2 color={C.error} /></Pressable>}</View>{team.members.map((user) => <View key={user.id} style={styles.subRow}><Text style={{ color: C.text, flex: 1 }}>{user.fullName || user.email}</Text>{canManage && <Pressable onPress={() => void removeFromTeam(team, user.id)}><X color={C.error} size={18} /></Pressable>}</View>)}{canManage && members.filter((member) => !team.members.some((user) => user.id === member.user.id) && member.status !== 'PENDING').map((member) => <Pressable key={member.id} onPress={() => void addToTeam(team, member.user.id)} style={styles.subRow}><Plus color={C.primary} size={18} /><Text style={{ color: C.primary }}>Add {member.user.fullName || member.user.email}</Text></Pressable>)}</Card>)}</>}
    </ScrollView>
    <Modal visible={!!accessDocument} transparent animationType="slide" onRequestClose={() => setAccessDocument(null)}><View style={styles.overlay}><View style={[styles.sheet, { backgroundColor: C.card }]}><View style={styles.itemRow}><Text style={[styles.title, { color: C.text, flex: 1 }]}>Document access</Text><Pressable onPress={() => setAccessDocument(null)}><X color={C.text} /></Pressable></View><Text style={{ color: C.muted }}>{accessDocument ? titleOf(accessDocument) : ''}</Text><View style={styles.itemRow}>{(['USER', 'TEAM'] as const).map((type) => <Pressable key={type} onPress={() => { setGrantType(type); setGrantTarget('') }} style={[styles.choice, { borderColor: C.cardBorder }, grantType === type && { backgroundColor: C.primary }]}><Text style={{ color: grantType === type ? '#fff' : C.text }}>{type}</Text></Pressable>)}{(['VIEW', 'EDIT'] as const).map((value) => <Pressable key={value} onPress={() => setPermission(value)} style={[styles.choice, { borderColor: C.cardBorder }, permission === value && { backgroundColor: C.primary }]}><Text style={{ color: permission === value ? '#fff' : C.text }}>{value}</Text></Pressable>)}</View><ScrollView style={{ maxHeight: 160 }}>{targets.map((target) => <Pressable key={target.id} onPress={() => setGrantTarget(target.id)} style={[styles.subRow, grantTarget === target.id && { backgroundColor: C.primaryDim }]}><Text style={{ color: C.text }}>{target.label}</Text></Pressable>)}</ScrollView><Pressable disabled={!grantTarget || busy === 'grant'} onPress={() => void grantAccess()} style={[styles.primary, { backgroundColor: C.primary, opacity: grantTarget ? 1 : .5 }]}>{busy === 'grant' ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Grant access</Text>}</Pressable><ScrollView style={{ maxHeight: 240 }}>{grants.map((grant) => <View key={grant.id} style={styles.itemRow}><View style={{ flex: 1 }}><Text style={[styles.itemTitle, { color: C.text }]}>{grant.granteeName}</Text><Text style={{ color: C.muted }}>{grant.granteeType} · {grant.permission}</Text></View><Pressable onPress={async () => { const next = grant.permission === 'VIEW' ? 'EDIT' : 'VIEW'; const updated = await updateSubjectDocumentAccess(subjectId, idOf(accessDocument!), grant.id, next); setGrants((current) => current.map((item) => item.id === updated.id ? updated : item)) }}><Text style={{ color: C.primary }}>Toggle</Text></Pressable><Pressable onPress={async () => { await revokeSubjectDocumentAccess(subjectId, idOf(accessDocument!), grant.id); setGrants((current) => current.filter((item) => item.id !== grant.id)) }}><Trash2 color={C.error} /></Pressable></View>)}</ScrollView></View></View></Modal>
  </SafeAreaView>
}

function Empty({ text }: { text: string }) { const C = useColors(); return <View style={styles.center}><Text style={{ color: C.muted }}>{text}</Text></View> }

const styles = StyleSheet.create({
  safe: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl }, header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg }, title: { fontSize: FontSize.xl, fontWeight: '800' }, tabs: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg }, tab: { flex: 1, padding: Spacing.sm, borderRadius: Radius.md, alignItems: 'center' }, content: { padding: Spacing.lg, gap: Spacing.sm }, itemRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }, itemTitle: { fontSize: FontSize.md, fontWeight: '700' }, input: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm }, choice: { borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 8 }, add: { marginLeft: 'auto', padding: 7, borderRadius: Radius.sm }, primary: { borderRadius: Radius.md, alignItems: 'center', padding: Spacing.md, marginTop: Spacing.sm }, primaryText: { color: '#fff', fontWeight: '700' }, subRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, paddingLeft: Spacing.xl }, overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.55)', justifyContent: 'flex-end' }, sheet: { maxHeight: '85%', padding: Spacing.lg, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, gap: Spacing.sm },
})
