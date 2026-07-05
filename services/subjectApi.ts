import type {
  SubjectItem,
  CreateSubjectPayload,
  UpdateSubjectPayload,
  SubjectsResponse,
} from '../types/subject'
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
