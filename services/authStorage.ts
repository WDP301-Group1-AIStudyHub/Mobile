import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import type { AuthUser } from '../types/auth'

const TOKEN_KEY = 'ash_access_token'
const USER_KEY = 'ash_user_data'

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(key, value)
    return
  }

  await SecureStore.setItemAsync(key, value)
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return globalThis.localStorage?.getItem(key) ?? null
  }

  return SecureStore.getItemAsync(key)
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.removeItem(key)
    return
  }

  await SecureStore.deleteItemAsync(key)
}

export async function storeAuthSession(token: string, user: AuthUser): Promise<void> {
  await setItem(TOKEN_KEY, token)
  await setItem(USER_KEY, JSON.stringify(user))
}

export async function getStoredToken(): Promise<string | null> {
  return getItem(TOKEN_KEY)
}

export async function getStoredUser(): Promise<AuthUser | null> {
  const raw = await getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export async function hasAuthSession(): Promise<boolean> {
  const token = await getStoredToken()
  return Boolean(token)
}

export async function clearAuthSession(): Promise<void> {
  await deleteItem(TOKEN_KEY)
  await deleteItem(USER_KEY)
}
