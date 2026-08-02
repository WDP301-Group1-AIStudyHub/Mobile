import { useEffect, useState } from 'react'
import { getMyStorage, listStoragePackages } from '../services/storageApi'
import type { StoragePackage, UserStorage } from '../types/storage'

export interface CapacityCheck {
  ok: boolean
  needed: number
  available: number
  /** False when quota is unknown, so callers can let the server decide. */
  known: boolean
}

interface StorageSnapshot {
  storage: UserStorage | null
  packages: StoragePackage[]
  currentPackageId: string | null
  loading: boolean
  error: string | null
}

// Module-level singleton, matching hooks/useAuth.ts. The dashboard bar and both
// upload guards must read the same numbers, so this cannot be per-screen state.
let snapshot: StorageSnapshot = {
  storage: null,
  packages: [],
  currentPackageId: null,
  loading: false,
  error: null,
}
const subscribers = new Set<(state: StorageSnapshot) => void>()

function setSnapshot(next: Partial<StorageSnapshot>) {
  snapshot = { ...snapshot, ...next }
  subscribers.forEach((cb) => cb(snapshot))
}

export async function refreshStorage(): Promise<void> {
  setSnapshot({ loading: true, error: null })

  try {
    const storage = await getMyStorage()
    setSnapshot({ storage, loading: false })
  } catch (error) {
    setSnapshot({
      loading: false,
      error: error instanceof Error ? error.message : 'Could not load storage',
    })
  }
}

export async function refreshStoragePackages(): Promise<void> {
  try {
    const { packages, currentPackageId } = await listStoragePackages()
    setSnapshot({ packages, currentPackageId })
  } catch (error) {
    setSnapshot({
      error: error instanceof Error ? error.message : 'Could not load plans',
    })
  }
}

export function setStorageSnapshot(storage: UserStorage): void {
  setSnapshot({ storage })
}

/** Optimistic local bump so the bar moves the moment an upload succeeds. */
export function applyUploadedBytes(bytes: number): void {
  const current = snapshot.storage
  if (!current || bytes <= 0) return

  const usedBytes = current.usedBytes + bytes
  const usagePercent =
    current.quotaBytes > 0
      ? Math.min(100, Math.round((usedBytes / current.quotaBytes) * 1000) / 10)
      : 100

  setSnapshot({
    storage: {
      ...current,
      usedBytes,
      usagePercent,
      availableBytes: Math.max(0, current.quotaBytes - usedBytes - current.reservedBytes),
      status:
        usagePercent >= 100
          ? 'FULL'
          : usagePercent >= 95
            ? 'CRITICAL'
            : usagePercent >= 80
              ? 'WARNING'
              : 'OK',
    },
  })
}

export function hasCapacityFor(bytes: number): CapacityCheck {
  const current = snapshot.storage

  // Quota not loaded yet: report unknown rather than blocking. The server
  // enforces the real limit, so a permissive client is safe here.
  if (!current) {
    return { ok: true, needed: bytes, available: 0, known: false }
  }

  return {
    ok: bytes <= current.availableBytes,
    needed: bytes,
    available: current.availableBytes,
    known: true,
  }
}

export function useStorage() {
  const [state, setState] = useState<StorageSnapshot>(snapshot)

  useEffect(() => {
    subscribers.add(setState)
    setState(snapshot)
    return () => {
      subscribers.delete(setState)
    }
  }, [])

  return {
    ...state,
    refresh: refreshStorage,
    refreshPackages: refreshStoragePackages,
    hasCapacityFor,
  }
}
