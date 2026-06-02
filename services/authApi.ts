import axios from 'axios'
import { clearAuthSession, getStoredToken, getStoredUser, storeAuthSession } from './authStorage'
// Note: axios is kept for isAxiosError used in handleAxiosError
import type {
  ApiResponse,
  AuthResponse,
  AuthUser,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
} from '../types/auth'
import apiClient from './apiClient'

const USE_MOCK_AUTH = process.env.EXPO_PUBLIC_AUTH_MOCK === '1'

export class AuthApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'AuthApiError'
    this.status = status
  }
}

// ── Mock helpers ─────────────────────────────────────────────────────────────

function createMockUser(payload: Pick<LoginPayload, 'email'> & Partial<RegisterPayload>): AuthUser {
  const now = new Date().toISOString()
  const email = payload.email.trim().toLowerCase()
  const fallbackName = email.split('@')[0]?.replace(/[._-]+/g, ' ') || 'Review User'
  const fullName = payload.fullName?.trim() || fallbackName.replace(/\b\w/g, (c) => c.toUpperCase())

  return {
    id: `mock-${email}`,
    fullName,
    email,
    role: 'user',
    isActive: true,
    lastLoginAt: now,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  }
}

async function storeMockSession(user: AuthUser): Promise<AuthUser> {
  await storeAuthSession(`mock-token-${user.id}`, user)
  return user
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function handleAxiosError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message || error.message || 'Request failed'
    const status = error.response?.status ?? 500
    throw new AuthApiError(message, status)
  }
  throw error
}

// ── Auth API ──────────────────────────────────────────────────────────────────

export async function login(payload: LoginPayload): Promise<AuthUser> {
  if (USE_MOCK_AUTH) {
    return storeMockSession(createMockUser(payload))
  }

  try {
    const { data } = await apiClient.post<ApiResponse<AuthResponse>>('/api/auth/login', payload)
    if (!data.data) throw new AuthApiError('No data returned', 500)
    await storeAuthSession(data.data.accessToken, data.data.user)
    return data.data.user
  } catch (error) {
    return handleAxiosError(error)
  }
}

export async function register(payload: RegisterPayload): Promise<AuthUser> {
  if (USE_MOCK_AUTH) {
    return storeMockSession(createMockUser(payload))
  }

  try {
    const { data } = await apiClient.post<ApiResponse<AuthResponse>>('/api/auth/register', payload)
    if (!data.data) throw new AuthApiError('No data returned', 500)
    await storeAuthSession(data.data.accessToken, data.data.user)
    return data.data.user
  } catch (error) {
    return handleAxiosError(error)
  }
}

export async function forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
  if (USE_MOCK_AUTH) return

  try {
    await apiClient.post('/api/auth/forgot-password', payload)
  } catch (error) {
    return handleAxiosError(error)
  }
}

export async function resetPassword(payload: {
  token: string
  password: string
}): Promise<void> {
  if (USE_MOCK_AUTH) return

  // TODO: BE chưa có endpoint /api/auth/reset-password — stub để tránh lỗi runtime
  console.warn('[authApi] resetPassword: endpoint not implemented on server yet', payload)
}

export async function getCurrentUser(): Promise<AuthUser> {
  if (USE_MOCK_AUTH) {
    const stored = await getStoredUser()
    if (stored) return stored
    throw new AuthApiError('No mock session found', 401)
  }

  try {
    const { data } = await apiClient.get<ApiResponse<AuthUser>>('/api/auth/me')
    if (!data.data) throw new AuthApiError('No data returned', 500)
    return data.data
  } catch (error) {
    return handleAxiosError(error)
  }
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<AuthUser> {
  if (USE_MOCK_AUTH) {
    const stored = await getStoredUser()
    if (!stored) throw new AuthApiError('No mock session found', 401)
    const updated: AuthUser = {
      ...stored,
      ...payload,
      updatedAt: new Date().toISOString(),
    }
    await storeMockSession(updated)
    return updated
  }

  try {
    const { data } = await apiClient.put<ApiResponse<AuthUser>>('/api/auth/profile', payload)
    if (!data.data) throw new AuthApiError('No data returned', 500)
    return data.data
  } catch (error) {
    return handleAxiosError(error)
  }
}

export async function changePassword(payload: {
  currentPassword: string
  newPassword: string
}): Promise<void> {
  if (USE_MOCK_AUTH) return

  // TODO: BE chưa có endpoint /api/auth/change-password — stub để tránh lỗi runtime
  console.warn('[authApi] changePassword: endpoint not implemented on server yet', payload)
}

export async function logout(): Promise<void> {
  // Call BE for server-side logging / future token invalidation
  try {
    await apiClient.post('/api/auth/logout')
  } catch {
    // Ignore network errors on logout — local session is cleared regardless
  }
  await clearAuthSession()
}
