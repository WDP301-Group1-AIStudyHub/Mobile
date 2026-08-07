import type {
  SubjectItem,
  CreateSubjectPayload,
  UpdateSubjectPayload,
  SubjectsResponse,
  SubjectAccessGrant,
  SubjectDocumentPermission,
  SubjectGrantType,
  SubjectMember,
  SubjectTeam,
  SubjectWorkspaceRole,
} from '../types/subject'
import type { DocumentItem } from '../types/document'
import type { ApiResponse } from '../types/auth'
import apiClient from './apiClient'

export async function listSubjects(): Promise<SubjectsResponse> {
  const { data } = await apiClient.get<ApiResponse<{ items: SubjectItem[]; total: number } | SubjectItem[]>>('/api/subjects')

  if (Array.isArray(data.data)) {
    return data.data
  } else if (data.data && Array.isArray((data.data as any).items)) {
    return (data.data as any).items
  }

  return []
}

export async function createSubject(payload: CreateSubjectPayload): Promise<SubjectItem> {
  const { data } = await apiClient.post<ApiResponse<SubjectItem>>('/api/subjects', payload)
  if (!data.data) throw new Error(data.message || 'Create failed')
  return data.data
}

export async function updateSubject(id: string, payload: UpdateSubjectPayload): Promise<SubjectItem> {
  const { data } = await apiClient.put<ApiResponse<SubjectItem>>(`/api/subjects/${id}`, payload)
  if (!data.data) throw new Error(data.message || 'Update failed')
  return data.data
}

export async function deleteSubject(id: string): Promise<void> {
  await apiClient.delete(`/api/subjects/${id}`)
}

function unwrap<T>(response: ApiResponse<T>, fallback: string): T {
  if (response.data === undefined) throw new Error(response.message || fallback)
  return response.data
}

export async function getSubject(id: string): Promise<SubjectItem> {
  const { data } = await apiClient.get<ApiResponse<SubjectItem>>(`/api/subjects/${id}`)
  return unwrap(data, 'Unable to load subject')
}

export async function listSubjectMembers(subjectId: string): Promise<SubjectMember[]> {
  const { data } = await apiClient.get<ApiResponse<SubjectMember[]>>(`/api/subjects/${subjectId}/members`)
  return data.data || []
}

export async function addSubjectMember(subjectId: string, payload: { email: string; role: Exclude<SubjectWorkspaceRole, 'OWNER'>; teamId?: string }): Promise<SubjectMember> {
  const { data } = await apiClient.post<ApiResponse<SubjectMember>>(`/api/subjects/${subjectId}/members`, payload)
  return unwrap(data, 'Unable to invite member')
}

export async function updateSubjectMemberRole(subjectId: string, memberId: string, role: Exclude<SubjectWorkspaceRole, 'OWNER'>): Promise<SubjectMember> {
  const { data } = await apiClient.patch<ApiResponse<SubjectMember>>(`/api/subjects/${subjectId}/members/${memberId}/role`, { role })
  return unwrap(data, 'Unable to update member role')
}

export async function removeSubjectMember(subjectId: string, memberId: string): Promise<void> {
  await apiClient.delete(`/api/subjects/${subjectId}/members/${memberId}`)
}

export async function listSubjectTeams(subjectId: string): Promise<SubjectTeam[]> {
  const { data } = await apiClient.get<ApiResponse<SubjectTeam[]>>(`/api/subjects/${subjectId}/teams`)
  return data.data || []
}

export async function createSubjectTeam(subjectId: string, payload: { name: string; description?: string }): Promise<SubjectTeam> {
  const { data } = await apiClient.post<ApiResponse<SubjectTeam>>(`/api/subjects/${subjectId}/teams`, payload)
  return unwrap(data, 'Unable to create team')
}

export async function updateSubjectTeam(subjectId: string, teamId: string, payload: { name?: string; description?: string }): Promise<SubjectTeam> {
  const { data } = await apiClient.put<ApiResponse<SubjectTeam>>(`/api/subjects/${subjectId}/teams/${teamId}`, payload)
  return unwrap(data, 'Unable to update team')
}

export async function deleteSubjectTeam(subjectId: string, teamId: string): Promise<void> {
  await apiClient.delete(`/api/subjects/${subjectId}/teams/${teamId}`)
}

export async function addSubjectTeamMember(subjectId: string, teamId: string, userId: string): Promise<SubjectTeam> {
  const { data } = await apiClient.post<ApiResponse<SubjectTeam>>(`/api/subjects/${subjectId}/teams/${teamId}/members`, { userId })
  return unwrap(data, 'Unable to add team member')
}

export async function removeSubjectTeamMember(subjectId: string, teamId: string, userId: string): Promise<SubjectTeam> {
  const { data } = await apiClient.delete<ApiResponse<SubjectTeam>>(`/api/subjects/${subjectId}/teams/${teamId}/members/${userId}`)
  return unwrap(data, 'Unable to remove team member')
}

export async function listSubjectDocuments(subjectId: string): Promise<DocumentItem[]> {
  const { data } = await apiClient.get<ApiResponse<DocumentItem[]>>(`/api/subjects/${subjectId}/documents`)
  return data.data || []
}

export async function listSubjectDocumentAccess(subjectId: string, documentId: string): Promise<SubjectAccessGrant[]> {
  const { data } = await apiClient.get<ApiResponse<SubjectAccessGrant[]>>(`/api/subjects/${subjectId}/documents/${documentId}/access`)
  return data.data || []
}

export async function createSubjectDocumentAccess(subjectId: string, documentId: string, payload: { granteeType: SubjectGrantType; granteeId: string; permission: SubjectDocumentPermission }): Promise<SubjectAccessGrant> {
  const { data } = await apiClient.post<ApiResponse<SubjectAccessGrant>>(`/api/subjects/${subjectId}/documents/${documentId}/access`, payload)
  return unwrap(data, 'Unable to grant document access')
}

export async function updateSubjectDocumentAccess(subjectId: string, documentId: string, grantId: string, permission: SubjectDocumentPermission): Promise<SubjectAccessGrant> {
  const { data } = await apiClient.patch<ApiResponse<SubjectAccessGrant>>(`/api/subjects/${subjectId}/documents/${documentId}/access/${grantId}`, { permission })
  return unwrap(data, 'Unable to update document access')
}

export async function revokeSubjectDocumentAccess(subjectId: string, documentId: string, grantId: string): Promise<void> {
  await apiClient.delete(`/api/subjects/${subjectId}/documents/${documentId}/access/${grantId}`)
}
