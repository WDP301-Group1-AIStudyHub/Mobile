import apiClient from './apiClient'
import type { ApiResponse } from '../types/auth'

export type MaterialType = 'MCQ' | 'FLASHCARD'
export type MaterialStatus = 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED'

export interface IMcqItem {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

export interface IFlashcardItem {
  front: string
  back: string
}

export interface StudyMaterial {
  id: string
  _id: string
  title: string
  userId: string
  documentId?: string | null
  sourceDocumentId?: string
  sourceDocumentTitle?: string
  sourceStatus?: 'ACTIVE' | 'DELETED'
  sourceDeletedAt?: string | null
  type: MaterialType
  status: MaterialStatus
  error?: string
  items: (IMcqItem | IFlashcardItem)[]
  topicsCovered?: string[]
  followUpTopics?: string[]
  createdAt: string
  updatedAt: string
}

export async function generateStudyMaterial(
  documentId: string,
  type: MaterialType,
  count: number,
  difficulty?: string,
  topicFocus?: string
): Promise<StudyMaterial> {
  const { data } = await apiClient.post<ApiResponse<StudyMaterial>>('/api/study-materials/generate', {
    documentId,
    type,
    count,
    difficulty,
    topicFocus,
  })
  if (!data.data) throw new Error(data.message || 'Generate failed')
  return data.data
}

export async function getStudyMaterialsByDocument(documentId: string): Promise<StudyMaterial[]> {
  const { data } = await apiClient.get<ApiResponse<StudyMaterial[]>>(`/api/study-materials/document/${documentId}`)
  return data.data || []
}

export async function getStudyMaterialById(id: string): Promise<StudyMaterial> {
  const { data } = await apiClient.get<ApiResponse<StudyMaterial>>(`/api/study-materials/${id}`)
  if (!data.data) throw new Error(data.message || 'Fetch detail failed')
  return data.data
}

export async function getAllStudyMaterials(): Promise<StudyMaterial[]> {
  const { data } = await apiClient.get<ApiResponse<StudyMaterial[]>>('/api/study-materials')
  return data.data || []
}

export async function deleteStudyMaterial(id: string): Promise<void> {
  const { data } = await apiClient.delete<ApiResponse<void>>(`/api/study-materials/${id}`)
  if (data.success === false) throw new Error(data.message || 'Delete failed')
}

export async function explainCardConcept(materialId: string, cardIndex: number): Promise<string> {
  const { data } = await apiClient.post<ApiResponse<{ explanation: string }>>('/api/study-materials/explain', {
    materialId,
    cardIndex,
  })
  if (!data.data) throw new Error(data.message || 'Explain failed')
  return data.data.explanation
}
