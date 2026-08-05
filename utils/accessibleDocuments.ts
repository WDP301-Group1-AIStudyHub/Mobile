import type { DocumentItem } from '../types/document'

export function normalizeAccessibleDocuments(input: unknown): DocumentItem[] {
  if (!Array.isArray(input)) return []

  const byId = new Map<string, DocumentItem>()
  for (const item of input as DocumentItem[]) {
    const id = item.id || (item as DocumentItem & { _id?: string })._id
    if (!id || item.status === 'DELETED') continue
    byId.set(String(id), { ...item, id: String(id) })
  }
  return Array.from(byId.values())
}

export function getAccessibleSubject(document: DocumentItem): DocumentItem['subject'] {
  return document.personalSubject ?? document.subject
}
