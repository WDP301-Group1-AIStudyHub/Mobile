import axios from 'axios'
import { clearAuthSession, getStoredToken } from './authStorage'

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/+$/, '') || 'https://backendd-vn1j.onrender.com'

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
