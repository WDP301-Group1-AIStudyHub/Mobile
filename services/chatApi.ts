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
