import { useEffect, useState } from 'react'
import apiClient from '../services/apiClient'
import type { ApiResponse } from '../types/auth'
import type { AiUsage } from '../types/ai'

interface AiUsageSnapshot {
  usage: AiUsage | null
  loading: boolean
  error: string | null
}

// Module-level singleton, matching hooks/useStorage.ts. No BYOK screen exists
// on mobile, so notifyAiUsageChanged() isn't needed — callers just invoke
// refreshAiUsage() after a 202 and every subscriber re-renders.
let snapshot: AiUsageSnapshot = { usage: null, loading: true, error: null }
const subscribers = new Set<(state: AiUsageSnapshot) => void>()

function setSnapshot(next: Partial<AiUsageSnapshot>) {
  snapshot = { ...snapshot, ...next }
  subscribers.forEach((cb) => cb(snapshot))
}

export async function refreshAiUsage(): Promise<void> {
  setSnapshot({ loading: true, error: null })
  try {
    const { data } = await apiClient.get<ApiResponse<AiUsage>>('/api/ai/usage')
    if (data.data === undefined) throw new Error(data.message || 'Failed to load AI usage')
    setSnapshot({ usage: data.data, loading: false })
  } catch (error) {
    setSnapshot({
      loading: false,
      error: error instanceof Error ? error.message : 'Failed to load AI usage',
    })
  }
}

export function useAiUsage() {
  const [state, setState] = useState<AiUsageSnapshot>(snapshot)

  useEffect(() => {
    subscribers.add(setState)
    setState(snapshot)
    return () => {
      subscribers.delete(setState)
    }
  }, [])

  return { ...state, refreshUsage: refreshAiUsage }
}
