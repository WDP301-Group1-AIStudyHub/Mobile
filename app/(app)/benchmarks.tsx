import { useMemo, useState } from 'react'
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import {
  BarChart2,
  Plus,
  Play,
  Trophy,
  Target,
  Zap,
  Brain,
  CheckCircle2,
  XCircle,
  X,
  ChevronRight,
  FlaskConical,
  TrendingUp,
  Award,
} from 'lucide-react-native'
import VideoBg from '../../components/ui/VideoBg'
import Card from '../../components/ui/Card'
import BrandLogo from '../../components/ui/BrandLogo'
import ThemeToggle from '../../components/ui/ThemeToggle'
import { FontSize, Spacing, Radius } from '../../constants/colors'
import { useColors } from '../../contexts/ThemeContext'

// ─── Mock data (replace with API calls) ─────────────────────────────────────

type Difficulty = 'Easy' | 'Medium' | 'Hard'
type WinnerMode = 'basic' | 'corrective' | 'tie' | null

interface BenchmarkQuestion {
  id: string
  question: string
  subject: string
  difficulty: Difficulty
  hasResult: boolean
  winner: WinnerMode
  basicScore: number | null
  correctiveScore: number | null
  createdAt: string
}

const MOCK_QUESTIONS: BenchmarkQuestion[] = [
  {
    id: '1',
    question: 'Explain quantum entanglement and its applications in computing.',
    subject: 'Quantum Physics',
    difficulty: 'Hard',
    hasResult: true,
    winner: 'corrective',
    basicScore: 72,
    correctiveScore: 91,
    createdAt: '2h ago',
  },
  {
    id: '2',
    question: 'What are the key differences between supervised and unsupervised learning?',
    subject: 'Machine Learning',
    difficulty: 'Medium',
    hasResult: true,
    winner: 'corrective',
    basicScore: 80,
    correctiveScore: 88,
    createdAt: 'Yesterday',
  },
  {
    id: '3',
    question: 'Describe the structure of a transformer neural network.',
    subject: 'Deep Learning',
    difficulty: 'Hard',
    hasResult: true,
    winner: 'tie',
    basicScore: 84,
    correctiveScore: 84,
    createdAt: '2 days ago',
  },
  {
    id: '4',
    question: 'What is photosynthesis and how does it work?',
    subject: 'Biology',
    difficulty: 'Easy',
    hasResult: false,
    winner: null,
    basicScore: null,
    correctiveScore: null,
    createdAt: '3 days ago',
  },
]

const MOCK_SUMMARY = {
  totalRuns: 38,
  basicAvg: 75,
  correctiveAvg: 89,
  correctiveWinRate: 71,
  basicWinRate: 16,
  tieRate: 13,
  faithfulnessImprovement: '+18%',
  correctnessImprovement: '+14%',
}

const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function difficultyColor(d: Difficulty, C: ReturnType<typeof useColors>): string {
  if (d === 'Easy') return C.success
  if (d === 'Medium') return C.warning
  return C.error
}

function winnerLabel(w: WinnerMode) {
  if (w === 'corrective') return 'Corrective'
  if (w === 'basic') return 'Basic'
  return 'Tie'
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BenchmarksPage() {
  const C = useColors()
  const [showCreate, setShowCreate] = useState(false)
  const [runningId, setRunningId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<BenchmarkQuestion[]>(MOCK_QUESTIONS)
  const [selectedTab, setSelectedTab] = useState<'questions' | 'summary'>('questions')

  // Create form state
  const [form, setForm] = useState({ question: '', subject: '', expectedAnswer: '', difficulty: 'Medium' as Difficulty })

  function handleRun(id: string) {
    setRunningId(id)
    // TODO: call POST /api/benchmark/run/:questionId
    setTimeout(() => setRunningId(null), 2000)
  }

  function handleCreate() {
    if (!form.question.trim() || !form.subject.trim()) return
    const newQ: BenchmarkQuestion = {
      id: Date.now().toString(),
      question: form.question,
      subject: form.subject,
      difficulty: form.difficulty,
      hasResult: false,
      winner: null,
      basicScore: null,
      correctiveScore: null,
      createdAt: 'Just now',
    }
    setQuestions(prev => [newQ, ...prev])
    setForm({ question: '', subject: '', expectedAnswer: '', difficulty: 'Medium' })
    setShowCreate(false)
  }

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1 },
    scroll: { flex: 1 },
    content: { padding: Spacing.lg, paddingBottom: Spacing.xxl + 24, gap: Spacing.lg },

    // Top bar
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    topBarRight: { flexDirection: 'row', gap: Spacing.sm },

    // Header
    headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    pageTitle: { fontSize: FontSize.xl, fontWeight: '700', color: C.text, letterSpacing: 0.2 },
    pageSub: { fontSize: FontSize.sm, color: C.muted, marginTop: 3, maxWidth: '75%' },
    addBtn: { borderRadius: Radius.lg, overflow: 'hidden', marginTop: 2 },
    addBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9 },
    addBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: '#fff' },

    // Tab switcher
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

    // Summary stats
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

    // Comparison banner
    compBanner: { borderRadius: Radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: C.cardBorder },
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

    // Section header
    sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sectionTitle: { fontSize: FontSize.base, fontWeight: '700', color: C.text },
    sectionCount: { fontSize: FontSize.sm, color: C.muted },

    // Question card
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
    },
    winnerText: { fontSize: FontSize.xs, fontWeight: '700', color: '#fff' },
    runBtn: { borderRadius: Radius.md, overflow: 'hidden', alignSelf: 'flex-end' },
    runBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8 },
    runBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: '#fff' },
    pendingTag: {
      borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 5,
      backgroundColor: C.warningDim, alignSelf: 'flex-start',
    },
    pendingText: { fontSize: FontSize.xs, fontWeight: '700', color: C.warning },

    // Modal
    modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: C.backgroundMid,
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
    submitBtn: { borderRadius: Radius.lg, overflow: 'hidden', marginTop: 4 },
    submitBtnGrad: { padding: Spacing.md, alignItems: 'center' },
    submitBtnText: { fontSize: FontSize.base, fontWeight: '700', color: '#fff' },
  }), [C])

  // ─── Render summary tab ───────────────────────────────────────────────────

  function renderSummary() {
    return (
      <>
        {/* Stats grid */}
        <View style={styles.statsGrid}>
          {[
            { icon: FlaskConical, label: 'Total Runs', value: `${MOCK_SUMMARY.totalRuns}`, color: C.primary, bg: C.primaryDim },
            { icon: BarChart2, label: 'Basic Avg', value: `${MOCK_SUMMARY.basicAvg}%`, color: C.info, bg: C.infoDim },
            { icon: Brain, label: 'Corrective Avg', value: `${MOCK_SUMMARY.correctiveAvg}%`, color: C.accent, bg: `${C.accent}18` },
            { icon: Trophy, label: 'Corrective Wins', value: `${MOCK_SUMMARY.correctiveWinRate}%`, color: C.accentGold, bg: C.warningDim },
          ].map(s => (
            <View key={s.label} style={styles.statCard}>
              <View style={styles.statIconRow}>
                <View style={[styles.statIcon, { backgroundColor: s.bg }]}>
                  <s.icon size={16} color={s.color} strokeWidth={2} />
                </View>
              </View>
              <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Comparison banner */}
        <View style={[styles.compBanner, { backgroundColor: C.card }]}>
          <View style={styles.compHeader}>
            <BarChart2 size={16} color={C.primary} />
            <Text style={styles.compHeaderText}>Basic vs Corrective RAG</Text>
          </View>
          <View style={styles.compRow}>
            {/* Basic */}
            <View style={[styles.compCol, { borderColor: `${C.info}40`, backgroundColor: C.infoDim }]}>
              <Text style={[styles.compColTitle, { color: C.info }]}>Basic RAG</Text>
              <Text style={[styles.compScore, { color: C.info }]}>{MOCK_SUMMARY.basicAvg}</Text>
              <Text style={styles.compLabel}>avg score</Text>
              <Text style={[styles.compLabel, { color: C.info }]}>{MOCK_SUMMARY.basicWinRate}% wins</Text>
            </View>
            <Text style={styles.vsText}>VS</Text>
            {/* Corrective */}
            <View style={[styles.compCol, { borderColor: `${C.accent}40`, backgroundColor: `${C.accent}12` }]}>
              <LinearGradient
                colors={['transparent', `${C.accent}08`]}
                style={[StyleSheet.absoluteFill, { borderRadius: Radius.lg }]}
              />
              <Text style={[styles.compColTitle, { color: C.accent }]}>Corrective RAG</Text>
              <Text style={[styles.compScore, { color: C.accent }]}>{MOCK_SUMMARY.correctiveAvg}</Text>
              <Text style={styles.compLabel}>avg score</Text>
              <View style={[styles.winnerBadge, { backgroundColor: C.accent }]}>
                <Text style={styles.winnerBadgeText}>🏆 {MOCK_SUMMARY.correctiveWinRate}% wins</Text>
              </View>
            </View>
          </View>
          {/* Improvement pills */}
          <View style={styles.improvRow}>
            <View style={styles.improvPill}>
              <TrendingUp size={13} color={C.success} />
              <View>
                <Text style={styles.improvText}>{MOCK_SUMMARY.faithfulnessImprovement}</Text>
                <Text style={styles.improvLabel}>Faithfulness</Text>
              </View>
            </View>
            <View style={styles.improvPill}>
              <CheckCircle2 size={13} color={C.success} />
              <View>
                <Text style={styles.improvText}>{MOCK_SUMMARY.correctnessImprovement}</Text>
                <Text style={styles.improvLabel}>Correctness</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Win rate bar */}
        <View style={[styles.qCard, { gap: Spacing.sm }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Award size={15} color={C.accentGold} />
            <Text style={styles.sectionTitle}>Win Rate Distribution</Text>
          </View>
          <View style={{ flexDirection: 'row', height: 10, borderRadius: Radius.full, overflow: 'hidden', gap: 2 }}>
            <View style={{ flex: MOCK_SUMMARY.correctiveWinRate, backgroundColor: C.accent, borderRadius: Radius.full }} />
            <View style={{ flex: MOCK_SUMMARY.basicWinRate, backgroundColor: C.info, borderRadius: Radius.full }} />
            <View style={{ flex: MOCK_SUMMARY.tieRate, backgroundColor: C.cardBorder, borderRadius: Radius.full }} />
          </View>
          <View style={{ flexDirection: 'row', gap: Spacing.md }}>
            {[
              { color: C.accent, label: `Corrective ${MOCK_SUMMARY.correctiveWinRate}%` },
              { color: C.info, label: `Basic ${MOCK_SUMMARY.basicWinRate}%` },
              { color: C.muted, label: `Tie ${MOCK_SUMMARY.tieRate}%` },
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

  // ─── Render questions tab ─────────────────────────────────────────────────

  function renderQuestions() {
    return (
      <View style={{ gap: Spacing.sm }}>
        {questions.map(q => {
          const isRunning = runningId === q.id
          return (
            <View key={q.id} style={styles.qCard}>
              {/* Question text + difficulty */}
              <View style={styles.qTop}>
                <Text style={styles.qText} numberOfLines={2}>{q.question}</Text>
              </View>

              {/* Tags */}
              <View style={styles.qMeta}>
                <View style={[styles.diffBadge, { backgroundColor: `${difficultyColor(q.difficulty, C)}20` }]}>
                  <Text style={[styles.diffText, { color: difficultyColor(q.difficulty, C) }]}>{q.difficulty}</Text>
                </View>
                <View style={styles.subjectTag}>
                  <Text style={styles.subjectText}>{q.subject}</Text>
                </View>
                <Text style={{ fontSize: FontSize.xs, color: C.muted }}>{q.createdAt}</Text>
              </View>

              {/* Result or Run button */}
              {q.hasResult && q.basicScore !== null && q.correctiveScore !== null ? (
                <View style={{ gap: Spacing.sm }}>
                  <View style={styles.qResultRow}>
                    {/* Basic score */}
                    <View style={[styles.scoreBox, { borderColor: `${C.info}40`, backgroundColor: C.infoDim }]}>
                      <Text style={[styles.scoreMode, { color: C.info }]}>Basic</Text>
                      <Text style={[styles.scoreNum, { color: C.info }]}>{q.basicScore}</Text>
                    </View>
                    {/* VS */}
                    <Text style={{ fontSize: FontSize.xs, color: C.muted, fontWeight: '700' }}>VS</Text>
                    {/* Corrective score */}
                    <View style={[styles.scoreBox, { borderColor: `${C.accent}40`, backgroundColor: `${C.accent}10` }]}>
                      <Text style={[styles.scoreMode, { color: C.accent }]}>Corrective</Text>
                      <Text style={[styles.scoreNum, { color: C.accent }]}>{q.correctiveScore}</Text>
                    </View>
                    {/* Winner */}
                    <LinearGradient
                      colors={q.winner === 'corrective' ? C.gradientPrimary : q.winner === 'basic' ? [C.info, C.secondary] : [C.muted, C.mutedLight]}
                      style={styles.winnerPill}
                    >
                      <Trophy size={11} color="#fff" />
                      <Text style={styles.winnerText}>{winnerLabel(q.winner)}</Text>
                    </LinearGradient>
                  </View>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={styles.pendingTag}>
                    <Text style={styles.pendingText}>Pending run</Text>
                  </View>
                  <Pressable style={styles.runBtn} onPress={() => handleRun(q.id)} disabled={isRunning}>
                    <LinearGradient colors={C.gradientPrimary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.runBtnGrad}>
                      {isRunning
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Play size={13} color="#fff" fill="#fff" />
                      }
                      <Text style={styles.runBtnText}>{isRunning ? 'Running…' : 'Run'}</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              )}
            </View>
          )
        })}
      </View>
    )
  }

  // ─── Main render ─────────────────────────────────────────────────────────

  return (
    <VideoBg>
      <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Top bar */}
          <View style={styles.topBar}>
            <BrandLogo size="sm" />
            <View style={styles.topBarRight}>
              <ThemeToggle />
            </View>
          </View>

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.pageTitle}>Benchmarks</Text>
              <Text style={styles.pageSub}>Compare Basic RAG vs Corrective RAG quality</Text>
            </View>
            <Pressable style={styles.addBtn} onPress={() => setShowCreate(true)}>
              <LinearGradient colors={C.gradientPrimary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.addBtnGrad}>
                <Plus size={15} color="#fff" strokeWidth={2.5} />
                <Text style={styles.addBtnText}>New</Text>
              </LinearGradient>
            </Pressable>
          </View>

          {/* Tab switcher */}
          <View style={styles.tabRow}>
            {(['questions', 'summary'] as const).map(t => (
              <Pressable key={t} style={[styles.tab, selectedTab === t && styles.tabActive]} onPress={() => setSelectedTab(t)}>
                <Text style={[styles.tabText, selectedTab === t && styles.tabTextActive]}>
                  {t === 'questions' ? '📋  Questions' : '📊  Summary'}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Tab content */}
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

      {/* Create Modal */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Benchmark Question</Text>
              <Pressable style={styles.closeBtn} onPress={() => setShowCreate(false)}>
                <X size={16} color={C.text} />
              </Pressable>
            </View>

            {/* Question */}
            <View>
              <Text style={styles.inputLabel}>Question *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Enter the benchmark question…"
                placeholderTextColor={C.muted}
                multiline
                value={form.question}
                onChangeText={t => setForm(f => ({ ...f, question: t }))}
              />
            </View>

            {/* Subject */}
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

            {/* Expected Answer */}
            <View>
              <Text style={styles.inputLabel}>Expected Answer</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Describe the expected answer for scoring…"
                placeholderTextColor={C.muted}
                multiline
                value={form.expectedAnswer}
                onChangeText={t => setForm(f => ({ ...f, expectedAnswer: t }))}
              />
            </View>

            {/* Difficulty */}
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

            {/* Submit */}
            <Pressable style={styles.submitBtn} onPress={handleCreate}>
              <LinearGradient colors={C.gradientPrimary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitBtnGrad}>
                <Text style={styles.submitBtnText}>Create Question</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>
    </VideoBg>
  )
}
