import apiClient from './apiClient'
import type {
  AdminDocument,
  AdminUser,
  DashboardStats,
  SystemActivity,
} from '../types/admin'

// ─── Helpers ────────────────────────────────────────────────────────────────

function mapBackendUserToAdminUser(u: Record<string, any>): AdminUser {
  return {
    id: u._id || u.id,
    fullName: u.fullName ?? '',
    email: u.email ?? '',
    avatar: u.avatar ?? '',
    role: u.role ?? 'user',
    isActive: u.isActive !== false,
    banReason: u.banReason ?? undefined,
    status: u.isActive !== false ? 'active' : 'inactive',
    lastLoginAt: u.updatedAt ?? u.createdAt,
    documentCount: 0,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  }
}

function mapBackendDocumentToAdminDocument(d: Record<string, any>): AdminDocument {
  const owner = d.ownerId && typeof d.ownerId === 'object' ? d.ownerId : {}
  const extractionStatus = (d.extractionStatus ?? '').toUpperCase()
  let indexedStatus: 'indexed' | 'processing' | 'failed' = 'processing'
  if (extractionStatus === 'COMPLETED') indexedStatus = 'indexed'
  else if (extractionStatus === 'FAILED') indexedStatus = 'failed'

  return {
    id: d._id || d.id,
    title: d.title ?? '',
    description: d.description ?? '',
    fileName: d.fileName ?? '',
    filePublicId: d.filePublicId ?? '',
    fileSize: d.fileSize ?? 0,
    fileType: d.fileType ?? d.mimeType ?? '',
    fileUrl: d.fileUrl ?? '',
    extractedText: d.extractedText ?? '',
    indexedStatus,
    ownerEmail: owner.email ?? '',
    ownerName: owner.fullName ?? '',
    subject: d.subject ?? d.subjectId ?? '',
    uploadedBy: owner._id ?? d.ownerId ?? '',
    visibility: d.visibility,
    status: d.status,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }
}

function mapBackendActivityToSystemActivity(a: Record<string, any>): SystemActivity {
  const user = a.userId && typeof a.userId === 'object' ? a.userId : null
  const actorName = user?.fullName ?? 'System'
  const actionStr: string = a.action ?? 'OTHER'
  const details = a.details ?? {}

  let severity: SystemActivity['severity'] = 'info'
  if (actionStr === 'DOCUMENT_DELETE' || actionStr === 'USER_BAN') severity = 'warning'
  else if (actionStr === 'LOGIN') severity = 'success'
  else if (actionStr === 'REGISTER') severity = 'success'

  let type: SystemActivity['type'] = 'system'
  if (a.entityType === 'User') type = 'user'
  else if (a.entityType === 'Document') type = 'document'
  else if (actionStr === 'LOGIN' || actionStr === 'REGISTER') type = 'auth'

  let description = details.action;
  if (!description) {
    if (actionStr === 'USER_LOGIN') description = 'User logged in';
    else if (actionStr === 'USER_REGISTER') description = 'User registered';
    else description = `${actionStr} on ${a.entityType ?? 'system'}`;
  }
  let target = a.entityType ? `${a.entityType} ${(a.entityId ?? '').slice(-6)}` : 'Platform'
  if (['USER_LOGIN', 'USER_REGISTER'].includes(actionStr)) {
    target = 'Account'
  }

  return {
    id: a._id || a.id,
    actor: actorName,
    createdAt: a.createdAt,
    description,
    severity,
    target,
    type,
    ipAddress: a.ipAddress,
    userAgent: a.userAgent,
    entityType: a.entityType,
    entityId: a.entityId,
    details: a.details,
  }
}

// ─── FE-22: User Account Management ────────────────────────────────────────

export async function listAdminUsers(search?: string): Promise<AdminUser[]> {
  const params: Record<string, string> = {}
  if (search) params.search = search

  const res = await apiClient.get('/api/admin/users', { params })
  const users: Record<string, any>[] = res.data?.data?.users ?? []
  return users.map(mapBackendUserToAdminUser)
}

export async function banUser(userId: string, reason: string): Promise<AdminUser> {
  const res = await apiClient.put(`/api/admin/users/${userId}/ban`, { reason })
  return mapBackendUserToAdminUser(res.data?.data ?? {})
}

export async function unbanUser(userId: string): Promise<AdminUser> {
  const res = await apiClient.put(`/api/admin/users/${userId}/unban`)
  return mapBackendUserToAdminUser(res.data?.data ?? {})
}



// ─── FE-23: Document Oversight ──────────────────────────────────────────────

export async function listAdminDocuments(search?: string): Promise<AdminDocument[]> {
  const params: Record<string, string> = {}
  if (search) params.search = search

  const res = await apiClient.get('/api/admin/documents', { params })
  const documents: Record<string, any>[] = res.data?.data?.documents ?? []
  return documents.map(mapBackendDocumentToAdminDocument)
}


// ─── FE-24: Activity Log Monitoring ─────────────────────────────────────────

export async function listSystemActivities(filters?: {
  action?: string
  userId?: string
}): Promise<SystemActivity[]> {
  const params: Record<string, string> = {}
  if (filters?.action) params.action = filters.action
  if (filters?.userId) params.userId = filters.userId

  const res = await apiClient.get('/api/admin/logs', { params })
  const logs: Record<string, any>[] = res.data?.data?.logs ?? []
  return logs.map(mapBackendActivityToSystemActivity)
}

// ─── FE-25: Admin Dashboard ─────────────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  const res = await apiClient.get('/api/admin/dashboard')
  return res.data?.data as DashboardStats
}
