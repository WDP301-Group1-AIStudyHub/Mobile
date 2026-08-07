import type {
  DocumentItem,
  DocumentsResponse,
  DocumentFilter,
  DocumentShare,
  DocumentSharePermission,
  UpdateSharedDocumentProfilePayload,
  UpdateDocumentPayload,
  UploadDocumentPayload,
} from '../types/document'
import type { ApiResponse } from '../types/auth'
import apiClient from './apiClient'

function normalizeSubjectId(value: unknown): string | undefined {
  if (!value) return undefined
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value !== null) {
    const obj = value as { _id?: string; id?: string }
    return obj._id || obj.id
  }
  return undefined
}

function normalizeSubject(value: unknown): DocumentItem['personalSubject'] {
  if (!value || typeof value !== 'object') return null
  const subject = value as Record<string, unknown>
  const id = normalizeSubjectId(value)
  if (!id || typeof subject.name !== 'string') return null
  return {
    _id: id,
    id,
    name: subject.name,
    code: typeof subject.code === 'string' ? subject.code : undefined,
    color: typeof subject.color === 'string' ? subject.color : undefined,
    semester: typeof subject.semester === 'string' ? subject.semester : undefined,
  }
}

function normalizeDoc(doc: DocumentItem): DocumentItem {
  const raw = doc as DocumentItem & {
    subjectId?: unknown
    personalSubjectId?: unknown
    extractedText?: string
  }
  const personalSubject = normalizeSubject(raw.personalSubject)
  const workspaceSubject = normalizeSubject(raw.subject) || normalizeSubject(raw.subjectId)
  const resolvedSubject = raw.shareContext === 'SUBJECT_WORKSPACE'
    ? workspaceSubject
    : personalSubject || workspaceSubject

  return {
    ...raw,
    subjectId: resolvedSubject?._id || normalizeSubjectId(raw.subjectId),
    subject: resolvedSubject || (typeof raw.subject === 'string' ? raw.subject : undefined),
    personalSubjectId: normalizeSubjectId(raw.personalSubjectId),
    personalSubject,
  }
}

function trimDoc(doc: DocumentItem): DocumentItem {
  const { extractedText: _et, ...rest } = doc as DocumentItem & { extractedText?: string }
  return rest
}

export async function listDocuments(filter?: DocumentFilter): Promise<DocumentsResponse> {
  const params = new URLSearchParams()
  if (filter?.search) params.append('keyword', filter.search)
  if (filter?.visibility) params.append('visibility', filter.visibility)
  if (filter?.subject) params.append('subjectId', filter.subject)
  if (filter?.status) params.append('status', filter.status)
  params.append('limit', '100')

  const { data } = await apiClient.get<ApiResponse<{ documents: DocumentItem[]; total: number }>>(
    `/api/documents?${params.toString()}`
  )
  const docs = data.data?.documents ?? (data.data as unknown as DocumentItem[]) ?? []
  return (Array.isArray(docs) ? docs : []).map(trimDoc).map(normalizeDoc)
}

export async function listSharedWithMe(): Promise<DocumentsResponse> {
  const { data } = await apiClient.get<{ data?: DocumentItem[] }>(
    '/api/documents/shared-with-me?limit=100',
  )
  return (Array.isArray(data.data) ? data.data : []).map(trimDoc).map(normalizeDoc)
}

export async function listStarredDocuments(): Promise<DocumentsResponse> {
  const { data } = await apiClient.get<{ data?: DocumentItem[] }>(
    '/api/documents/starred?limit=100',
  )
  return (Array.isArray(data.data) ? data.data : []).map(trimDoc).map(normalizeDoc)
}

export async function listTrashDocuments(): Promise<DocumentsResponse> {
  const { data } = await apiClient.get<{ data?: DocumentItem[] }>(
    '/api/documents/trash?limit=100',
  )
  return (Array.isArray(data.data) ? data.data : []).map(trimDoc).map(normalizeDoc)
}

export async function getDocument(id: string): Promise<DocumentItem> {
  const { data } = await apiClient.get<ApiResponse<DocumentItem>>(`/api/documents/${id}`)
  if (!data.data) throw new Error('Document not found')
  // Keep extractedText for the detail page (no trimDoc)
  return normalizeDoc(data.data)
}

export async function searchDocuments(query: string): Promise<DocumentsResponse> {
  const { data } = await apiClient.get<ApiResponse<DocumentsResponse>>('/api/documents/search', {
    params: { q: query },
  })
  const docs = data.data ?? []
  return (Array.isArray(docs) ? docs : []).map(trimDoc).map(normalizeDoc)
}

export async function uploadDocument(payload: UploadDocumentPayload): Promise<DocumentItem> {
  const form = new FormData()
  form.append('file', {
    uri: payload.file.uri,
    name: payload.file.name,
    type: payload.file.type,
  } as unknown as Blob)
  form.append('title', payload.title)
  if (payload.description) form.append('description', payload.description)
  if (payload.subject) form.append('subject', payload.subject)
  if (payload.subjectId) form.append('subjectId', payload.subjectId)
  if (payload.visibility) form.append('visibility', payload.visibility)
  if (payload.metadata) form.append('metadata', JSON.stringify(payload.metadata))
  if (payload.tags?.length) form.append('tags', JSON.stringify(payload.tags))
  if (payload.author) form.append('author', payload.author)
  if (payload.semester) form.append('semester', payload.semester)
  if (payload.academicYear) form.append('academicYear', payload.academicYear)

  try {
    const { data } = await apiClient.post<ApiResponse<DocumentItem>>('/api/documents/upload', form, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (payload.onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          payload.onProgress(percentCompleted)
        }
      },
    })

    if (!data.data) throw new Error(data.message || 'Upload failed')
    return normalizeDoc(trimDoc(data.data))
  } catch (error: any) {
    let errorMessage = 'Upload failed'
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error.message) {
      errorMessage = error.message
    }
    throw new Error(errorMessage)
  }
}

export async function updateDocument(
  id: string,
  payload: UpdateDocumentPayload,
): Promise<DocumentItem> {
  const { data } = await apiClient.put<ApiResponse<DocumentItem>>(
    `/api/documents/${id}`,
    payload,
  )
  if (!data.data) throw new Error(data.message || 'Update failed')
  return normalizeDoc(data.data)
}

export async function updateSharedDocumentProfile(
  id: string,
  payload: UpdateSharedDocumentProfilePayload,
): Promise<DocumentItem> {
  const { data } = await apiClient.patch<ApiResponse<DocumentItem>>(
    `/api/documents/${id}/shared-profile`,
    payload,
  )
  if (!data.data) throw new Error(data.message || 'Update failed')
  return normalizeDoc(data.data)
}

export async function deleteDocument(id: string): Promise<{ ragStatus: string; warning?: string }> {
  try {
    const { data } = await apiClient.delete<ApiResponse<{ ragStatus: string; warning?: string }>>(
      `/api/documents/${id}`,
    )
    if (!data.data) throw new Error(data.message || 'Delete failed')
    return data.data
  } catch (error: any) {
    let errorMessage = 'Delete failed'
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error.message) {
      errorMessage = error.message
    }
    throw new Error(errorMessage)
  }
}

export async function restoreDocument(id: string): Promise<DocumentItem> {
  const { data } = await apiClient.post<ApiResponse<DocumentItem>>(
    `/api/documents/${id}/restore`,
  )
  if (!data.data) throw new Error(data.message || 'Restore failed')
  return normalizeDoc(trimDoc(data.data))
}

export async function deleteDocumentPermanently(id: string): Promise<void> {
  await apiClient.delete(`/api/documents/${id}/permanent`)
}

export async function emptyTrash(): Promise<{
  deletedCount: number
  failedCount: number
  failures: Array<{ documentId: string; stage: string; message: string }>
}> {
  const { data } = await apiClient.delete<ApiResponse<{
    deletedCount: number
    failedCount: number
    failures: Array<{ documentId: string; stage: string; message: string }>
  }>>(
    '/api/documents/trash/empty',
  )
  if (!data.data) throw new Error(data.message || 'Empty trash failed')
  return data.data
}

export async function setDocumentStar(
  id: string,
  starred: boolean,
): Promise<DocumentItem> {
  const { data } = await apiClient.patch<ApiResponse<DocumentItem>>(
    `/api/documents/${id}/star`,
    { starred },
  )
  if (!data.data) throw new Error(data.message || 'Star update failed')
  return normalizeDoc(trimDoc(data.data))
}

export async function getDocumentDownloadUrl(
  documentId: string,
): Promise<{ downloadUrl: string; fileName?: string }> {
  const { data } = await apiClient.get<
    ApiResponse<{ downloadUrl: string; fileName?: string }>
  >(`/api/documents/${documentId}/download`)
  if (!data.data) throw new Error(data.message || 'Download URL not available')
  return data.data
}

export async function listDocumentShares(documentId: string): Promise<DocumentShare[]> {
  const { data } = await apiClient.get<ApiResponse<DocumentShare[]>>(
    `/api/documents/${documentId}/share`,
  )
  return data.data ?? []
}

export async function shareDocument(
  documentId: string,
  payload: { email: string; permission: DocumentSharePermission },
): Promise<DocumentShare> {
  const { data } = await apiClient.post<ApiResponse<DocumentShare>>(
    `/api/documents/${documentId}/share`,
    payload,
  )
  if (!data.data) throw new Error(data.message || 'Unable to share document')
  return data.data
}

export async function updateDocumentShare(
  documentId: string,
  shareId: string,
  permission: DocumentSharePermission,
): Promise<DocumentShare> {
  const { data } = await apiClient.patch<ApiResponse<DocumentShare>>(
    `/api/documents/${documentId}/share/${shareId}`,
    { permission },
  )
  if (!data.data) throw new Error(data.message || 'Unable to update permission')
  return data.data
}

export async function revokeDocumentShare(
  documentId: string,
  shareId: string,
): Promise<void> {
  await apiClient.delete(`/api/documents/${documentId}/share/${shareId}`)
}

export async function resendDocumentShareEmail(
  documentId: string,
  shareId: string,
): Promise<DocumentShare> {
  const { data } = await apiClient.post<ApiResponse<DocumentShare>>(
    `/api/documents/${documentId}/share/${shareId}/resend-email`,
  )
  if (!data.data) throw new Error(data.message || 'Unable to resend email')
  return data.data
}
