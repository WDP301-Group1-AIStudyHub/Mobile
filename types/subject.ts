export interface SubjectItem {
  id: string
  name: string
  code?: string
  description?: string
  color?: string
  semester?: string
  createdAt: string
  updatedAt: string
}

export interface CreateSubjectPayload {
  name: string
  code?: string
  description?: string
  color?: string
  semester?: string
}

export interface UpdateSubjectPayload {
  name?: string
  code?: string
  description?: string
  color?: string
  semester?: string
}

export type SubjectsResponse = SubjectItem[]
