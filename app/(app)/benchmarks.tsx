import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  BarChart2,
  Plus,
  Play,
  Trophy,
  FlaskConical,
  TrendingUp,
  Award,
  X,
} from 'lucide-react-native'
import BrandLogo from '../../components/ui/BrandLogo'
import ThemeToggle from '../../components/ui/ThemeToggle'
import { FontSize, Spacing, Radius } from '../../constants/colors'
import { useColors } from '../../contexts/ThemeContext'
import {
  createBenchmarkQuestion,
  getBenchmarkSummary,
  listBenchmarkQuestions,
  runBenchmarkQuestion,
  type BenchmarkQuestion as ApiQuestion,
  type BenchmarkDifficulty,
  type BenchmarkSummary,
} from '../../services/benchmarkApi'

type Difficulty = BenchmarkDifficulty

const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard']

const EMPTY_SUMMARY: BenchmarkSummary = {
  totalRuns: 0,
  basicAvg: 0,
  correctiveAvg: 0,
  correctiveWinRate: 0,
  basicWinRate: 0,
  tieRate: 0,
  faithfulnessImprovement: '0%',
  correctnessImprovement: '0%',
}

function difficultyColor(d: Difficulty, C: ReturnType<typeof useColors>): string {
  if (d === 'Easy') return C.success
  if (d === 'Medium') return C.warning
  return C.error
}

function winnerLabel(w: ApiQuestion['winner']) {
  if (w === 'corrective') return 'Corrective'
  if (w === 'basic') return 'Basic'
  return 'Tie'
}

function timeAgo(iso?: string): string {
  if (!iso) return 'recently'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Page description
function PageDescription() {
  const C = useColors()
  return (
    <View style={{ marginBottom: Spacing.lg, paddingHorizontal: Spacing.xs }}>
      <Text style={{ fontSize: FontSize.sm, color: C.textSecondary, lineHeight: 22 }}>
        Compare answer quality between Basic RAG and Corrective RAG. Benchmarks help evaluate the accuracy and reliability of AI answers.
      </Text>
    </View>
  )
}

export default function BenchmarksPage() {
  const C = useColors()
  const [showCreate, setShowCreate] = useState(false)
  const [runningId, setRunningId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [questions, setQuestions] = useState<ApiQuestion[]>([])
  const [summary, setSummary] = useState<BenchmarkSummary>(EMPTY_SUMMARY)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTab, setSelectedTab] = useState<'questions' | 'summary'>('questions')
  const isMountedRef = useRef(true)

  useEffect(() => {
    return () => { isMountedRef.current = false }
  }, [])

  const [form, setForm] = useState({
    question: '',
    subject: '',
    expectedAnswer: '',
    difficulty: 'Medium' as Difficulty,
  })

  const load = useCallback(async () => {
    try {
      const [qs, sm] = await Promise.all([
        listBenchmarkQuestions(),
        getBenchmarkSummary().catch(() => EMPTY_SUMMARY),
      ])
      if (isMountedRef.current) {
        setQuestions(qs)
        setSummary(sm)
      }
    } catch (e) {
      console.error('[benchmarks] load error', e)
      if (isMountedRef.current) Alert.alert('Error', 'Could not load benchmarks from the server.')
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

  async function handleRun(id: string) {
    setRunningId(id)
    try {
      const updated = await runBenchmarkQuestion(id)
      if (isMountedRef.current) setQuestions((prev) => prev.map((q) => (q.id === id ? updated : q)))
      const sm = await getBenchmarkSummary()
      if (isMountedRef.current) setSummary(sm)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Run failed'
      Alert.alert('Error', msg)
    } finally {
      if (isMountedRef.current) setRunningId(null)
    }
  }

  async function handleCreate() {
    if (!form.question.trim() || !form.subject.trim()) {
      Alert.alert('Validation', 'Question and subject are required.')
      return
    }
    setCreating(true)
    try {
      const created = await createBenchmarkQuestion({
        question: form.question.trim(),
        subject: form.subject.trim(),
        expectedAnswer: form.expectedAnswer.trim() || undefined,
        difficulty: form.difficulty,
      })
      setQuestions((prev) => [created, ...prev])
      setForm({ question: '', subject: '', expectedAnswer: '', difficulty: 'Medium' })
      setShowCreate(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Create failed'
      Alert.alert('Error', msg)
    } finally {
      setCreating(false)
    }
  }

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1 },
    scroll: { flex: 1 },
    content: { padding: Spacing.lg, paddingBottom: Spacing.xxl + 24, gap: Spacing.lg },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    topBarRight: { flexDirection: 'row', gap: Spacing.sm },
    headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    pageTitle: { fontSize: FontSize.xl, fontWeight: '700', color: '#ffffff', letterSpacing: 0.2 },
    pageSub: { fontSize: FontSize.sm, color: C.muted, marginTop: 3, maxWidth: '75%' },
    addBtn: { borderRadius: Radius.lg, backgroundColor: C.primary, paddingHorizontal: 14, paddingVertical: 9 },
    addBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: '#fff' },
    tabRow: {
      flexDirection: 'row',
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: C.cardBorder,
      padding: 4,
      gap: 4,
    },
    tab: { flex: 1, paddingVertical: 9, borderRadius: Radius.md, alignItems: 'center' },
    tabActive: { backgroundColor: C.primaryDim },
    tabText: { fontSize: FontSize.sm, fontWeight: '600', color: C.muted },
    tabTextActive: { color: C.primary },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    statCard: {
      flex: 1, minWidth: '45%',
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: C.cardBorder,
      padding: Spacing.md,
      gap: 6,
    },
    statIconRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    statIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    statVal: { fontSize: FontSize.xl, fontWeight: '800', color: C.text },
    statLabel: { fontSize: FontSize.xs, color: C.muted },
    compBanner: { borderRadius: Radius.xl, borderWidth: 1, borderColor: C.cardBorder, backgroundColor: C.card, overflow: 'hidden' },
    compHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: Spacing.md, paddingBottom: 0 },
    compHeaderText: { fontSize: FontSize.base, fontWeight: '700', color: C.text },
    compRow: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md },
    compCol: {
      flex: 1,
      borderRadius: Radius.lg,
      borderWidth: 1,
      padding: Spacing.md,
      gap: 6,
      alignItems: 'center',
    },
    compColTitle: { fontSize: FontSize.sm, fontWeight: '700' },
    compScore: { fontSize: FontSize.xxxl, fontWeight: '900' },
    compLabel: { fontSize: FontSize.xs, color: C.muted },
    vsText: { alignSelf: 'center', fontSize: FontSize.base, fontWeight: '800', color: C.muted },
    winnerBadge: {
      borderRadius: Radius.full,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginTop: 4,
      backgroundColor: C.accent,
    },
    winnerBadgeText: { fontSize: FontSize.xs, fontWeight: '800', color: '#fff' },
    improvRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
    improvPill: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      borderRadius: Radius.lg, borderWidth: 1, borderColor: C.cardBorder,
      backgroundColor: C.successDim, paddingVertical: 8,
    },
    improvText: { fontSize: FontSize.sm, fontWeight: '700', color: C.success },
    improvLabel: { fontSize: FontSize.xs, color: C.muted },
    sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sectionTitle: { fontSize: FontSize.base, fontWeight: '700', color: C.text },
    sectionCount: { fontSize: FontSize.sm, color: C.muted },
    qCard: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: C.cardBorder,
      padding: Spacing.md,
      gap: Spacing.sm,
    },
    qTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.sm },
    qText: { flex: 1, fontSize: FontSize.sm, fontWeight: '600', color: C.text, lineHeight: 20 },
    qMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
    diffBadge: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
    diffText: { fontSize: FontSize.xs, fontWeight: '700' },
    subjectTag: {
      borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3,
      backgroundColor: C.primaryDim,
    },
    subjectText: { fontSize: FontSize.xs, fontWeight: '600', color: C.primary },
    qResultRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    scoreBox: {
      flex: 1, borderRadius: Radius.md, padding: Spacing.sm,
      alignItems: 'center', gap: 2, borderWidth: 1,
    },
    scoreMode: { fontSize: FontSize.xs, fontWeight: '700' },
    scoreNum: { fontSize: FontSize.md, fontWeight: '900' },
    winnerPill: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 10, paddingVertical: 5,
      borderRadius: Radius.full,
      backgroundColor: C.accent,
    },
    winnerText: { fontSize: FontSize.xs, fontWeight: '700', color: '#fff' },
    runBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.md, backgroundColor: C.primary, paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-end' },
    runBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: '#fff' },
    pendingTag: {
      borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 5,
      backgroundColor: C.warningDim, alignSelf: 'flex-start',
    },
    pendingText: { fontSize: FontSize.xs, fontWeight: '700', color: C.warning },
    empty: { alignItems: 'center', paddingTop: Spacing.xxl, gap: Spacing.sm },
    emptyTitle: { fontSize: FontSize.md, fontWeight: '700', color: C.textSecondary },
    emptyHint: { fontSize: FontSize.sm, color: C.muted, textAlign: 'center', maxWidth: 280, lineHeight: 20 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    modalSheet: {
      backgroundColor: C.card,
      borderTopLeftRadius: Radius.xl,
      borderTopRightRadius: Radius.xl,
      borderWidth: 1,
      borderColor: C.cardBorder,
      padding: Spacing.lg,
      gap: Spacing.md,
      paddingBottom: Spacing.xxl,
    },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    modalTitle: { fontSize: FontSize.lg, fontWeight: '700', color: C.text },
    closeBtn: {
      width: 36, height: 36, borderRadius: 18, backgroundColor: C.cardBorder,
      alignItems: 'center', justifyContent: 'center',
    },
    inputLabel: { fontSize: FontSize.sm, fontWeight: '600', color: C.textSecondary, marginBottom: 4 },
    textInput: {
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.cardBorder,
      borderRadius: Radius.md,
      padding: Spacing.md,
      fontSize: FontSize.sm,
      color: C.text,
    },
    textArea: { minHeight: 80, textAlignVertical: 'top' },
    diffRow: { flexDirection: 'row', gap: Spacing.sm },
    diffChip: {
      flex: 1, paddingVertical: 9, alignItems: 'center',
      borderRadius: Radius.md, borderWidth: 1, borderColor: C.cardBorder,
      backgroundColor: C.card,
    },
    diffChipText: { fontSize: FontSize.sm, fontWeight: '700' },
    submitBtn: { borderRadius: Radius.lg, backgroundColor: C.primary, padding: Spacing.md, alignItems: 'center', marginTop: 4 },
    submitBtnText: { fontSize: FontSize.base, fontWeight: '700', color: '#fff' },
  }), [C])

  function renderSummary() {
    const s = summary
    return (
      <>
        <View style={styles.statsGrid}>
          {[
            { icon: FlaskConical, label: 'Total Runs', value: `${s.totalRuns}`, color: C.primary, bg: C.primaryDim },
            { icon: BarChart2, label: 'Basic Avg', value: `${s.basicAvg}%`, color: C.info, bg: C.infoDim },
            { icon: BarChart2, label: 'Corrective Avg', value: `${s.correctiveAvg}%`, color: C.accent, bg: C.accentDim },
            { icon: Trophy, label: 'Corrective Wins', value: `${s.correctiveWinRate}%`, color: C.accentGold, bg: C.warningDim },
          ].map(st => (
            <View key={st.label} style={styles.statCard}>
              <View style={styles.statIconRow}>
                <View style={[styles.statIcon, { backgroundColor: st.bg }]}>
                  <st.icon size={16} color={st.color} strokeWidth={2} />
                </View>
              </View>
              <Text style={[styles.statVal, { color: st.color }]}>{st.value}</Text>
              <Text style={styles.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.compBanner}>
          <View style={styles.compHeader}>
            <BarChart2 size={16} color={C.primary} />
            <Text style={styles.compHeaderText}>Basic vs Corrective RAG</Text>
          </View>
          <View style={styles.compRow}>
            <View style={[styles.compCol, { borderColor: `${C.info}40`, backgroundColor: C.infoDim }]}>
              <Text style={[styles.compColTitle, { color: C.info }]}>Basic RAG</Text>
              <Text style={[styles.compScore, { color: C.info }]}>{s.basicAvg}</Text>
              <Text style={styles.compLabel}>avg score</Text>
              <Text style={[styles.compLabel, { color: C.info }]}>{s.basicWinRate}% wins</Text>
            </View>
            <Text style={styles.vsText}>VS</Text>
            <View style={[styles.compCol, { borderColor: `${C.accent}40`, backgroundColor: C.accentDim }]}>
              <Text style={[styles.compColTitle, { color: C.accent }]}>Corrective RAG</Text>
              <Text style={[styles.compScore, { color: C.accent }]}>{s.correctiveAvg}</Text>
              <Text style={styles.compLabel}>avg score</Text>
              <View style={styles.winnerBadge}>
                <Text style={styles.winnerBadgeText}>{s.correctiveWinRate}% wins</Text>
              </View>
            </View>
          </View>
          <View style={styles.improvRow}>
            <View style={styles.improvPill}>
              <TrendingUp size={13} color={C.success} />
              <View>
                <Text style={styles.improvText}>{s.faithfulnessImprovement}</Text>
                <Text style={styles.improvLabel}>Faithfulness</Text>
              </View>
            </View>
            <View style={styles.improvPill}>
              <Award size={13} color={C.success} />
              <View>
                <Text style={styles.improvText}>{s.correctnessImprovement}</Text>
                <Text style={styles.improvLabel}>Correctness</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.qCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Award size={15} color={C.accentGold} />
            <Text style={styles.sectionTitle}>Win Rate Distribution</Text>
          </View>
          <View style={{ flexDirection: 'row', height: 10, borderRadius: Radius.full, overflow: 'hidden', gap: 2 }}>
            <View style={{ flex: Math.max(0.01, s.correctiveWinRate), backgroundColor: C.accent, borderRadius: Radius.full }} />
            <View style={{ flex: Math.max(0.01, s.basicWinRate), backgroundColor: C.info, borderRadius: Radius.full }} />
            <View style={{ flex: Math.max(0.01, s.tieRate), backgroundColor: C.cardBorder, borderRadius: Radius.full }} />
          </View>
          <View style={{ flexDirection: 'row', gap: Spacing.md }}>
            {[
              { color: C.accent, label: `Corrective ${s.correctiveWinRate}%` },
              { color: C.info, label: `Basic ${s.basicWinRate}%` },
              { color: C.muted, label: `Tie ${s.tieRate}%` },
            ].map(l => (
              <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: l.color }} />
                <Text style={{ fontSize: FontSize.xs, color: C.muted }}>{l.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </>
    )
  }

  function renderQuestions() {
    if (questions.length === 0) {
      return (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>
            {loading ? 'Loading questions...' : 'No benchmark questions yet'}
          </Text>
          <Text style={styles.emptyHint}>
            Tap "New" to create your first benchmark question.
          </Text>
        </View>
      )
    }
    return (
      <View style={{ gap: Spacing.sm }}>
        {questions.map(q => {
          const isRunning = runningId === q.id
          const hasScore = q.hasResult && q.basicScore !== null && q.correctiveScore !== null
          return (
            <View key={q.id} style={styles.qCard}>
              <View style={styles.qTop}>
                <Text style={styles.qText} numberOfLines={2}>{q.question}</Text>
              </View>

              <View style={styles.qMeta}>
                <View style={[styles.diffBadge, { backgroundColor: `${difficultyColor(q.difficulty, C)}20` }]}>
                  <Text style={[styles.diffText, { color: difficultyColor(q.difficulty, C) }]}>
                    {q.difficulty}
                  </Text>
                </View>
                {q.subject ? (
                  <View style={styles.subjectTag}>
                    <Text style={styles.subjectText}>{q.subject}</Text>
                  </View>
                ) : null}
                <Text style={{ fontSize: FontSize.xs, color: C.muted }}>{timeAgo(q.createdAt)}</Text>
              </View>

              {hasScore ? (
                <View style={styles.qResultRow}>
                  <View style={[styles.scoreBox, { borderColor: `${C.info}40`, backgroundColor: C.infoDim }]}>
                    <Text style={[styles.scoreMode, { color: C.info }]}>Basic</Text>
                    <Text style={[styles.scoreNum, { color: C.info }]}>{q.basicScore}</Text>
                  </View>
                  <Text style={{ fontSize: FontSize.xs, color: C.muted, fontWeight: '700' }}>VS</Text>
                  <View style={[styles.scoreBox, { borderColor: `${C.accent}40`, backgroundColor: C.accentDim }]}>
                    <Text style={[styles.scoreMode, { color: C.accent }]}>Corrective</Text>
                    <Text style={[styles.scoreNum, { color: C.accent }]}>{q.correctiveScore}</Text>
                  </View>
                  <View style={[styles.winnerPill, {
                    backgroundColor: q.winner === 'corrective' ? C.accent : q.winner === 'basic' ? C.info : C.muted
                  }]}>
                    <Trophy size={11} color="#fff" />
                    <Text style={styles.winnerText}>{winnerLabel(q.winner)}</Text>
                  </View>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={styles.pendingTag}>
                    <Text style={styles.pendingText}>Pending run</Text>
                  </View>
                  <Pressable
                    style={[styles.runBtn, isRunning && { opacity: 0.7 }]}
                    onPress={() => handleRun(q.id)}
                    disabled={isRunning}
                  >
                    {isRunning
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Play size={13} color="#fff" fill="#fff" />
                    }
                    <Text style={styles.runBtnText}>{isRunning ? 'Running...' : 'Run'}</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )
        })}
      </View>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load() }}
              tintColor={C.primary}
            />
          }
        >
          <View style={styles.topBar}>
            <BrandLogo size={28} />
            <View style={styles.topBarRight}>
              <ThemeToggle />
            </View>
          </View>

          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.pageTitle}>Benchmarks</Text>
              <Text style={styles.pageSub}>Compare Basic RAG vs Corrective RAG quality</Text>
            </View>
            <Pressable style={styles.addBtn} onPress={() => setShowCreate(true)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Plus size={15} color="#fff" strokeWidth={2.5} />
                <Text style={styles.addBtnText}>New</Text>
              </View>
            </Pressable>
          </View>

          <PageDescription />

          <View style={styles.tabRow}>
            {(['questions', 'summary'] as const).map(t => (
              <Pressable key={t} style={[styles.tab, selectedTab === t && styles.tabActive]} onPress={() => setSelectedTab(t)}>
                <Text style={[styles.tabText, selectedTab === t && styles.tabTextActive]}>
                  {t === 'questions' ? 'Questions' : 'Summary'}
                </Text>
              </Pressable>
            ))}
          </View>

          {selectedTab === 'summary' ? renderSummary() : (
            <>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Benchmark Questions</Text>
                <Text style={styles.sectionCount}>{questions.length} total</Text>
              </View>
              {renderQuestions()}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Benchmark Question</Text>
              <Pressable style={styles.closeBtn} onPress={() => setShowCreate(false)}>
                <X size={16} color={C.text} />
              </Pressable>
            </View>

            <View>
              <Text style={styles.inputLabel}>Question *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Enter the benchmark question..."
                placeholderTextColor={C.muted}
                multiline
                value={form.question}
                onChangeText={t => setForm(f => ({ ...f, question: t }))}
              />
            </View>

            <View>
              <Text style={styles.inputLabel}>Subject *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Quantum Physics"
                placeholderTextColor={C.muted}
                value={form.subject}
                onChangeText={t => setForm(f => ({ ...f, subject: t }))}
              />
            </View>

            <View>
              <Text style={styles.inputLabel}>Expected Answer</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Describe the expected answer for scoring..."
                placeholderTextColor={C.muted}
                multiline
                value={form.expectedAnswer}
                onChangeText={t => setForm(f => ({ ...f, expectedAnswer: t }))}
              />
            </View>

            <View>
              <Text style={styles.inputLabel}>Difficulty</Text>
              <View style={styles.diffRow}>
                {DIFFICULTIES.map(d => (
                  <Pressable
                    key={d}
                    style={[styles.diffChip, form.difficulty === d && { borderColor: difficultyColor(d, C), backgroundColor: `${difficultyColor(d, C)}15` }]}
                    onPress={() => setForm(f => ({ ...f, difficulty: d }))}
                  >
                    <Text style={[styles.diffChipText, { color: form.difficulty === d ? difficultyColor(d, C) : C.muted }]}>{d}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable
              style={[styles.submitBtn, creating && { opacity: 0.7 }]}
              onPress={handleCreate}
              disabled={creating}
            >
              <Text style={styles.submitBtnText}>
                {creating ? 'Creating...' : 'Create Question'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  )
}
