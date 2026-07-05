import { useEffect, useState } from 'react'
import { router } from 'expo-router'
import { clearAuthSession, getStoredUser, hasAuthSession } from '../services/authStorage'
import { logout } from '../services/authApi'
import { getCurrentUser } from '../services/authApi'
import type { AuthUser } from '../types/auth'

export type AuthState =
  | { status: 'loading' }
  | { status: 'authenticated'; user: AuthUser }
  | { status: 'unauthenticated' }

let globalState: AuthState = { status: 'loading' }
let hasInitialized = false
const subscribers = new Set<(state: AuthState) => void>()

function setGlobalState(newState: AuthState) {
  globalState = newState
  subscribers.forEach((cb) => cb(newState))
}

async function initAuth() {
  if (hasInitialized) return
  hasInitialized = true

  const hasSession = await hasAuthSession()
  if (!hasSession) {
    setGlobalState({ status: 'unauthenticated' })
    return
  }

  const stored = await getStoredUser()

  try {
    const fresh = await Promise.race([
      getCurrentUser(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Auth timeout')), 10_000)
      ),
    ])
    setGlobalState({ status: 'authenticated', user: fresh })
  } catch (err: any) {
    const is401 = err?.response?.status === 401 || err?.status === 401
    if (is401 || !stored) {
      await clearAuthSession()
      setGlobalState({ status: 'unauthenticated' })
      return
    }
    setGlobalState({ status: 'authenticated', user: stored })
  }
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(globalState)

  useEffect(() => {
    subscribers.add(setState)
    // Always sync state on mount
    setState(globalState)
    if (!hasInitialized) {
      initAuth()
    }
    return () => {
      subscribers.delete(setState)
    }
  }, [])

  async function signOut() {
    try {
      await logout()
    } catch {
      await clearAuthSession()
    }
    setGlobalState({ status: 'unauthenticated' })
    router.replace('/(auth)/login')
  }

  return { state, signOut }
}
