export type AiUnlimitedReason = 'byok' | 'exempt'

export interface AiUsage {
  period: string
  used: number
  limit: number
  unlimited: boolean
  degraded: boolean
  // Omitted from JSON (not null) when not applicable — treat "absent" like null.
  unlimitedReason?: AiUnlimitedReason
}
