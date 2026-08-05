/**
 * Search utilities for accent/diacritic-insensitive, case-insensitive matching.
 * Handles Vietnamese characters and other diacritics.
 */

/** Normalize a string: lowercase + remove diacritics */
export function normalizeText(text: string): string {
  if (!text) return ''
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Handle Vietnamese-specific composed characters not fully covered by NFD
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
}

/**
 * Returns true if `text` contains `query` (accent/case-insensitive).
 */
export function matchesQuery(text: string, query: string): boolean {
  if (!query) return true
  return normalizeText(text).includes(normalizeText(query))
}

/**
 * Returns true if any of the given strings contain `query`.
 */
export function anyMatches(fields: (string | null | undefined)[], query: string): boolean {
  if (!query) return true
  return fields.some((f) => f != null && matchesQuery(f, query))
}

/**
 * Extract a snippet from `text` centered around the first occurrence of `query`.
 * Returns at most `maxLen` characters with ellipsis on edges.
 */
export function extractSnippet(
  text: string,
  query: string,
  maxLen = 120,
): string {
  if (!text) return ''
  if (!query) return text.slice(0, maxLen) + (text.length > maxLen ? '...' : '')

  const normalized = normalizeText(text)
  const normalizedQuery = normalizeText(query)
  const idx = normalized.indexOf(normalizedQuery)

  if (idx === -1) return text.slice(0, maxLen) + (text.length > maxLen ? '...' : '')

  const half = Math.floor(maxLen / 2)
  const start = Math.max(0, idx - half)
  const end = Math.min(text.length, idx + query.length + half)
  const snippet = text.slice(start, end)

  return (start > 0 ? '...' : '') + snippet + (end < text.length ? '...' : '')
}
