import { getStoredToken } from './authStorage'
import type {
  DocumentItem,
  DocumentsResponse,
  UpdateDocumentPayload,
  UploadDocumentPayload,
} from '../types/document'
import type { ApiResponse } from '../types/auth'

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/+$/, '') || 'http://localhost:3000'
const USE_MOCK_AUTH = process.env.EXPO_PUBLIC_AUTH_MOCK === '1'

let mockDocuments: DocumentsResponse = [
  {
    id: 'mock-doc-1',
    title: 'Quantum Entanglement Patterns',
    description: 'Review sample document',
    subject: 'Physics',
    fileUrl: '#',
    filePublicId: 'mock/quantum-entanglement-patterns',
    fileName: 'Quantum Entanglement Patterns.pdf',
    fileType: 'application/pdf',
    fileSize: 1840000,
    uploadedBy: 'mock-review-user',
    createdAt: new Date('2026-05-20T08:00:00.000Z').toISOString(),
    updatedAt: new Date('2026-05-20T08:00:00.000Z').toISOString(),
  },
  {
    id: 'mock-doc-2',
    title: 'Neural Network Topologies',
    description: 'Review sample document',
    subject: 'AI Research',
    fileUrl: '#',
    filePublicId: 'mock/neural-network-topologies',
    fileName: 'Neural Network Topologies.epub',
    fileType: 'application/epub+zip',
    fileSize: 932000,
    uploadedBy: 'mock-review-user',
    createdAt: new Date('2026-05-22T10:30:00.000Z').toISOString(),
    updatedAt: new Date('2026-05-22T10:30:00.000Z').toISOString(),
  },
  {
    id: 'mock-doc-3',
    title: 'Global Economic Shifts 2025',
    description: 'Review sample document',
    subject: 'Economics',
    fileUrl: '#',
    filePublicId: 'mock/global-economic-shifts-2025',
    fileName: 'Global Economic Shifts 2025.docx',
    fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    fileSize: 612000,
    uploadedBy: 'mock-review-user',
    createdAt: new Date('2026-05-24T13:45:00.000Z').toISOString(),
    updatedAt: new Date('2026-05-24T13:45:00.000Z').toISOString(),
  },
  {
    id: 'mock-doc-4',
    title: 'Calculus III — Multivariable Methods',
    description: 'Lecture notes HK1',
    subject: 'Mathematics',
    fileUrl: '#',
    filePublicId: 'mock/calculus-iii',
    fileName: 'Calculus III.pdf',
    fileType: 'application/pdf',
    fileSize: 2210000,
    uploadedBy: 'mock-review-user',
    createdAt: new Date('2025-10-05T09:00:00.000Z').toISOString(),
    updatedAt: new Date('2025-10-05T09:00:00.000Z').toISOString(),
  },
  {
    id: 'mock-doc-5',
    title: 'Data Structures & Algorithms',
    description: 'HK1 notes',
    subject: 'AI Research',
    fileUrl: '#',
    filePublicId: 'mock/dsa',
    fileName: 'DSA.pdf',
    fileType: 'application/pdf',
    fileSize: 1540000,
    uploadedBy: 'mock-review-user',
    createdAt: new Date('2025-11-12T11:00:00.000Z').toISOString(),
    updatedAt: new Date('2025-11-12T11:00:00.000Z').toISOString(),
  },
]

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getStoredToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function listDocuments(): Promise<DocumentsResponse> {
  if (USE_MOCK_AUTH) return mockDocuments

  const headers = await authHeaders()
  const res = await fetch(`${API_BASE_URL}/api/documents`, { headers })
  const json: ApiResponse<DocumentsResponse> = await res.json()
  return json.data ?? []
}

export async function searchDocuments(query: string): Promise<DocumentsResponse> {
  if (USE_MOCK_AUTH) {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return mockDocuments
    return mockDocuments.filter(
      (doc) =>
        doc.title.toLowerCase().includes(normalized) ||
        doc.subject?.toLowerCase().includes(normalized),
    )
  }

  const headers = await authHeaders()
  const res = await fetch(
    `${API_BASE_URL}/api/documents/search?q=${encodeURIComponent(query)}`,
    { headers },
  )
  const json: ApiResponse<DocumentsResponse> = await res.json()
  return json.data ?? []
}

export async function uploadDocument(payload: UploadDocumentPayload): Promise<DocumentItem> {
  if (USE_MOCK_AUTH) {
    const now = new Date().toISOString()
    const doc: DocumentItem = {
      id: `mock-doc-${Date.now()}`,
      title: payload.title,
      description: payload.description,
      subject: payload.subject || 'Uploaded',
      fileUrl: payload.file.uri,
      filePublicId: `mock/${payload.file.name}`,
      fileName: payload.file.name,
      fileType: payload.file.type,
      fileSize: payload.file.size ?? 0,
      uploadedBy: 'mock-review-user',
      createdAt: now,
      updatedAt: now,
    }
    mockDocuments = [doc, ...mockDocuments]
    return doc
  }

  const headers = await authHeaders()
  const form = new FormData()
  form.append('file', {
    uri: payload.file.uri,
    name: payload.file.name,
    type: payload.file.type,
  } as unknown as Blob)
  form.append('title', payload.title)
  if (payload.description) form.append('description', payload.description)
  if (payload.subject) form.append('subject', payload.subject)

  const res = await fetch(`${API_BASE_URL}/api/documents`, {
    method: 'POST',
    headers,
    body: form,
  })
  const json: ApiResponse<DocumentItem> = await res.json()
  if (!json.data) throw new Error(json.message || 'Upload failed')
  return json.data
}

export async function updateDocument(
  id: string,
  payload: UpdateDocumentPayload,
): Promise<DocumentItem> {
  if (USE_MOCK_AUTH) {
    const current = mockDocuments.find((doc) => doc.id === id)
    if (!current) throw new Error('Document not found')
    const updated = { ...current, ...payload, updatedAt: new Date().toISOString() }
    mockDocuments = mockDocuments.map((doc) => (doc.id === id ? updated : doc))
    return updated
  }

  const headers = await authHeaders()
  const res = await fetch(`${API_BASE_URL}/api/documents/${id}`, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json: ApiResponse<DocumentItem> = await res.json()
  if (!json.data) throw new Error(json.message || 'Update failed')
  return json.data
}

export async function deleteDocument(id: string): Promise<void> {
  if (USE_MOCK_AUTH) {
    mockDocuments = mockDocuments.filter((doc) => doc.id !== id)
    return
  }

  const headers = await authHeaders()
  await fetch(`${API_BASE_URL}/api/documents/${id}`, {
    method: 'DELETE',
    headers,
  })
}
