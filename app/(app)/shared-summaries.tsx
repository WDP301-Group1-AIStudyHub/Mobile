import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { ArrowLeft, RefreshCw, Sparkles, Users } from 'lucide-react-native'

import Card from '../../components/ui/Card'
import SummaryMarkdown from '../../components/artifacts/SummaryMarkdown'
import { FontSize, Radius, Spacing } from '../../constants/colors'
import { useColors } from '../../contexts/ThemeContext'
import {
  getArtifactById,
  listSummariesSharedWithMe,
  type SharedArtifactEntry,
} from '../../services/artifactApi'

const POLL_INTERVAL_MS = 2000
const POLL_TIMEOUT_MS = 90000

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function SharedSummariesScreen() {
  const C = useColors()
  const [entries, setEntries] = useState<SharedArtifactEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const isMountedRef = useRef(true)
  const pollTimers = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const load = async () => {
    try {
      const next = await listSummariesSharedWithMe()
      if (isMountedRef.current) setEntries(next)
    } catch {
      if (isMountedRef.current) setEntries([])
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    const timers = pollTimers.current

    entries.forEach((entry) => {
      const { artifact } = entry
      if (artifact.status !== 'PENDING' && artifact.status !== 'GENERATING') return
      if (timers.has(artifact._id)) return

      const startedAt = Date.now()
      const interval = setInterval(() => {
        if (!isMountedRef.current || Date.now() - startedAt > POLL_TIMEOUT_MS) {
          clearInterval(interval)
          timers.delete(artifact._id)
          return
        }

        getArtifactById(artifact._id)
          .then((updated) => {
            if (!isMountedRef.current) return
            setEntries((current) =>
              current.map((item) =>
                item.artifact._id === updated._id ? { ...item, artifact: updated } : item,
              ),
            )
            if (updated.status === 'COMPLETED' || updated.status === 'FAILED') {
              clearInterval(interval)
              timers.delete(artifact._id)
            }
          })
          .catch(() => {
            clearInterval(interval)
            timers.delete(artifact._id)
          })
      }, POLL_INTERVAL_MS)

      timers.set(artifact._id, interval)
    })

    return () => {
      timers.forEach((interval) => clearInterval(interval))
      timers.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries.length])

  const selected = entries.find((entry) => entry.artifact._id === selectedId)

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    content: { padding: Spacing.lg, paddingBottom: Spacing.xxl + 48, gap: Spacing.lg },
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
    empty: { alignItems: 'center', gap: Spacing.sm, padding: Spacing.xl },
    emptyText: { color: C.muted, fontSize: FontSize.sm, textAlign: 'center' },
    entryCard: { gap: 4, padding: Spacing.md },
    entryTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    entryTitle: { fontSize: FontSize.base, fontWeight: '700', color: C.text, flex: 1 },
    entryMeta: { fontSize: FontSize.xs, color: C.muted },
    statusBadge: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 4,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: Radius.full,
      backgroundColor: C.infoDim,
    },
    statusText: { fontSize: FontSize.xs, color: C.info, fontWeight: '600' },
  })

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={19} color={C.textSecondary} strokeWidth={1.9} />
          </Pressable>
          <View>
            <Text style={styles.title}>Shared with me</Text>
            <Text style={styles.subtitle}>AI summaries other people have shared with you</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={C.primary} style={{ padding: Spacing.xl }} />
        ) : entries.length === 0 ? (
          <Card style={styles.empty}>
            <Users size={28} color={C.muted} />
            <Text style={styles.emptyText}>No one has shared a summary with you yet.</Text>
          </Card>
        ) : (
          entries.map((entry) => {
            const { artifact, sharedBy, sharedAt } = entry
            const isOpen = selectedId === artifact._id
            return (
              <Card key={artifact._id} style={styles.entryCard}>
                <Pressable
                  onPress={() => setSelectedId(isOpen ? null : artifact._id)}
                  style={styles.entryTitleRow}
                >
                  <Sparkles size={16} color={C.primary} />
                  <Text numberOfLines={1} style={styles.entryTitle}>{artifact.title}</Text>
                </Pressable>
                <Text style={styles.entryMeta}>
                  Shared by {sharedBy?.fullName ?? sharedBy?.email ?? 'someone'} · {formatDateTime(sharedAt)}
                </Text>

                {artifact.status !== 'COMPLETED' ? (
                  <View style={styles.statusBadge}>
                    <RefreshCw size={11} color={C.info} />
                    <Text style={styles.statusText}>
                      {artifact.status === 'FAILED' ? 'Failed' : 'Generating'}
                    </Text>
                  </View>
                ) : null}

                {isOpen && artifact.status === 'COMPLETED' && artifact.content && 'markdown' in artifact.content ? (
                  <View style={{ marginTop: Spacing.sm }}>
                    <SummaryMarkdown markdown={artifact.content.markdown} />
                  </View>
                ) : null}
                {isOpen && artifact.status === 'FAILED' ? (
                  <Text style={{ color: C.error, fontSize: FontSize.sm, marginTop: Spacing.sm }}>
                    This summary failed to generate. Ask the owner to retry it.
                  </Text>
                ) : null}
              </Card>
            )
          })
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
