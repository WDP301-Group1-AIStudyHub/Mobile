import type { AiUsage } from '../types/ai'

export type DerivedAiPlanState =
  | { kind: 'loading'; used: 0; limit: 20; percentage: 0 }
  | { kind: 'degraded'; used: number; limit: number; percentage: number }
  | { kind: 'degraded_exhausted'; used: number; limit: number; percentage: 100 }
  | { kind: 'byok'; used: number; limit: number; percentage: 0 }
  | { kind: 'exempt'; used: number; limit: number; percentage: 0 }
  | { kind: 'exhausted'; used: number; limit: number; percentage: 100 }
  | { kind: 'counting'; used: number; limit: number; percentage: number }

export function deriveAiPlanState(usage: AiUsage | null | undefined): DerivedAiPlanState {
  if (!usage) {
    return { kind: 'loading', used: 0, limit: 20, percentage: 0 }
  }

  const limit = usage.limit > 0 ? usage.limit : 20
  const used = Math.min(usage.used ?? 0, limit)
  const isExhausted = (usage.used ?? 0) >= limit
  const percentage = usage.unlimited ? 0 : Math.min(100, Math.round((used / limit) * 100))

  if (usage.degraded) {
    if (isExhausted) return { kind: 'degraded_exhausted', used, limit, percentage: 100 }
    return { kind: 'degraded', used, limit, percentage }
  }

  if (usage.unlimited) {
    if (usage.unlimitedReason === 'exempt') return { kind: 'exempt', used, limit, percentage: 0 }
    return { kind: 'byok', used, limit, percentage: 0 }
  }

  if (isExhausted) return { kind: 'exhausted', used, limit, percentage: 100 }

  return { kind: 'counting', used, limit, percentage }
}
