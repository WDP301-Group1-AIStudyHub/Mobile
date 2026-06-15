import { useEffect, useState } from 'react'
import { clearAuthSession, getStoredUser, hasAuthSession } from '../services/authStorage'
import { getCurrentUser } from '../services/authApi'
import type { AuthUser } from '../types/auth'

export type AuthState =
  | { status: 'loading' }
  | { status: 'authenticated'; user: AuthUser }
  | { status: 'unauthenticated' }

export function useAuth() {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    async function init() {
      const hasSession = await hasAuthSession()
      if (!hasSession) {
        if (!cancelled) setState({ status: 'unauthenticated' })
        return
      }

      // Optimistically show stored user while verifying
      const stored = await getStoredUser()

      try {
        // Timeout 10s để tránh treo khi backend cold start (Render free tier)
        const fresh = await Promise.race([
          getCurrentUser(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Auth timeout')), 10_000)
          ),
        ])
        if (!cancelled) setState({ status: 'authenticated', user: fresh })
      } catch (err: any) {
        if (cancelled) return

        // 401 = token is invalid/expired. Force logout regardless of stored user,
        // because subsequent API calls would all fail otherwise.
        const is401 = err?.response?.status === 401 || err?.status === 401
        if (is401 || !stored) {
          await clearAuthSession()
          setState({ status: 'unauthenticated' })
          return
        }

        // Network/timeout error with a stored user → keep them signed in offline
        if (cancelled) return
        setState({ status: 'authenticated', user: stored })
      }
    }

    init()
    return () => { cancelled = true }
  }, [])

  async function signOut() {
    await clearAuthSession()
    setState({ status: 'unauthenticated' })
  }

  return { state, signOut }
}
