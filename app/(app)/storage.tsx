import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { ArrowLeft, Check, HardDrive, RefreshCw } from 'lucide-react-native'
import Button from '../../components/ui/Button'
import StoragePlanButton from '../../components/storage/StoragePlanButton'
import Card from '../../components/ui/Card'
import StorageUsageBar from '../../components/storage/StorageUsageBar'
import { FontSize, Radius, Spacing } from '../../constants/colors'
import { useColors } from '../../contexts/ThemeContext'
import {
  refreshStorage,
  refreshStoragePackages,
  setStorageSnapshot,
  useStorage,
} from '../../hooks/useStorage'
import {
  createPurchase,
  getTransaction,
  listTransactions,
  reconcileStorage,
} from '../../services/storageApi'
import { formatBytes, formatVnd } from '../../utils/formatBytes'
import type { StoragePackage, StorageTransaction } from '../../types/storage'

const POLL_INTERVAL_MS = 1500
const POLL_TIMEOUT_MS = 20000

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
}

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
  })
}

export default function StorageScreen() {
  const C = useColors()
  const params = useLocalSearchParams<{ orderRef?: string }>()
  const { storage, packages, currentPackageId } = useStorage()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [reconciling, setReconciling] = useState(false)
  const [target, setTarget] = useState<StoragePackage | null>(null)
  const [activationNotice, setActivationNotice] = useState<{
    packageName: string
    quotaBytes: number
  } | null>(null)
  const [transactions, setTransactions] = useState<StorageTransaction[]>([])
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const load = useCallback(async () => {
    try {
      await Promise.all([refreshStorage(), refreshStoragePackages()])
      const items = await listTransactions()
      if (isMountedRef.current) setTransactions(items)
    } catch {
      if (isMountedRef.current) setTransactions([])
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  /**
   * Polls for the authoritative outcome. The deep-link params are display hints
   * only — never a verdict — and polling is what covers an IPN delayed by a
   * cold-starting host.
   */
  const pollTransaction = useCallback(async (orderRef: string) => {
    const startedAt = Date.now()

    for (;;) {
      try {
        const snapshot = await getTransaction(orderRef)
        setStorageSnapshot(snapshot.storage)

        if (snapshot.transaction.status !== 'PENDING') {
          const items = await listTransactions()
          if (isMountedRef.current) setTransactions(items)

          if (snapshot.transaction.status === 'COMPLETED') {
            setActivationNotice({
              packageName: snapshot.transaction.package.name,
              quotaBytes: snapshot.transaction.package.capacityBytes,
            })
          } else {
            Alert.alert(
              'Payment not completed',
              `Status: ${STATUS_LABEL[snapshot.transaction.status] ?? snapshot.transaction.status}. You can try again.`,
            )
          }
          return
        }

        if (Date.now() - startedAt >= POLL_TIMEOUT_MS) {
          // A pending transaction is never reported as a failure.
          Alert.alert(
            'Processing',
            'Your payment is still being processed. Pull down to refresh.',
          )
          return
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
      } catch {
        return
      }
    }
  }, [])

  // Cold start: the app may have been killed while the browser was open.
  useEffect(() => {
    if (params.orderRef) {
      void pollTransaction(String(params.orderRef))
    }
  }, [params.orderRef, pollTransaction])

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      const parsed = Linking.parse(url)
      const orderRef = parsed.queryParams?.orderRef
      if (typeof orderRef === 'string') {
        void pollTransaction(orderRef)
      }
    })

    return () => subscription.remove()
  }, [pollTransaction])

  const blockReason = useCallback(
    (pkg: StoragePackage): string | null => {
      if (pkg.id === currentPackageId) return null

      const currentPackage = storage?.package
      if (pkg.priceVnd === 0 && currentPackage && currentPackage.priceVnd > 0) {
        return 'The Free plan cannot be selected after upgrading.'
      }

      const committed = (storage?.usedBytes ?? 0) + (storage?.reservedBytes ?? 0)
      if (pkg.capacityBytes < committed) {
        return `You are using ${formatBytes(committed)}, more than this plan's ${formatBytes(pkg.capacityBytes)} capacity.`
      }

      return null
    },
    [currentPackageId, storage],
  )

  const confirmPurchase = async () => {
    if (!target) return

    setBusy(true)
    try {
      // This differs between Expo Go (exp://...) and an installed build
      // (aistudyhub://...). The backend stores this exact value and redirects
      // back to it, allowing Android's auth-session polyfill to close the
      // Custom Tab after VNPay completes.
      const clientReturnUrl = Linking.createURL('storage')
      const order = await createPurchase(target.id, clientReturnUrl)

      if (!order.requiresPayment) {
        setTarget(null)
        await refreshStorage()
        await refreshStoragePackages()
        const items = await listTransactions()
        if (isMountedRef.current) setTransactions(items)
        setActivationNotice({
          packageName: order.package.name,
          quotaBytes: order.package.capacityBytes,
        })
        return
      }

      setTarget(null)

      // openAuthSessionAsync (not openBrowserAsync) auto-dismisses the Custom
      // Tab when the redirect matches our scheme.
      await WebBrowser.openAuthSessionAsync(
        order.paymentUrl,
        clientReturnUrl,
      )

      await pollTransaction(order.orderRef)
    } catch (error) {
      Alert.alert(
        'Could not change plan',
        error instanceof Error ? error.message : 'Please try again.',
      )
    } finally {
      if (isMountedRef.current) setBusy(false)
    }
  }

  const handleReconcile = async () => {
    setReconciling(true)
    try {
      const result = await reconcileStorage()
      setStorageSnapshot(result)
      Alert.alert(
        'Recalculated',
        result.drift === 0
          ? 'Usage already matches your actual files.'
          : `Adjusted by ${formatBytes(Math.abs(result.drift))}.`,
      )
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Could not recalculate usage.',
      )
    } finally {
      if (isMountedRef.current) setReconciling(false)
    }
  }

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: C.background },
        content: {
          padding: Spacing.lg,
          paddingBottom: Spacing.xxl + 96,
          gap: Spacing.lg,
        },
        header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
        backBtn: {
          width: 38,
          height: 38,
          borderRadius: Radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: C.card,
          borderWidth: 1,
          borderColor: C.cardBorder,
        },
        title: { fontSize: FontSize.xxl, fontWeight: '700', color: C.text },
        subtitle: { fontSize: FontSize.sm, color: C.textSecondary, marginTop: 2 },
        currentCard: { gap: Spacing.md },
        currentName: { fontSize: FontSize.xl, fontWeight: '700', color: C.text },
        currentMeta: { fontSize: FontSize.sm, color: C.textSecondary },
        sectionTitle: {
          fontSize: FontSize.lg,
          fontWeight: '700',
          color: C.text,
          marginBottom: Spacing.sm,
        },
        // Was a <Card>; now a <Pressable>, so it carries the card surface itself.
        pkgCard: {
          gap: Spacing.sm,
          backgroundColor: C.card,
          borderRadius: Radius.lg,
          borderWidth: 1,
          borderColor: C.cardBorder,
          padding: Spacing.md,
        },
        pkgTopRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        pkgIcon: {
          width: 36,
          height: 36,
          borderRadius: Radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: C.accentTealDim,
        },
        badge: {
          paddingHorizontal: Spacing.sm,
          paddingVertical: 3,
          borderRadius: Radius.full,
          fontSize: FontSize.xs,
          fontWeight: '700',
          overflow: 'hidden',
        },
        pkgName: { fontSize: FontSize.lg, fontWeight: '700', color: C.text },
        pkgCapacity: { fontSize: FontSize.xxl, fontWeight: '800', color: C.text },
        pkgPrice: { fontSize: FontSize.md, fontWeight: '700', color: C.primary },
        pkgDesc: { fontSize: FontSize.sm, color: C.textSecondary, lineHeight: 19 },
        featureRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
        featureText: { flex: 1, fontSize: FontSize.sm, color: C.textSecondary },
        txRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: Spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: C.cardBorder,
        },
        txName: { fontSize: FontSize.sm, fontWeight: '600', color: C.text },
        txMeta: { fontSize: FontSize.xs, color: C.textSecondary, marginTop: 2 },
        empty: {
          fontSize: FontSize.sm,
          color: C.textSecondary,
          textAlign: 'center',
          paddingVertical: Spacing.lg,
        },
        modalOverlay: {
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: C.overlayDark,
        },
        modalSheet: {
          backgroundColor: C.card,
          borderTopLeftRadius: Radius.xl,
          borderTopRightRadius: Radius.xl,
          padding: Spacing.lg,
          gap: Spacing.md,
        },
        modalTitle: { fontSize: FontSize.xl, fontWeight: '700', color: C.text },
        successOverlay: {
          flex: 1,
          justifyContent: 'center',
          padding: Spacing.lg,
          backgroundColor: C.overlayDark,
        },
        successCard: {
          width: '100%',
          maxWidth: 380,
          alignSelf: 'center',
          alignItems: 'center',
          gap: Spacing.md,
          padding: Spacing.lg,
          borderRadius: Radius.xl,
          borderWidth: 1,
          borderColor: C.cardBorder,
          backgroundColor: C.card,
        },
        successIcon: {
          width: 64,
          height: 64,
          borderRadius: Radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: C.success,
        },
        successTitle: {
          fontSize: FontSize.xl,
          fontWeight: '800',
          color: C.text,
          textAlign: 'center',
        },
        successMessage: {
          fontSize: FontSize.sm,
          lineHeight: 20,
          color: C.textSecondary,
          textAlign: 'center',
        },
        successQuota: {
          width: '100%',
          alignItems: 'center',
          gap: Spacing.xs,
          padding: Spacing.md,
          borderRadius: Radius.md,
          backgroundColor: C.successDim,
        },
        successQuotaLabel: {
          fontSize: FontSize.xs,
          fontWeight: '700',
          color: C.success,
          textTransform: 'uppercase',
        },
        successQuotaValue: {
          fontSize: FontSize.xxl,
          fontWeight: '800',
          color: C.success,
        },
        diffRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: C.cardBorder,
          borderRadius: Radius.md,
          padding: Spacing.md,
        },
        diffLabel: { fontSize: FontSize.xs, color: C.textSecondary },
        diffValue: { fontSize: FontSize.md, fontWeight: '700', color: C.text },
        note: {
          fontSize: FontSize.xs,
          color: C.textSecondary,
          lineHeight: 18,
          backgroundColor: C.background,
          borderRadius: Radius.md,
          padding: Spacing.md,
        },
      }),
    [C],
  )

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true)
                load()
              }}
              tintColor={C.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <ArrowLeft size={19} color={C.textSecondary} strokeWidth={1.9} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Storage plans</Text>
              <Text style={styles.subtitle}>Every plan caps files at 10 MB</Text>
            </View>
          </View>

          <Card style={styles.currentCard}>
            <Text style={styles.diffLabel}>CURRENT PLAN</Text>
            <Text style={styles.currentName}>
              {storage?.package?.name ?? 'Loading...'}
            </Text>
            <StorageUsageBar
              quotaBytes={storage?.quotaBytes ?? 0}
              status={storage?.status ?? 'OK'}
              usedBytes={storage?.usedBytes ?? 0}
            />
            <Text style={styles.currentMeta}>
              {formatBytes(storage?.availableBytes ?? 0)} free
            </Text>
            <Button
              title={reconciling ? 'Recalculating...' : 'Recalculate usage'}
              variant="outline"
              size="sm"
              loading={reconciling}
              leftIcon={<RefreshCw size={15} color={C.text} strokeWidth={2} />}
              onPress={handleReconcile}
            />
          </Card>

          <View>
            <Text style={styles.sectionTitle}>Available plans</Text>
            {loading && packages.length === 0 ? (
              <ActivityIndicator color={C.primary} />
            ) : (
              packages.map((pkg) => {
                const isCurrent = pkg.id === currentPackageId
                const reason = blockReason(pkg)
                const hideAction =
                  pkg.priceVnd === 0 &&
                  Boolean(storage?.package && storage.package.priceVnd > 0)

                return (
                  <Pressable
                    key={pkg.id}
                    disabled={isCurrent || Boolean(reason)}
                    onPress={() => setTarget(pkg)}
                    // Touch has no hover, so the equivalent affordance is a
                    // pressed state on the whole card.
                    style={({ pressed }) => [
                      styles.pkgCard,
                      { marginBottom: Spacing.md },
                      pkg.highlight ? { borderColor: C.primary } : null,
                      pressed ? { borderColor: C.primary, backgroundColor: C.primaryDim } : null,
                    ]}
                  >
                    <View style={styles.pkgTopRow}>
                      <View style={styles.pkgIcon}>
                        <HardDrive size={17} color={C.accentTeal} strokeWidth={2} />
                      </View>
                      {isCurrent ? (
                        <Text
                          style={[
                            styles.badge,
                            { backgroundColor: C.successDim, color: C.success },
                          ]}
                        >
                          Current
                        </Text>
                      ) : pkg.highlight ? (
                        <Text
                          style={[
                            styles.badge,
                            { backgroundColor: C.primaryDim, color: C.primary },
                          ]}
                        >
                          Popular
                        </Text>
                      ) : null}
                    </View>

                    <Text style={styles.pkgName}>{pkg.name}</Text>
                    <Text style={styles.pkgCapacity}>
                      {formatBytes(pkg.capacityBytes)}
                    </Text>
                    <Text style={styles.pkgPrice}>{formatVnd(pkg.priceVnd)}</Text>
                    {pkg.description ? (
                      <Text style={styles.pkgDesc}>{pkg.description}</Text>
                    ) : null}

                    {pkg.features.map((feature) => (
                      <View key={feature} style={styles.featureRow}>
                        <Check size={15} color={C.primary} strokeWidth={2.4} />
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))}

                    {!hideAction ? (
                      <StoragePlanButton
                        disabled={isCurrent || Boolean(reason)}
                        isCurrent={isCurrent}
                        onPress={() => setTarget(pkg)}
                        title={isCurrent ? 'Your current plan' : 'Choose this plan'}
                      />
                    ) : null}
                  </Pressable>
                )
              })
            )}
          </View>

          <View>
            <Text style={styles.sectionTitle}>Payment history</Text>
            <Card>
              {transactions.length === 0 ? (
                <Text style={styles.empty}>No payments yet.</Text>
              ) : (
                transactions.map((item) => (
                  <View key={item.id} style={styles.txRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txName}>{item.package.name}</Text>
                      <Text style={styles.txMeta}>
                        {item.orderRef} · {formatDateTime(item.createdAt)}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.txName}>{formatVnd(item.amountVnd)}</Text>
                      <Text style={styles.txMeta}>
                        {STATUS_LABEL[item.status] ?? item.status}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </Card>
          </View>
        </ScrollView>
      </SafeAreaView>

      <Modal
        animationType="slide"
        transparent
        visible={Boolean(target)}
        onRequestClose={() => setTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Confirm plan change</Text>

            <View style={styles.diffRow}>
              <View>
                <Text style={styles.diffLabel}>Current</Text>
                <Text style={styles.diffValue}>
                  {formatBytes(storage?.quotaBytes ?? 0)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.diffLabel}>New plan</Text>
                <Text style={styles.diffValue}>
                  {formatBytes(target?.capacityBytes ?? 0)}
                </Text>
              </View>
            </View>

            <View style={styles.diffRow}>
              <Text style={styles.diffLabel}>Amount</Text>
              <Text style={styles.diffValue}>{formatVnd(target?.priceVnd ?? 0)}</Text>
            </View>

            <Text style={styles.note}>
              The new plan replaces your current one — capacity does not stack.
              Documents you already uploaded are unaffected.
            </Text>

            <Button
              title={
                busy
                  ? 'Processing...'
                  : (target?.priceVnd ?? 0) > 0
                    ? 'Continue to payment'
                    : 'Switch to this plan'
              }
              loading={busy}
              onPress={confirmPurchase}
              fullWidth
            />
            <Button
              title="Cancel"
              variant="ghost"
              disabled={busy}
              onPress={() => setTarget(null)}
              fullWidth
            />
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setActivationNotice(null)}
        transparent
        visible={Boolean(activationNotice)}
      >
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <Check color="#fff" size={32} strokeWidth={3} />
            </View>
            <Text style={styles.successTitle}>Plan activated</Text>
            <Text style={styles.successMessage}>
              Your {activationNotice?.packageName} plan is ready. Your documents
              and study spaces remain unchanged.
            </Text>
            <View style={styles.successQuota}>
              <Text style={styles.successQuotaLabel}>New storage quota</Text>
              <Text style={styles.successQuotaValue}>
                {formatBytes(activationNotice?.quotaBytes ?? 0)}
              </Text>
            </View>
            <Button
              fullWidth
              onPress={() => setActivationNotice(null)}
              title="Continue"
            />
          </View>
        </View>
      </Modal>
    </View>
  )
}
