export type AuthView = 'login' | 'register' | 'forgot-password' | 'reset-password'

export interface ApiResponse<T> {
  success: boolean
  message: string
  data?: T
  error?: string
}

export interface AuthUser {
  id: string
  fullName: string
  email: string
  avatar?: string
  role: 'user' | 'admin'
  isActive?: boolean
  lastLoginAt?: string
  status?: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}

export interface AuthResponse {
  user: AuthUser
  accessToken: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  fullName: string
  email: string
  password: string
  avatar?: string
}

export interface ForgotPasswordPayload {
  email: string
}

export interface UpdateProfilePayload {
  fullName?: string
  avatar?: string
}
