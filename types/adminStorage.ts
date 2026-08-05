export type StorageAdminStatus = 'OK' | 'WARNING' | 'CRITICAL' | 'FULL'
export type AdminPaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'EXPIRED'
export type AdminPaymentProvider = 'PAYOS' | 'VNPAY' | 'MOCK'
export type AdminPaymentPlatform = 'WEB' | 'MOBILE'

export interface AdminStoragePackage { id: string; code: string; name: string; capacityBytes: number; priceVnd: number; description: string; features: string[]; sortOrder: number; isDefault: boolean; isActive: boolean; highlight: boolean }
export interface AdminUserSummary { id: string; fullName: string; email: string; role: string; isActive: boolean }
export interface AdminStorageSnapshot { usedBytes: number; reservedBytes: number; quotaBytes: number; availableBytes: number; usagePercent: number; status: StorageAdminStatus; package: AdminStoragePackage | null; activatedAt: string | null; lastReconciledAt: string | null }
export interface AdminStorageOverview { totalUsers: number; storageUsers: number; totalQuotaBytes: number; totalUsedBytes: number; totalReservedBytes: number; totalAvailableBytes: number; usagePercent: number; usersAtRisk: number }
export interface AdminStorageUserRow { user: AdminUserSummary | null; storage: AdminStorageSnapshot }
export interface AdminPagination { page: number; limit: number; totalItems: number; totalPages: number }
export interface AdminTransactionPackageSnapshot { code: string; name: string; capacityBytes: number; priceVnd: number }
export interface AdminPaymentTransaction { id: string; orderRef: string; providerOrderCode?: number | null; status: AdminPaymentStatus; provider: AdminPaymentProvider; clientPlatform: AdminPaymentPlatform; amountVnd: number; currency: string; packageId: string; package: AdminTransactionPackageSnapshot; providerTxnRef: string; paymentLinkId?: string; providerResponseCode: string; bankCode: string; settledBy: string | null; failureReason: string; completedAt: string | null; expiresAt: string; createdAt: string; updatedAt: string; user: AdminUserSummary | null }
export interface AdminPaymentBreakdown { [key: string]: { count: number; amountVnd: number } }
export interface AdminPaymentsOverview { totalTransactions: number; totalRevenueVnd: number; completedCount: number; pendingOrders: number; byStatus: AdminPaymentBreakdown; byProvider: AdminPaymentBreakdown; byPlatform: AdminPaymentBreakdown; dateFrom: string | null; dateTo: string | null }
export interface AdminStorageUserDetail { user: AdminUserSummary & { createdAt: string | null }; storage: AdminStorageSnapshot; package: AdminStoragePackage | null; recentTransactions: AdminPaymentTransaction[] }
export interface AdminReconcileResult { scanned?: number; corrected?: number; totalDrift?: number; reservationsCleared?: number; before?: number; after?: number; drift?: number }
