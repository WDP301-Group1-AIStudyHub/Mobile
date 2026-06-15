import type { DocumentItem } from '../types/document'

// ── Shared types ──────────────────────────────────────────────────────────────

export type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  time: string
}

// ── Defensive data helpers ───────────────────────────────────────────────────

// Backend may populate `subject` as an object ({_id, name, code, color, ...})
// even though our TS type declares it as `string`. Normalize to a string so
// React Native doesn't throw "Objects are not valid as a React child".
export function getSubjectName(subject: unknown, fallback = 'Uncategorized'): string {
  if (subject == null) return fallback
  if (typeof subject === 'string') return subject.length > 0 ? subject : fallback
  if (typeof subject === 'object') {
    const n = (subject as Record<string, unknown>).name
    if (typeof n === 'string' && n.length > 0) return n
  }
  return fallback
}

// ── Semester / Subject grouping helpers ──────────────────────────────────────

export function getSemesterLabel(isoDate: string | undefined): string {
  if (!isoDate) return 'Unknown'
  const d = new Date(isoDate)
  if (isNaN(d.getTime())) return 'Unknown'
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  if (month >= 9 || month <= 1) return `Semester 1 - ${year}`
  if (month >= 2 && month <= 5) return `Semester 2 - ${year}`
  return `Summer - ${year}`
}

export type SemesterGroup = {
  label: string
  subjects: { subject: string; docs: DocumentItem[] }[]
}

export function groupDocsBySemester(docs: DocumentItem[]): SemesterGroup[] {
  const map = new Map<string, Map<string, DocumentItem[]>>()
  for (const doc of docs) {
    const sem = getSemesterLabel(doc.createdAt)
    const subj = getSubjectName(doc.subject, 'Uncategorized')
    if (!map.has(sem)) map.set(sem, new Map())
    const subjMap = map.get(sem)!
    if (!subjMap.has(subj)) subjMap.set(subj, [])
    subjMap.get(subj)!.push(doc)
  }
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([label, subjMap]) => ({
      label,
      subjects: Array.from(subjMap.entries()).map(([subject, docs]) => ({ subject, docs })),
    }))
}

// ── Time formatting ─────────────────────────────────────────────────────────

export function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}
