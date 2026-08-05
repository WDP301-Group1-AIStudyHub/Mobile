export type DocumentVisibility = 'PUBLIC' | 'PRIVATE'
export type DocumentStatus = 'ACTIVE' | 'ARCHIVED' | 'DELETED'
export type DocumentAccessRole = 'OWNER' | 'EDITOR' | 'VIEWER'
export type DocumentSharePermission = 'VIEW' | 'EDIT'
export type EmailDeliveryStatus = 'ACCEPTED' | 'FAILED' | 'SKIPPED'

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
  subject?: string | {
    _id?: string
    id?: string
    name?: string
    code?: string
    color?: string
    semester?: string
  } | null
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

  totalChunks?: number

  // Indexing
  lastIndexedAt?: string
  ragStatus?: 'INDEXED' | 'DELETE_PENDING' | 'DELETED' | 'INDEXING' | 'FAILED' | 'NOT_AVAILABLE'
  ragError?: string
  ragStatusUpdatedAt?: string | null
  extractionStatus?: 'COMPLETED' | 'FAILED'
  deletedAt?: string | null
  deletedBy?: string | null
  trashExpiresAt?: string | null
  trashDaysRemaining?: number | null
  accessRole?: DocumentAccessRole
  isShared?: boolean
  // Strict `document.ownerId === current user`. Distinct from accessRole,
  // which also reads "OWNER" for admins and subject-workspace owners — using
  // accessRole for owner-gated AI features would let them spend the real
  // uploader's quota. Only present on the single-document GET, not on lists.
  isOwner?: boolean
  sharedBy?: {
    id: string
    fullName: string
    email: string
  }
  personalSubjectId?: string
  personalSubject?: {
    _id?: string
    id?: string
    name?: string
    code?: string
    color?: string
    semester?: string
  } | null
  shareContext?: 'SUBJECT_WORKSPACE' | 'PERSONAL_SHARE'
  isStarred?: boolean
  starredAt?: string | null
}

export interface DocumentShare {
  id: string
  documentId: string
  sharedWithUser: {
    id: string
    fullName: string
    email: string
    avatar?: string
  }
  permission: DocumentSharePermission
  sharedBy: string
  status: 'ACTIVE' | 'PENDING'
  notificationStatus?: EmailDeliveryStatus
  expiresAt?: string
  createdAt: string
  updatedAt: string
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

export interface UpdateSharedDocumentProfilePayload {
  subjectId?: string | null
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
