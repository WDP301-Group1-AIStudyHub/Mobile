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
      if (stored && !cancelled) {
        setState({ status: 'authenticated', user: stored })
      }

      try {
        const fresh = await getCurrentUser()
        if (!cancelled) setState({ status: 'authenticated', user: fresh })
      } catch {
        if (!cancelled) {
          await clearAuthSession()
          setState({ status: 'unauthenticated' })
        }
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
