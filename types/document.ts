export type DocumentVisibility = 'PUBLIC' | 'PRIVATE'
export type DocumentStatus = 'ACTIVE' | 'ARCHIVED' | 'DELETED'
export type UploadMode = 'OVERRIDE' | 'APPEND'
export type ProcessingStage = 'UPLOADED' | 'EXTRACTING_TEXT' | 'CHUNKING' | 'EMBEDDING' | 'UPSERTING_VECTOR' | 'COMPLETED' | 'FAILED'

export interface DocumentVersion {
  id: string
  versionNumber: number
  uploadMode: UploadMode
  fileUrl: string
  fileName: string
  fileSize: number
  fileType: string
  totalChunks: number
  uploadReason?: string
  uploadedBy: string
  processingStage: ProcessingStage
  createdAt: string
  updatedAt: string
}

export interface DocumentMetadata {
  tags?: string[]
  category?: string
  author?: string
  language?: string
  semester?: string
  academicYear?: string
  institution?: string
  courseCode?: string
}

export interface DocumentAccessInfo {
  lastViewedAt?: string
  lastViewedBy?: string
  viewCount: number
  downloadCount: number
  sharedWith?: string[]
  sharedAt?: string
}

export interface DocumentItem {
  id: string
  title: string
  description?: string
  subject?: string
  subjectId?: string
  fileUrl: string
  filePublicId: string
  fileName: string
  fileType: string
  fileSize: number
  extractedText?: string
  uploadedBy: string
  ownerId?: string
  createdAt: string
  updatedAt: string

  // New fields
  visibility?: DocumentVisibility
  status?: DocumentStatus
  metadata?: DocumentMetadata
  accessInfo?: DocumentAccessInfo

  // Version info
  totalVersions?: number
  currentVersionId?: string
  totalChunks?: number

  // Indexing
  lastIndexedAt?: string
  extractionStatus?: 'COMPLETED' | 'FAILED'
}

export interface UploadDocumentPayload {
  file: {
    uri: string
    name: string
    type: string
    size?: number
  }
  title: string
  description?: string
  subject?: string
  subjectId?: string
  visibility?: DocumentVisibility
  metadata?: DocumentMetadata
  tags?: string[]
  author?: string
  semester?: string
  academicYear?: string
  onProgress?: (progress: number) => void
}

export interface UpdateDocumentPayload {
  title?: string
  description?: string
  subject?: string
  subjectId?: string
  visibility?: DocumentVisibility
  metadata?: DocumentMetadata
  status?: DocumentStatus
}

export interface DocumentFilter {
  search?: string
  subject?: string
  visibility?: DocumentVisibility
  status?: DocumentStatus
  fileType?: string
  dateFrom?: string
  dateTo?: string
  tags?: string[]
}

export type DocumentsResponse = DocumentItem[]
