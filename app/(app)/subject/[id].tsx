import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { ArrowDownAZ, FileText, Search, Shield, Users } from 'lucide-react-native'
import SubjectAccessSheet from '../../../components/subjects/subject-access-sheet'
import SubjectDocumentList from '../../../components/subjects/subject-document-list'
import SubjectDocumentPreview from '../../../components/subjects/subject-document-preview'
import SubjectMembersView from '../../../components/subjects/subject-members-view'
import SubjectSelectionBar from '../../../components/subjects/subject-selection-bar'
import SubjectTeamsView from '../../../components/subjects/subject-teams-view'
import SubjectWorkspaceHeader from '../../../components/subjects/subject-workspace-header'
import { FontSize, Radius, Spacing } from '../../../constants/colors'
import { useColors } from '../../../contexts/ThemeContext'
import { getDocumentDownloadUrl } from '../../../services/documentApi'
import {
  addSubjectMember, addSubjectTeamMember, createSubjectDocumentAccess, createSubjectTeam, deleteSubjectTeam, getSubject,
  listSubjectDocumentAccess, listSubjectDocuments, listSubjectMembers, listSubjectTeams, removeSubjectMember,
  removeSubjectTeamMember, revokeSubjectDocumentAccess, updateSubjectDocumentAccess, updateSubjectMemberRole,
} from '../../../services/subjectApi'
import type { DocumentItem } from '../../../types/document'
import type { SubjectAccessGrant, SubjectDocumentPermission, SubjectGrantType, SubjectItem, SubjectMember, SubjectTeam } from '../../../types/subject'

type WorkspaceView = 'documents' | 'shared' | 'members' | 'teams'
type AccessFilter = 'ALL' | 'VIEWER' | 'EDITOR'
const idOf = (value: { id?: string; _id?: string }) => String(value.id || value._id || '')
const titleOf = (document: DocumentItem) => document.title || document.fileName || 'Untitled document'
const notificationMessage = (status?: string) => status === 'FAILED' ? ' Access was saved, but the notification email failed.' : status === 'ACCEPTED' ? ' Notification email sent.' : ''

export default function SubjectWorkspacePage() {
  const C = useColors()
  const { id } = useLocalSearchParams<{ id: string }>()
  const subjectId = typeof id === 'string' ? id : ''
  const [subject, setSubject] = useState<SubjectItem | null>(null)
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [members, setMembers] = useState<SubjectMember[]>([])
  const [teams, setTeams] = useState<SubjectTeam[]>([])
  const [view, setView] = useState<WorkspaceView>('documents')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busy, setBusy] = useState('')
  const [query, setQuery] = useState('')
  const [accessFilter, setAccessFilter] = useState<AccessFilter>('ALL')
  const [sortNewest, setSortNewest] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [previewDocument, setPreviewDocument] = useState<DocumentItem | null>(null)
  const [memberEmail, setMemberEmail] = useState('')
  const [memberRole, setMemberRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER')
  const [teamName, setTeamName] = useState('')
  const [teamDescription, setTeamDescription] = useState('')
  const [teamInviteEmail, setTeamInviteEmail] = useState('')
  const [teamInviteId, setTeamInviteId] = useState('')
  const [accessDocuments, setAccessDocuments] = useState<DocumentItem[]>([])
  const [grants, setGrants] = useState<SubjectAccessGrant[]>([])
  const [grantTarget, setGrantTarget] = useState('')
  const [grantType, setGrantType] = useState<SubjectGrantType>('USER')
  const [permission, setPermission] = useState<SubjectDocumentPermission>('VIEW')

  const canManage = subject?.currentUserRole === 'OWNER' || subject?.currentUserRole === 'ADMIN'

  const load = useCallback(async (silent = false) => {
    if (!subjectId) return
    if (!silent) setLoading(true)
    try {
      const nextSubject = await getSubject(subjectId)
      const manager = nextSubject.currentUserRole === 'OWNER' || nextSubject.currentUserRole === 'ADMIN'
      const [nextDocuments, nextMembers, nextTeams] = await Promise.all([
        listSubjectDocuments(subjectId),
        manager ? listSubjectMembers(subjectId) : Promise.resolve([]),
        manager ? listSubjectTeams(subjectId) : Promise.resolve([]),
      ])
      setSubject(nextSubject); setDocuments(nextDocuments); setMembers(nextMembers); setTeams(nextTeams)
      if (!manager && (view === 'members' || view === 'teams')) setView('documents')
    } catch (error) {
      Alert.alert('Unable to load workspace', error instanceof Error ? error.message : 'Please try again.')
    } finally { setLoading(false); setRefreshing(false) }
  }, [subjectId, view])

  useEffect(() => { void load() }, [load])

  const visibleDocuments = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const source = view === 'shared' ? documents.filter((document) => document.accessRole !== 'OWNER' || document.isShared) : documents
    return source.filter((document) => {
      const roleMatch = accessFilter === 'ALL' || (accessFilter === 'EDITOR' ? document.accessRole === 'EDITOR' || document.accessRole === 'OWNER' : document.accessRole === 'VIEWER')
      return roleMatch && (!normalized || titleOf(document).toLowerCase().includes(normalized) || document.fileType?.toLowerCase().includes(normalized))
    }).sort((a, b) => (sortNewest ? -1 : 1) * (new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime()))
  }, [accessFilter, documents, query, sortNewest, view])
  const selectedDocuments = useMemo(() => documents.filter((document) => selectedIds.has(idOf(document))), [documents, selectedIds])
  const allVisibleSelected = visibleDocuments.length > 0 && visibleDocuments.every((document) => selectedIds.has(idOf(document)))

  const toggleSelection = (document: DocumentItem) => setSelectedIds((current) => { const next = new Set(current); const key = idOf(document); next.has(key) ? next.delete(key) : next.add(key); return next })

  const openAccess = async (items: DocumentItem[]) => {
    if (!items.length || !canManage) return
    setAccessDocuments(items); setGrants([]); setGrantTarget('')
    if (items.length === 1) {
      try { setGrants(await listSubjectDocumentAccess(subjectId, idOf(items[0]))) }
      catch (error) { setAccessDocuments([]); Alert.alert('Access unavailable', error instanceof Error ? error.message : 'Please try again.') }
    }
  }

  const grantAccess = async () => {
    if (!accessDocuments.length || !grantTarget) return
    setBusy('grant')
    let success = 0; const failures: string[] = []
    for (const document of accessDocuments) {
      try {
        const created = await createSubjectDocumentAccess(subjectId, idOf(document), { granteeType: grantType, granteeId: grantTarget, permission })
        success += 1
        if (accessDocuments.length === 1) setGrants((current) => [created, ...current.filter((item) => item.id !== created.id)])
      } catch (error) { failures.push(`${titleOf(document)}: ${error instanceof Error ? error.message : 'failed'}`) }
    }
    setBusy(''); setGrantTarget('')
    if (accessDocuments.length > 1) { setAccessDocuments([]); setSelectedIds(new Set()); await load(true) }
    Alert.alert(failures.length ? 'Access partially applied' : 'Access updated', failures.length ? `${success}/${accessDocuments.length} succeeded. ${failures[0]}` : `Access applied to ${success} document(s).`)
  }

  const inviteMember = async () => {
    if (!memberEmail.trim()) return
    setBusy('member')
    try {
      const created = await addSubjectMember(subjectId, { email: memberEmail.trim(), role: memberRole })
      setMembers((current) => [created, ...current.filter((item) => item.id !== created.id)]); setMemberEmail('')
      Alert.alert(created.status === 'PENDING' ? 'Invitation pending' : 'Member added', created.status === 'PENDING' ? `The user can join after registering.${notificationMessage(created.notificationStatus)}` : `Workspace member added.${notificationMessage(created.notificationStatus)}`)
    } catch (error) { Alert.alert('Invite failed', error instanceof Error ? error.message : 'Please try again.') }
    finally { setBusy('') }
  }

  const removeMember = (member: SubjectMember) => Alert.alert('Remove member', `Remove ${member.user.fullName || member.user.email} and revoke their direct access?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: async () => { setBusy(member.id); try { await removeSubjectMember(subjectId, member.id); await load(true); Alert.alert('Member removed', 'Workspace and team access were revoked.') } catch (error) { Alert.alert('Remove failed', error instanceof Error ? error.message : 'Please try again.') } finally { setBusy('') } } }])
  const toggleRole = async (member: SubjectMember) => { setBusy(member.id); try { const updated = await updateSubjectMemberRole(subjectId, member.id, member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN'); setMembers((current) => current.map((item) => item.id === updated.id ? updated : item)); Alert.alert('Role updated', `${updated.user.fullName || updated.user.email} is now ${updated.role}.`) } catch (error) { Alert.alert('Update failed', error instanceof Error ? error.message : 'Please try again.') } finally { setBusy('') } }
  const createTeam = async () => { if (!teamName.trim()) return; setBusy('team'); try { const created = await createSubjectTeam(subjectId, { name: teamName.trim(), description: teamDescription.trim() || undefined }); setTeams((current) => [created, ...current]); setTeamName(''); setTeamDescription(''); Alert.alert('Team created', `${created.name} is ready.`) } catch (error) { Alert.alert('Create failed', error instanceof Error ? error.message : 'Please try again.') } finally { setBusy('') } }
  const removeTeam = (team: SubjectTeam) => Alert.alert('Delete team', `Delete ${team.name} and revoke its document grants?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { try { await deleteSubjectTeam(subjectId, team.id); await load(true); Alert.alert('Team deleted', 'Team access was revoked.') } catch (error) { Alert.alert('Delete failed', error instanceof Error ? error.message : 'Please try again.') } } }])
  const addToTeam = async (team: SubjectTeam, userId: string) => { setBusy(`${team.id}:${userId}`); try { const updated = await addSubjectTeamMember(subjectId, team.id, userId); setTeams((current) => current.map((item) => item.id === updated.id ? updated : item)); Alert.alert('Member added', `Member added to ${team.name}.${notificationMessage(updated.notificationStatus)}`) } catch (error) { Alert.alert('Add failed', error instanceof Error ? error.message : 'Please try again.') } finally { setBusy('') } }
  const removeFromTeam = async (team: SubjectTeam, userId: string) => { setBusy(`${team.id}:${userId}`); try { const updated = await removeSubjectTeamMember(subjectId, team.id, userId); setTeams((current) => current.map((item) => item.id === updated.id ? updated : item)); Alert.alert('Member removed', `Member removed from ${team.name}.`) } catch (error) { Alert.alert('Remove failed', error instanceof Error ? error.message : 'Please try again.') } finally { setBusy('') } }
  const inviteToTeam = async () => { if (!teamInviteEmail.trim() || !teamInviteId) return; setBusy('team-invite'); try { const created = await addSubjectMember(subjectId, { email: teamInviteEmail.trim(), role: 'MEMBER', teamId: teamInviteId }); setTeamInviteEmail(''); await load(true); const team = teams.find((item) => item.id === teamInviteId); Alert.alert(created.status === 'PENDING' ? 'Invitation pending' : 'Member added', created.status === 'PENDING' ? `The user will join ${team?.name || 'the team'} after registering.${notificationMessage(created.notificationStatus)}` : `Member added to ${team?.name || 'the team'}.${notificationMessage(created.notificationStatus)}`) } catch (error) { Alert.alert('Invite failed', error instanceof Error ? error.message : 'Please try again.') } finally { setBusy('') } }

  const download = async (document: DocumentItem) => { try { const { downloadUrl } = await getDocumentDownloadUrl(idOf(document)); const { Linking } = await import('react-native'); await Linking.openURL(downloadUrl) } catch (error) { Alert.alert('Download failed', error instanceof Error ? error.message : 'Please try again.') } }
  const downloadSelected = async () => { for (const document of selectedDocuments) await download(document) }

  if (loading || !subject) return <SafeAreaView style={[styles.center, { backgroundColor: C.background }]}><ActivityIndicator color={C.primary} /></SafeAreaView>
  const tabs: Array<{ id: WorkspaceView; label: string; icon: typeof FileText; managerOnly?: boolean }> = [{ id: 'documents', label: 'Documents', icon: FileText }, { id: 'shared', label: 'Shared access', icon: Shield }, { id: 'members', label: 'Members', icon: Users, managerOnly: true }, { id: 'teams', label: 'Teams', icon: Users, managerOnly: true }]

  return <SafeAreaView style={[styles.safe, { backgroundColor: C.background }]}>
    <SubjectWorkspaceHeader canManage={canManage} onBack={() => router.back()} onUpload={() => router.push({ pathname: '/(app)/documents', params: { upload: '1', subjectId } } as any)} subject={subject} />
    <ScrollView horizontal contentContainerStyle={styles.tabs} showsHorizontalScrollIndicator={false}>{tabs.filter((item) => !item.managerOnly || canManage).map((item) => <Pressable key={item.id} onPress={() => { setView(item.id); setSelectedIds(new Set()) }} style={[styles.tab, { borderColor: C.cardBorder }, view === item.id && { backgroundColor: C.primary, borderColor: C.primary }]}><item.icon color={view === item.id ? '#fff' : C.textSecondary} size={17} /><Text style={[styles.tabText, { color: view === item.id ? '#fff' : C.textSecondary }]}>{item.label}</Text></Pressable>)}</ScrollView>
    {(view === 'documents' || view === 'shared') ? <View style={styles.toolbar}><View style={[styles.search, { borderColor: C.cardBorder }]}><Search color={C.muted} size={18} /><TextInput accessibilityLabel="Search documents" onChangeText={setQuery} placeholder="Search files" placeholderTextColor={C.muted} style={[styles.searchInput, { color: C.text }]} value={query} /></View><Pressable accessibilityLabel="Change document access filter" onPress={() => setAccessFilter((current) => current === 'ALL' ? 'VIEWER' : current === 'VIEWER' ? 'EDITOR' : 'ALL')} style={[styles.toolButton, { borderColor: C.cardBorder }]}><Shield color={C.primary} size={18} /><Text style={[styles.toolText, { color: C.text }]}>{accessFilter === 'ALL' ? 'All' : accessFilter === 'VIEWER' ? 'View' : 'Edit'}</Text></Pressable><Pressable accessibilityLabel="Change sort order" onPress={() => setSortNewest((current) => !current)} style={[styles.toolButton, { borderColor: C.cardBorder }]}><ArrowDownAZ color={C.primary} size={18} /></Pressable></View> : null}
    <ScrollView contentContainerStyle={[styles.content, selectedIds.size > 0 && { paddingBottom: 94 }]} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl colors={[C.primary]} onRefresh={() => { setRefreshing(true); void load(true) }} refreshing={refreshing} tintColor={C.primary} />}>
      {(view === 'documents' || view === 'shared') ? <><View style={styles.listHeading}><Text style={[styles.headingText, { color: C.text }]}>{view === 'shared' ? 'Shared access review' : 'Files'}</Text><Text style={[styles.countText, { color: C.muted }]}>{visibleDocuments.length} item(s)</Text></View><SubjectDocumentList canManage={canManage} documents={visibleDocuments} onAccess={(document) => void openAccess([document])} onLongPress={toggleSelection} onOpen={setPreviewDocument} onToggle={toggleSelection} selectedIds={selectedIds} /></> : null}
      {view === 'members' ? <SubjectMembersView busy={busy} canManage={canManage} email={memberEmail} members={members} onEmailChange={setMemberEmail} onInvite={() => void inviteMember()} onRemove={removeMember} onRoleChange={setMemberRole} onToggleRole={(member) => void toggleRole(member)} role={memberRole} /> : null}
      {view === 'teams' ? <SubjectTeamsView busy={busy} canManage={canManage} description={teamDescription} inviteEmail={teamInviteEmail} inviteTeamId={teamInviteId} members={members} name={teamName} onAdd={(team, userId) => void addToTeam(team, userId)} onCreate={() => void createTeam()} onDelete={removeTeam} onDescriptionChange={setTeamDescription} onInvite={() => void inviteToTeam()} onInviteEmailChange={setTeamInviteEmail} onInviteTeamChange={setTeamInviteId} onNameChange={setTeamName} onRemove={(team, userId) => void removeFromTeam(team, userId)} teams={teams} /> : null}
    </ScrollView>
    <SubjectSelectionBar allSelected={allVisibleSelected} canManage={canManage} count={selectedIds.size} onAccess={() => void openAccess(selectedDocuments)} onClear={() => setSelectedIds(new Set())} onDownload={() => void downloadSelected()} onSelectAll={() => setSelectedIds(allVisibleSelected ? new Set() : new Set(visibleDocuments.map(idOf)))} />
    <SubjectDocumentPreview canManage={canManage} document={previewDocument} onAccess={(document) => { setPreviewDocument(null); void openAccess([document]) }} onClose={() => setPreviewDocument(null)} onDownload={(document) => void download(document)} onEdit={(document) => { setPreviewDocument(null); router.push(`/(app)/document/${idOf(document)}` as any) }} subject={subject} />
    <SubjectAccessSheet busy={busy === 'grant'} documents={accessDocuments} grantType={grantType} grants={grants} members={members} onClose={() => setAccessDocuments([])} onGrant={() => void grantAccess()} onGrantType={(type) => { setGrantType(type); setGrantTarget('') }} onPermission={setPermission} onRevoke={async (grant) => { if (accessDocuments.length !== 1) return; try { await revokeSubjectDocumentAccess(subjectId, idOf(accessDocuments[0]), grant.id); setGrants((current) => current.filter((item) => item.id !== grant.id)); Alert.alert('Access revoked', `${grant.granteeName} no longer has this grant.`) } catch (error) { Alert.alert('Revoke failed', error instanceof Error ? error.message : 'Please try again.') } }} onTarget={setGrantTarget} onUpdate={async (grant, nextPermission) => { if (accessDocuments.length !== 1) return; try { const updated = await updateSubjectDocumentAccess(subjectId, idOf(accessDocuments[0]), grant.id, nextPermission); setGrants((current) => current.map((item) => item.id === updated.id ? updated : item)); Alert.alert('Permission updated', `${grant.granteeName} is now ${nextPermission === 'EDIT' ? 'Editor' : 'Viewer'}.`) } catch (error) { Alert.alert('Update failed', error instanceof Error ? error.message : 'Please try again.') } }} permission={permission} targetId={grantTarget} teams={teams} visible={accessDocuments.length > 0} />
  </SafeAreaView>
}

const styles = StyleSheet.create({ safe: { flex: 1 }, center: { alignItems: 'center', flex: 1, justifyContent: 'center' }, tabs: { gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm }, tab: { alignItems: 'center', borderRadius: Radius.md, borderWidth: 1, flexDirection: 'row', gap: 6, minHeight: 44, paddingHorizontal: Spacing.md }, tabText: { fontSize: FontSize.sm, fontWeight: '800' }, toolbar: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm }, search: { alignItems: 'center', borderRadius: Radius.md, borderWidth: 1, flex: 1, flexDirection: 'row', gap: Spacing.sm, minHeight: 46, paddingHorizontal: Spacing.md }, searchInput: { flex: 1, fontSize: FontSize.base, paddingVertical: 0 }, toolButton: { alignItems: 'center', borderRadius: Radius.md, borderWidth: 1, flexDirection: 'row', gap: 5, justifyContent: 'center', minHeight: 46, minWidth: 46, paddingHorizontal: Spacing.sm }, toolText: { fontSize: FontSize.xs, fontWeight: '800' }, content: { gap: Spacing.sm, padding: Spacing.md }, listHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, headingText: { fontSize: FontSize.md, fontWeight: '800' }, countText: { fontSize: FontSize.sm } })
