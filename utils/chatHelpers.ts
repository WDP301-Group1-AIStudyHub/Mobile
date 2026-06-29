import type { DocumentItem } from '../types/document'

export type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  time: string
}

type SubjectLike = {
  _id?: string
  id?: string
  name?: string
  code?: string
  color?: string
  semester?: string
}

function getSubjectObject(subject: unknown): SubjectLike | null {
  return typeof subject === 'object' && subject !== null ? (subject as SubjectLike) : null
}

export function getSubjectName(subject: unknown, fallback = 'Uncategorized'): string {
  if (subject == null) return fallback
  if (typeof subject === 'string') return subject.length > 0 ? subject : fallback
  const name = getSubjectObject(subject)?.name
  return typeof name === 'string' && name.length > 0 ? name : fallback
}

export function getDocumentSubjectName(doc?: DocumentItem, fallback = 'Uncategorized'): string {
  return getSubjectName(doc?.subject, fallback)
}

export function getDocumentSubjectId(doc?: DocumentItem): string | undefined {
  const subjectObject = getSubjectObject(doc?.subject)
  return doc?.subjectId || subjectObject?._id || subjectObject?.id
}

export function getDocumentSubjectKey(doc?: DocumentItem): string {
  return getDocumentSubjectId(doc) || getDocumentSubjectName(doc, 'Uncategorized')
}

export function getDocumentSubjectColor(doc?: DocumentItem, fallback = '#496b55'): string {
  return getSubjectObject(doc?.subject)?.color || fallback
}

export function getDocumentSemester(doc?: DocumentItem): string {
  const subjectSemester = getSubjectObject(doc?.subject)?.semester?.trim()
  return subjectSemester || doc?.metadata?.semester || getSemesterLabel(doc?.createdAt)
}

export function getSemesterLabel(isoDate: string | undefined): string {
  if (!isoDate) return 'Unknown'
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) return 'Unknown'
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  if (month >= 9 || month <= 1) return `Semester 1 - ${year}`
  if (month >= 2 && month <= 5) return `Semester 2 - ${year}`
  return `Summer - ${year}`
}

export type SubjectGroup = {
  key: string
  subject: string
  subjectId?: string
  color: string
  docs: DocumentItem[]
}

export type SemesterGroup = {
  label: string
  subjects: SubjectGroup[]
}

export function groupDocsBySemester(docs: DocumentItem[]): SemesterGroup[] {
  const map = new Map<string, Map<string, SubjectGroup>>()

  for (const doc of docs) {
    const semester = getDocumentSemester(doc)
    const subjectKey = getDocumentSubjectKey(doc)
    if (!map.has(semester)) map.set(semester, new Map())

    const subjectMap = map.get(semester)!
    if (!subjectMap.has(subjectKey)) {
      subjectMap.set(subjectKey, {
        key: subjectKey,
        subject: getDocumentSubjectName(doc, 'Uncategorized'),
        subjectId: getDocumentSubjectId(doc),
        color: getDocumentSubjectColor(doc),
        docs: [],
      })
    }

    subjectMap.get(subjectKey)!.docs.push(doc)
  }

  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([label, subjectMap]) => ({
      label,
      subjects: Array.from(subjectMap.values()).sort((a, b) => a.subject.localeCompare(b.subject)),
    }))
}

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
