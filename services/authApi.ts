import { clearAuthSession, getStoredToken, getStoredUser, storeAuthSession } from './authStorage'
import type {
  ApiResponse,
  AuthResponse,
  AuthUser,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
} from '../types/auth'

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/+$/, '') || 'http://localhost:3000'
const USE_MOCK_AUTH = process.env.EXPO_PUBLIC_AUTH_MOCK === '1'

export class AuthApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'AuthApiError'
    this.status = status
  }
}

type RequestOptions = {
  authenticated?: boolean
  body?: unknown
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
}

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

async function request<T>(
  path: string,
  { authenticated = false, body, method = 'GET' }: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {}

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (authenticated) {
    const token = await getStoredToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const json: ApiResponse<T> = await res.json()

  if (!res.ok) {
    throw new AuthApiError(json.message || 'Request failed', res.status)
  }

  return json
}

export async function login(payload: LoginPayload): Promise<AuthUser> {
  if (USE_MOCK_AUTH) {
    return storeMockSession(createMockUser(payload))
  }

  const res = await request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: payload,
  })
  if (!res.data) throw new AuthApiError('No data returned', 500)
  await storeAuthSession(res.data.accessToken, res.data.user)
  return res.data.user
}

export async function register(payload: RegisterPayload): Promise<AuthUser> {
  if (USE_MOCK_AUTH) {
    return storeMockSession(createMockUser(payload))
  }

  const res = await request<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: payload,
  })
  if (!res.data) throw new AuthApiError('No data returned', 500)
  await storeAuthSession(res.data.accessToken, res.data.user)
  return res.data.user
}

export async function forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
  if (USE_MOCK_AUTH) return

  await request('/api/auth/forgot-password', { method: 'POST', body: payload })
}

export async function resetPassword(payload: {
  token: string
  password: string
}): Promise<void> {
  if (USE_MOCK_AUTH) return

  await request('/api/auth/reset-password', { method: 'POST', body: payload })
}

export async function getCurrentUser(): Promise<AuthUser> {
  if (USE_MOCK_AUTH) {
    const stored = await getStoredUser()
    if (stored) return stored
    throw new AuthApiError('No mock session found', 401)
  }

  const res = await request<AuthUser>('/api/auth/me', { authenticated: true })
  if (!res.data) throw new AuthApiError('No data returned', 500)
  return res.data
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

  const res = await request<AuthUser>('/api/auth/profile', {
    method: 'PUT',
    authenticated: true,
    body: payload,
  })
  if (!res.data) throw new AuthApiError('No data returned', 500)
  return res.data
}

export async function changePassword(payload: {
  currentPassword: string
  newPassword: string
}): Promise<void> {
  if (USE_MOCK_AUTH) return

  await request('/api/auth/change-password', {
    method: 'POST',
    authenticated: true,
    body: payload,
  })
}

export async function logout(): Promise<void> {
  await clearAuthSession()
}
