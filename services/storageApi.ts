import type { ApiResponse } from '../types/auth'
import type {
  PurchaseOrder,
  StoragePackageList,
  StorageTransaction,
  StorageTransactionSnapshot,
  UserStorage,
} from '../types/storage'
import apiClient from './apiClient'

export async function getMyStorage(): Promise<UserStorage> {
  const { data } = await apiClient.get<ApiResponse<UserStorage>>('/api/storage/me')
  if (!data.data) throw new Error(data.message || 'Could not load storage usage')
  return data.data
}

export async function listStoragePackages(): Promise<StoragePackageList> {
  const { data } = await apiClient.get<ApiResponse<StoragePackageList>>('/api/storage/packages')
  if (!data.data) throw new Error(data.message || 'Could not load storage plans')
  return data.data
}

export async function reconcileStorage(): Promise<UserStorage & { drift: number }> {
  const { data } = await apiClient.post<ApiResponse<UserStorage & { drift: number }>>(
    '/api/storage/reconcile',
  )
  if (!data.data) throw new Error(data.message || 'Could not recalculate usage')
  return data.data
}

export async function createPurchase(packageId: string): Promise<PurchaseOrder> {
  const { data } = await apiClient.post<ApiResponse<PurchaseOrder>>(
    '/api/storage/purchases',
    { packageId, platform: 'MOBILE' },
  )
  if (!data.data) throw new Error(data.message || 'Could not create the order')
  return data.data
}

export async function getTransaction(
  orderRef: string,
): Promise<StorageTransactionSnapshot> {
  const { data } = await apiClient.get<ApiResponse<StorageTransactionSnapshot>>(
    `/api/storage/transactions/${orderRef}`,
  )
  if (!data.data) throw new Error(data.message || 'Could not load the transaction')
  return data.data
}

export async function listTransactions(): Promise<StorageTransaction[]> {
  const { data } = await apiClient.get<{ items?: StorageTransaction[] }>(
    '/api/storage/transactions',
    { params: { limit: 20 } },
  )
  return data.items || []
}
