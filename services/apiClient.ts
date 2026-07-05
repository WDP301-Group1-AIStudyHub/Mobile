import axios from 'axios'
import { Platform } from 'react-native'
import { clearAuthSession, getStoredToken } from './authStorage'

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
    return Promise.reject(error)
  },
)

export default apiClient
