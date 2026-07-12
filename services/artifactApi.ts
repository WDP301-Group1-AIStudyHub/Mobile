import apiClient from './apiClient'
import type { ApiResponse } from '../types/auth'
import type { ChatScope, ChatSource } from '../types/chat'

export type ArtifactType = 'FLASHCARD' | 'QUIZ' | 'MINDMAP' | 'REPORT' | 'DATA_TABLE'
export type ArtifactStatus = 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED'
export interface MindmapNode { label: string; children?: MindmapNode[] }
export type ArtifactContent = { items: unknown[] } | { root: MindmapNode } | { markdown: string } | { columns: string[]; rows: string[][] }
export interface ArtifactRecord { _id: string; userId: string; threadId?: string; type: ArtifactType; status: ArtifactStatus; title: string; instructions?: string; content?: ArtifactContent; sourceDocumentIds: string[]; subjectId?: string; scope?: string; sources?: ChatSource[]; error?: string; createdAt: string; updatedAt: string }
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
