import apiClient from './apiClient'
import type { ApiResponse } from '../types/auth'
import type { ChatScope, ChatSource } from '../types/chat'

export type ArtifactType = 'FLASHCARD' | 'QUIZ' | 'MINDMAP' | 'REPORT' | 'DATA_TABLE' | 'SUMMARY'
export type ArtifactStatus = 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED'
export interface MindmapNode { label: string; children?: MindmapNode[] }
export type ArtifactContent = { items: unknown[] } | { root: MindmapNode } | { markdown: string } | { columns: string[]; rows: string[][] }
export interface ArtifactRecord {
  _id: string; userId: string; threadId?: string; type: ArtifactType; status: ArtifactStatus; title: string
  instructions?: string; content?: ArtifactContent; sourceDocumentIds: string[]
  // SUMMARY-only: the document this is a summary of.
  summaryDocumentId?: string
  subjectId?: string; scope?: string; sources?: ChatSource[]; error?: string; createdAt: string; updatedAt: string
  // Only populated by GET /api/artifacts/:id — true if the caller owns the artifact.
  isOwner?: boolean
  // Only populated by POST /api/documents/:id/summaries — true on a cache hit (no quota charged).
  cached?: boolean
}
export interface InitiateArtifactPayload { type: ArtifactType; title?: string; instructions?: string; threadId?: string; documentId?: string; documentIds?: string[]; subject?: string; subjectId?: string; scope?: ChatScope }

function unwrap<T>(response: ApiResponse<T>, fallback: string): T {
  if (response.data === undefined) throw new Error(response.message || fallback)
  return response.data
}

export async function initiateArtifact(payload: InitiateArtifactPayload): Promise<ArtifactRecord> {
  const { data } = await apiClient.post<ApiResponse<ArtifactRecord>>('/api/artifacts', payload)
  return unwrap(data, 'Failed to start artifact generation')
}
export async function listArtifacts(threadId?: string): Promise<ArtifactRecord[]> {
  const { data } = await apiClient.get<ApiResponse<ArtifactRecord[]>>('/api/artifacts', { params: threadId ? { threadId } : undefined })
  return data.data || []
}
export async function getArtifactById(id: string): Promise<ArtifactRecord> {
  const { data } = await apiClient.get<ApiResponse<ArtifactRecord>>(`/api/artifacts/${id}`)
  return unwrap(data, 'Failed to fetch artifact')
}
export async function deleteArtifact(id: string): Promise<void> { await apiClient.delete(`/api/artifacts/${id}`) }

/**
 * The only owner-gated artifact creation route. A cache hit returns 200 and
 * never charges quota; a genuinely new generation returns 202 and does. The
 * status code (not the body) is what tells them apart.
 */
export async function createDocumentSummary(documentId: string): Promise<{ record: ArtifactRecord; status: 200 | 202 }> {
  const response = await apiClient.post<ApiResponse<ArtifactRecord>>(`/api/documents/${documentId}/summaries`, {})
  return { record: unwrap(response.data, 'Failed to create summary'), status: response.status as 200 | 202 }
}

export type ArtifactSharePermission = 'VIEW'
export interface ArtifactShareUser { id: string; fullName: string; email: string; avatar?: string }
export interface ArtifactShare {
  id: string; artifactId: string; sharedWithUser: ArtifactShareUser
  permission: ArtifactSharePermission; sharedBy: string; createdAt: string; updatedAt: string
}

export async function shareArtifact(artifactId: string, email: string): Promise<ArtifactShare> {
  const { data } = await apiClient.post<ApiResponse<ArtifactShare>>(`/api/artifacts/${artifactId}/shares`, { email, permission: 'VIEW' })
  return unwrap(data, 'Failed to share summary')
}

export async function listArtifactShares(artifactId: string): Promise<ArtifactShare[]> {
  const { data } = await apiClient.get<ApiResponse<ArtifactShare[]>>(`/api/artifacts/${artifactId}/shares`)
  return data.data || []
}

export async function revokeArtifactShare(artifactId: string, shareId: string): Promise<void> {
  await apiClient.delete(`/api/artifacts/${artifactId}/shares/${shareId}`)
}

export interface SharedArtifactEntry { artifact: ArtifactRecord; sharedBy: ArtifactShareUser | null; sharedAt: string }

export async function listSummariesSharedWithMe(): Promise<SharedArtifactEntry[]> {
  const { data } = await apiClient.get<ApiResponse<SharedArtifactEntry[]>>('/api/artifacts/shared-with-me')
  return data.data || []
}
