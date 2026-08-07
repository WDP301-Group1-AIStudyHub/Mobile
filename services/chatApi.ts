import axios from 'axios'
import apiClient from './apiClient'
import type { ApiResponse } from '../types/auth'
import type {
  AskPayload,
  AskResponse,
  ChatHistoryItem,
  ChatHistoryListResponse,
} from '../types/chat'

// ── Error helper ──────────────────────────────────────────────────────────────

export class ChatApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ChatApiError'
    this.status = status
  }
}

function handleAxiosError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message || error.message || 'Request failed'
    const status = error.response?.status ?? 500
    throw new ChatApiError(message, status)
  }
  throw error
}

// ── POST /api/chat/ask ────────────────────────────────────────────────────────
// Requires auth. Sends question + optional documentId/subject/mode.
// BE returns answer, sources, evaluation, rewrittenQuery...

export async function askQuestion(payload: AskPayload): Promise<AskResponse> {
  try {
    const { data } = await apiClient.post<ApiResponse<AskResponse>>('/api/chat/ask', payload)
    if (!data.data) throw new ChatApiError('No data returned', 500)
    return data.data
  } catch (error) {
    return handleAxiosError(error)
  }
}

// ── GET /api/chat/history ─────────────────────────────────────────────────────
// Fetch all chat history for the current user (sorted by createdAt DESC)

export async function listChatHistory(): Promise<ChatHistoryListResponse> {
  try {
    const { data } = await apiClient.get<ApiResponse<ChatHistoryListResponse>>('/api/chat/history')
    if (!data.data) return { histories: [], total: 0 }
    return data.data
  } catch (error) {
    return handleAxiosError(error)
  }
}

// ── GET /api/chat/history/:id ─────────────────────────────────────────────────
// Fetch detail of a single chat history item by id

export async function getChatHistory(id: string): Promise<ChatHistoryItem> {
  try {
    const { data } = await apiClient.get<ApiResponse<ChatHistoryItem>>(`/api/chat/history/${id}`)
    if (!data.data) throw new ChatApiError('Chat history not found', 404)
    return data.data
  } catch (error) {
    return handleAxiosError(error)
  }
}

// ── DELETE /api/chat/history/:id ──────────────────────────────────────────────
// Delete a single chat history item (only own items can be deleted)

export async function deleteChatHistory(id: string): Promise<void> {
  try {
    await apiClient.delete(`/api/chat/history/${id}`)
  } catch (error) {
    return handleAxiosError(error)
  }
}

// ── Thread based history APIs ────────────────────────────────────────────────

export interface ChatThreadItem {
  id: string
  _id?: string
  ownerId: string
  title: string
  status: 'ACTIVE' | 'ARCHIVED'
  lastMessageAt: string
  messageCount: number
  scope?: string
  subjectId?: string
  documentId?: string
  documentIds?: string[]
  mode?: string
  sourceStatus?: 'ACTIVE' | 'DELETED'
  sourceDeletedAt?: string
  createdAt: string
  updatedAt: string
}

export interface ChatThreadMessage {
  id: string
  _id?: string
  userId: string
  threadId: string
  question: string
  originalQuestion?: string
  rewrittenQuery?: string
  answer: string
  sources: any[]
  documentId?: string
  documentIds?: string[]
  subjectId?: string
  scope: string
  mode: string
  sourceStatus?: 'ACTIVE' | 'DELETED'
  sourceDeletedAt?: string
  createdAt: string
  updatedAt: string
}

export interface ChatThreadDetail {
  thread: ChatThreadItem
  messages: ChatThreadMessage[]
}

export async function listChatThreads(): Promise<ChatThreadItem[]> {
  try {
    const { data } = await apiClient.get<ApiResponse<ChatThreadItem[] | { threads: ChatThreadItem[] }>>('/api/chat/threads')
    if (!data.data) return []
    if (Array.isArray(data.data)) return data.data
    return (data.data as any).threads ?? []
  } catch (error) {
    return handleAxiosError(error)
  }
}

export async function getChatThreadById(threadId: string): Promise<ChatThreadDetail> {
  try {
    const { data } = await apiClient.get<ApiResponse<ChatThreadDetail>>(`/api/chat/threads/${threadId}`)
    if (!data.data) throw new ChatApiError('Chat thread not found', 404)
    return data.data
  } catch (error) {
    return handleAxiosError(error)
  }
}

export async function updateChatThread(threadId: string, payload: { title?: string; status?: 'ACTIVE' | 'ARCHIVED' }): Promise<ChatThreadItem> {
  try {
    const { data } = await apiClient.patch<ApiResponse<ChatThreadItem>>(`/api/chat/threads/${threadId}`, payload)
    if (!data.data) throw new ChatApiError('Chat thread not found', 404)
    return data.data
  } catch (error) { return handleAxiosError(error) }
}

export interface EvaluationLog { id: string; question: string; retrievalMode?: string; mode?: string; retrievedChunksCount?: number; relevantChunksCount?: number; averageRelevanceScore?: number; isGrounded?: boolean; confidenceScore?: number; responseTimeMs?: number; createdAt: string }
export interface EvaluationSummary { totalQuestions: number; averageRelevanceScore: number; averageConfidenceScore: number; averageResponseTime: number; drRagModeCount: number }
export async function getEvaluationLogs(): Promise<EvaluationLog[]> {
  const { data } = await apiClient.get<ApiResponse<EvaluationLog[]>>('/api/evaluation/logs')
  return data.data || []
}
export async function getEvaluationSummary(): Promise<EvaluationSummary> {
  const { data } = await apiClient.get<ApiResponse<EvaluationSummary>>('/api/evaluation/summary')
  if (!data.data) throw new ChatApiError('Empty evaluation summary', 500)
  return data.data
}

export async function deleteChatThread(threadId: string): Promise<void> {
  try {
    await apiClient.delete(`/api/chat/threads/${threadId}`)
  } catch (error) {
    return handleAxiosError(error)
  }
}
