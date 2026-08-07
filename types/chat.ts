// ── Chat types — mirrors BE api.types.ts & rag.types.ts ──────────────────────

export type RagMode = 'basic' | 'corrective' | 'dr-rag' | 'agentic'

export interface AgentToolCallSummary {
  tool: string
  input?: unknown
  resultSummary: string
}

export interface RagEvaluation {
  retrievedChunksCount: number
  relevantChunksCount: number
  averageRelevanceScore: number
  correctiveAttempted?: boolean
  isGrounded: boolean
  confidenceScore: number
  responseTimeMs: number
  usedFallbackChunks?: boolean
  relevanceThreshold?: number
  warning?: string
  detectedIntent?: string
  retrievedSections?: string[]
  retrievalQueries?: string[]
  contextChunksUsed?: number
  fallbackGenerated?: boolean
  fallbackReason?: string
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
  sourceStatus?: 'ACTIVE' | 'DELETED'
  sourceDeletedAt?: string
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
  citedSources?: ChatSource[]
  evaluation?: RagEvaluation
  agent?: {
    steps: number
    toolCalls: AgentToolCallSummary[]
  }
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
  sourceStatus?: 'ACTIVE' | 'DELETED'
  sourceDeletedAt?: string
}

export interface ChatHistoryListResponse {
  histories: ChatHistoryItem[]
  total: number
}
export type ChatScope = 'single_document' | 'subject_all' | 'document_set' | 'library_all'
