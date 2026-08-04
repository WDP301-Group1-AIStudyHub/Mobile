export type StorageStatus = 'OK' | 'WARNING' | 'CRITICAL' | 'FULL'

export interface StoragePackage {
  id: string
  code: string
  name: string
  capacityBytes: number
  priceVnd: number
  description: string
  features: string[]
  sortOrder: number
  isDefault: boolean
  isActive: boolean
  highlight: boolean
}

export interface UserStorage {
  usedBytes: number
  reservedBytes: number
  quotaBytes: number
  availableBytes: number
  usagePercent: number
  status: StorageStatus
  package: StoragePackage | null
  activatedAt: string | null
  lastReconciledAt: string | null
}

export interface StoragePackageList {
  packages: StoragePackage[]
  currentPackageId: string | null
}

export type TransactionStatus =
  | 'PENDING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED'

export interface StorageTransaction {
  id: string
  orderRef: string
  providerOrderCode?: number | null
  status: TransactionStatus
  provider: 'PAYOS' | 'VNPAY' | 'MOCK'
  amountVnd: number
  currency: string
  clientPlatform: 'WEB' | 'MOBILE'
  paymentUrl: string
  paymentLinkId?: string
  package: {
    code: string
    name: string
    capacityBytes: number
    priceVnd: number
  }
  packageId: string
  providerTxnRef: string
  providerResponseCode: string
  bankCode: string
  failureReason: string
  completedAt: string | null
  expiresAt: string
  createdAt: string
}

export interface StorageTransactionSnapshot {
  transaction: StorageTransaction
  storage: UserStorage
}

export interface PurchaseOrder {
  orderRef: string
  providerOrderCode?: number | null
  /** False for free packages, which activate without a gateway round trip. */
  requiresPayment: boolean
  paymentUrl: string
  provider: 'PAYOS' | 'VNPAY' | 'MOCK'
  amountVnd: number
  expiresAt: string
  package: StoragePackage
}

/** Payload carried by a 413 STORAGE_QUOTA_EXCEEDED response. */
export interface StorageQuotaDetails {
  usedBytes: number
  reservedBytes: number
  quotaBytes: number
  requiredBytes: number
  availableBytes: number
  packageName: string
}
