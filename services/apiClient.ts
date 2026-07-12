import axios from 'axios'
import { Platform } from 'react-native'
import { clearAuthSession, getStoredToken } from './authStorage'

export interface ApiErrorDetails {
  status?: number
  code?: string
  message: string
}

export function getApiErrorDetails(error: unknown): ApiErrorDetails {
  if (!axios.isAxiosError(error)) {
    return { message: error instanceof Error ? error.message : 'Something went wrong.' }
  }

  const payload = error.response?.data as
    | { message?: string; error?: string; code?: string }
    | undefined
  const message =
    payload?.message ||
    payload?.error ||
    (error.code === 'ECONNABORTED'
      ? 'The server took too long to respond. Please try again.'
      : error.message || 'Unable to reach the server.')

  return { status: error.response?.status, code: payload?.code, message }
}

const configuredApiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/+$/, '') || 'https://backendd-vn1j.onrender.com'

export const API_BASE_URL =
  Platform.OS === 'web' && configuredApiBaseUrl.includes('10.0.2.2')
    ? configuredApiBaseUrl.replace('10.0.2.2', 'localhost')
    : configuredApiBaseUrl

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Request interceptor: attach Bearer token ────────────────────────────────
apiClient.interceptors.request.use(async (config) => {
  const token = await getStoredToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor: unwrap data / clear session on 401 ────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    try {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        await clearAuthSession()
      }
    } catch {
      // Bỏ qua lỗi khi xoá session — không để crash app
    }
    if (error instanceof Error) error.message = getApiErrorDetails(error).message
    return Promise.reject(error)
  },
)

export default apiClient
