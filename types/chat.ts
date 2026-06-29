// ── Chat types — mirrors BE api.types.ts & rag.types.ts ──────────────────────

export type RagMode = 'basic' | 'corrective'

export interface RagEvaluation {
  retrievedChunksCount: number
  relevantChunksCount: number
  averageRelevanceScore: number
  correctiveAttempted: boolean
  isGrounded: boolean
  confidenceScore: number
  responseTimeMs: number
  usedFallbackChunks?: boolean
  relevanceThreshold?: number
  warning?: string
  detectedIntent?: string
  retrievedSections?: string[]
}

export interface ChatSource {
  documentId: string
  title: string
  chunkIndex: number
  section?: string
  inferredSection?: string
  semanticSectionLabel?: string
  contentPreview: string
  relevanceScore?: number
}

// ── Request payloads ──────────────────────────────────────────────────────────

export interface AskPayload {
  question: string
  threadId?: string
  documentId?: string
  documentIds?: string[]
  subject?: string
  subjectId?: string
  scope?: string
  mode?: RagMode
}

// ── Response shapes ───────────────────────────────────────────────────────────

export interface AskResponse {
  answer: string
  threadId?: string
  mode?: RagMode
  originalQuestion?: string
  rewrittenQuery?: string
  sources: ChatSource[]
  evaluation?: RagEvaluation
}

export interface ChatHistoryItem {
  id: string
  userId: string
  question: string
  originalQuestion?: string
  rewrittenQuery?: string
  answer: string
  sources: ChatSource[]
  documentId?: string
  subject?: string
  mode?: RagMode
  evaluation?: RagEvaluation
  createdAt: string
  updatedAt: string
}

export interface ChatHistoryListResponse {
  histories: ChatHistoryItem[]
  total: number
}
