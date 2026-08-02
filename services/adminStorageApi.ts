import apiClient from './apiClient'
import type { AdminPagination, AdminPaymentProvider, AdminPaymentPlatform, AdminPaymentStatus, AdminPaymentTransaction, AdminPaymentsOverview, AdminReconcileResult, AdminStorageOverview, AdminStoragePackage, AdminStorageUserDetail, AdminStorageUserRow, StorageAdminStatus } from '../types/adminStorage'

const dataOf = <T>(payload: any): T => (payload?.data ?? payload) as T

export async function getAdminStorageOverview() { const res = await apiClient.get('/api/admin/storage/overview'); return dataOf<AdminStorageOverview>(res.data) }
export async function listAdminStorageUsers(params: { page?: number; limit?: number; search?: string; status?: StorageAdminStatus }) { const res = await apiClient.get('/api/admin/storage/users', { params }); return dataOf<{ items: AdminStorageUserRow[]; pagination: AdminPagination }>(res.data) }
export async function getAdminStorageUser(userId: string) { const res = await apiClient.get(`/api/admin/storage/users/${userId}`); return dataOf<AdminStorageUserDetail>(res.data) }
export async function assignAdminStoragePackage(userId: string, packageId: string, reason: string) { const res = await apiClient.patch(`/api/admin/storage/users/${userId}/package`, { packageId, reason }); return dataOf<any>(res.data) }
export async function reconcileAdminStorageUser(userId: string) { const res = await apiClient.post(`/api/admin/storage/users/${userId}/reconcile`); return dataOf<AdminStorageUserDetail & { reconciliation: AdminReconcileResult }>(res.data) }
export async function reconcileAllAdminStorage() { const res = await apiClient.post('/api/admin/storage/reconcile'); return dataOf<AdminReconcileResult>(res.data) }
export async function listAdminStoragePackages() { const res = await apiClient.get('/api/admin/storage/packages'); return dataOf<AdminStoragePackage[]>(res.data) }
export async function getAdminPaymentsOverview(params?: { dateFrom?: string; dateTo?: string }) { const res = await apiClient.get('/api/admin/payments/overview', { params }); return dataOf<AdminPaymentsOverview>(res.data) }
export async function listAdminPayments(params: { page?: number; limit?: number; status?: AdminPaymentStatus; search?: string; provider?: AdminPaymentProvider; platform?: AdminPaymentPlatform }) { const res = await apiClient.get('/api/admin/payments/transactions', { params }); return dataOf<{ items: AdminPaymentTransaction[]; pagination: AdminPagination }>(res.data) }
export async function getAdminPayment(orderRef: string) { const res = await apiClient.get(`/api/admin/payments/transactions/${encodeURIComponent(orderRef)}`); return dataOf<AdminPaymentTransaction>(res.data) }
export async function cancelAdminPayment(orderRef: string, reason: string) { const res = await apiClient.post(`/api/admin/payments/transactions/${encodeURIComponent(orderRef)}/cancel`, { reason }); return dataOf<AdminPaymentTransaction>(res.data) }
