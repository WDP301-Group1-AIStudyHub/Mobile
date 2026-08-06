import axios from 'axios'
import { clearAuthSession, getStoredToken, storeAuthSession } from './authStorage'
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

export class AuthApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'AuthApiError'
    this.status = status
  }
}

function handleAxiosError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message || error.message || 'Request failed'
    const status = error.response?.status ?? 500
    throw new AuthApiError(message, status)
  }
  throw error
}

export async function login(payload: LoginPayload): Promise<AuthUser> {
  try {
    const { data } = await apiClient.post<ApiResponse<AuthResponse>>('/api/auth/login', payload)
    if (!data.data) throw new AuthApiError('No data returned', 500)
    await storeAuthSession(data.data.accessToken, data.data.user)
    return data.data.user
  } catch (error) {
    return handleAxiosError(error)
  }
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  try {
    const { data } = await apiClient.post<ApiResponse<AuthResponse>>('/api/auth/register', payload)
    if (!data.data) throw new AuthApiError('No data returned', 500)
    await storeAuthSession(data.data.accessToken, data.data.user)
    return data.data
  } catch (error) {
    return handleAxiosError(error)
  }
}

export async function forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
  try {
    await apiClient.post('/api/auth/forgot-password', payload)
  } catch (error) {
    return handleAxiosError(error)
  }
}

export async function resetPassword(payload: {
  token: string
  email?: string
  password: string
}): Promise<void> {
  try {
    await apiClient.post('/api/auth/reset-password', payload)
  } catch (error) {
    return handleAxiosError(error)
  }
}

export async function getCurrentUser(): Promise<AuthUser> {
  try {
    const { data } = await apiClient.get<ApiResponse<AuthUser>>('/api/auth/me')
    if (!data.data) throw new AuthApiError('No data returned', 500)
    return data.data
  } catch (error) {
    return handleAxiosError(error)
  }
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<AuthUser> {
  try {
    const { data } = await apiClient.put<ApiResponse<AuthUser>>('/api/auth/profile', payload)
    if (!data.data) throw new AuthApiError('No data returned', 500)
    // Re-use existing token since /profile doesn't return a new one
    const existingToken = (await getStoredToken()) || ''
    await storeAuthSession(existingToken, data.data)
    return data.data
  } catch (error) {
    return handleAxiosError(error)
  }
}

export async function changePassword(payload: {
  currentPassword: string
  newPassword: string
}): Promise<void> {
  try {
    await apiClient.post('/api/auth/change-password', payload)
  } catch (error) {
    return handleAxiosError(error)
  }
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post('/api/auth/logout')
  } catch {
    // Ignore network errors on logout — local session is cleared regardless
  }
  await clearAuthSession()
}
