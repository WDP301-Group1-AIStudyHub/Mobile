export interface SubjectItem {
  id: string
  _id?: string
  name: string
  code?: string
  description?: string
  color?: string
  semester?: string
  documentCount?: number
  memberCount?: number
  teamCount?: number
  currentUserRole?: SubjectWorkspaceRole | null
  currentUserTeams?: Array<{ id: string; name: string }>
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

export type SubjectWorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER'
export type SubjectDocumentPermission = 'VIEW' | 'EDIT'
export type SubjectGrantType = 'USER' | 'TEAM'

export interface SubjectWorkspaceUser {
  id: string
  fullName: string
  email: string
  avatar?: string
}

export interface SubjectMember {
  id: string
  subjectId: string
  role: SubjectWorkspaceRole
  user: SubjectWorkspaceUser
  status?: 'ACTIVE' | 'PENDING'
  teamId?: string
  teamIds?: string[]
  teamNames?: string[]
  expiresAt?: string
  createdAt: string
  updatedAt: string
  notificationStatus?: 'ACCEPTED' | 'FAILED' | 'SKIPPED'
}

export interface SubjectTeam {
  id: string
  subjectId: string
  name: string
  description?: string
  members: SubjectWorkspaceUser[]
  pendingMembers?: SubjectWorkspaceUser[]
  createdAt: string
  updatedAt: string
  notificationStatus?: 'ACCEPTED' | 'FAILED' | 'SKIPPED'
}

export interface SubjectAccessGrant {
  id: string
  subjectId: string
  documentId: string
  granteeType: SubjectGrantType
  granteeId: string
  granteeName: string
  granteeEmail?: string
  permission: SubjectDocumentPermission
  createdAt: string
  updatedAt: string
}
