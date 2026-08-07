import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import {
  ArrowLeft,
  BookOpen,
  Brain,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RotateCcw,
  Check,
  X,
  CircleAlert,
} from 'lucide-react-native'
import { useColors } from '../../../contexts/ThemeContext'
import { FontSize, Spacing, Radius } from '../../../constants/colors'
import {
  getStudyMaterialById,
  explainCardConcept,
  StudyMaterial,
  IFlashcardItem,
  IMcqItem,
} from '../../../services/studyMaterialApi'

export default function StudyMaterialDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const C = useColors()

  const [material, setMaterial] = useState<StudyMaterial | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Flashcards state
  const [cardIndex, setCardIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [explaining, setExplaining] = useState(false)
  const [explanation, setExplanation] = useState<string | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)

  // MCQ state
  const [mcqIndex, setMcqIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [quizScore, setQuizScore] = useState(0)
  const [quizFinished, setQuizFinished] = useState(false)

  const fetchDetail = useCallback(async (isPoll = false) => {
    if (!id) return
    try {
      if (!isPoll) setLoading(true)
      const data = await getStudyMaterialById(id)
      setMaterial(data)
      setError(null)
      setLoading(false)

      // If pending or generating, poll again
      if (data.status === 'PENDING' || data.status === 'GENERATING') {
        setTimeout(() => fetchDetail(true), 2500)
      }
    } catch (err: any) {
      console.error('[study-material-detail] fetch error', err)
      setError(err instanceof Error ? err.message : 'Failed to load study set.')
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  // --- Flashcard Actions ---
  const handleNextCard = () => {
    if (!material) return
    setFlipped(false)
    setCardIndex((prev) => Math.min(material.items.length - 1, prev + 1))
  }

  const handlePrevCard = () => {
    setFlipped(false)
    setCardIndex((prev) => Math.max(0, prev - 1))
  }

  const handleExplain = async () => {
    if (!id || !material) return
    if (material.sourceStatus === 'DELETED') {
      Alert.alert('Source document deleted', 'This study set remains available, but new AI explanations cannot be generated.')
      return
    }
    setExplaining(true)
    setShowExplanation(true)
    setExplanation(null)
    try {
      const exp = await explainCardConcept(id, cardIndex)
      setExplanation(exp)
    } catch (err: any) {
      Alert.alert('AI Explanation Failed', err.message || 'Could not explain concept.')
      setShowExplanation(false)
    } finally {
      setExplaining(false)
    }
  }

  // --- MCQ Actions ---
  const handleSelectOption = (idx: number) => {
    if (selectedOption !== null || !material) return
    setSelectedOption(idx)
    const item = material.items[mcqIndex] as IMcqItem
    if (idx === item.correctIndex) {
      setQuizScore((prev) => prev + 1)
    }
  }

  const handleNextQuestion = () => {
    if (!material) return
    setSelectedOption(null)
    if (mcqIndex < material.items.length - 1) {
      setMcqIndex((prev) => prev + 1)
    } else {
      setQuizFinished(true)
    }
  }

  const handleResetQuiz = () => {
    setMcqIndex(0)
    setSelectedOption(null)
    setQuizScore(0)
    setQuizFinished(false)
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.background }]}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Pressable style={[styles.backBtn, { backgroundColor: C.card, borderColor: C.cardBorder }]} onPress={() => router.back()}>
              <ArrowLeft size={18} color={C.textSecondary} />
            </Pressable>
          </View>
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={[styles.loadingTitle, { color: C.text }]}>Analyzing Content</Text>
            <Text style={[styles.loadingDesc, { color: C.muted }]}>Retrieving set items and formatting questions...</Text>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  if (error || !material) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.background }]}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Pressable style={[styles.backBtn, { backgroundColor: C.card, borderColor: C.cardBorder }]} onPress={() => router.back()}>
              <ArrowLeft size={18} color={C.textSecondary} />
            </Pressable>
          </View>
          <View style={styles.centerWrap}>
            <X size={36} color={C.error} />
            <Text style={[styles.loadingTitle, { color: C.error }]}>Failed to Load</Text>
            <Text style={[styles.loadingDesc, { color: C.muted }]}>{error || 'The study material could not be found.'}</Text>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  // Handle generation pending states
  if (material.status === 'PENDING' || material.status === 'GENERATING') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.background }]}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Pressable style={[styles.backBtn, { backgroundColor: C.card, borderColor: C.cardBorder }]} onPress={() => router.back()}>
              <ArrowLeft size={18} color={C.textSecondary} />
            </Pressable>
          </View>
          <View style={styles.centerWrap}>
            <RotateCcw size={44} color={C.primary} style={{ transform: [{ rotate: '45deg' }] }} />
            <Text style={[styles.loadingTitle, { color: C.text }]}>AI is Creating Your Set</Text>
            <Text style={[styles.loadingDesc, { color: C.muted }]}>
              We are analyzing your document text and generating customized questions. This page will update automatically.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  if (material.status === 'FAILED') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.background }]}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Pressable style={[styles.backBtn, { backgroundColor: C.card, borderColor: C.cardBorder }]} onPress={() => router.back()}>
              <ArrowLeft size={18} color={C.textSecondary} />
            </Pressable>
          </View>
          <View style={styles.centerWrap}>
            <X size={36} color={C.error} />
            <Text style={[styles.loadingTitle, { color: C.error }]}>Generation Failed</Text>
            <Text style={[styles.loadingDesc, { color: C.muted }]}>
              {material.error || 'The AI model was unable to generate study materials from this document.'}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  const items = material.items
  const totalItems = items.length

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.background }]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Pressable style={[styles.backBtn, { backgroundColor: C.card, borderColor: C.cardBorder }]} onPress={() => router.back()}>
              <ArrowLeft size={18} color={C.textSecondary} />
            </Pressable>
            <Text style={[styles.title, { color: C.text }]} numberOfLines={1}>
              {material.title}
            </Text>
          </View>
        </View>

        {material.sourceStatus === 'DELETED' ? (
          <View style={[styles.sourceDeletedBanner, { backgroundColor: C.cardElevated, borderColor: C.cardBorder }]}>
            <CircleAlert size={16} color={C.muted} />
            <Text style={[styles.sourceDeletedText, { color: C.muted }]}>Source document deleted. Existing cards and quiz content remain available.</Text>
          </View>
        ) : null}

        {material.type === 'FLASHCARD' ? (
          // --- FLASHCARDS DISPLAY ---
          <View style={styles.centerWrap}>
            <Pressable
              style={styles.flashcardOuter}
              onPress={() => setFlipped(!flipped)}
            >
              <View
                style={[
                  styles.flashcard,
                  {
                    backgroundColor: C.card,
                    borderColor: flipped ? C.primary : C.cardBorder,
                    shadowColor: flipped ? C.primary : C.cardShadowColor,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <Text
                    style={[
                      styles.cardSideTag,
                      {
                        backgroundColor: flipped ? `${C.accent}14` : `${C.primary}14`,
                        color: flipped ? C.accent : C.primary,
                      },
                    ]}
                  >
                    {flipped ? 'BACK' : 'FRONT'}
                  </Text>
                  <Text style={[styles.cardCount, { color: C.muted }]}>
                    {cardIndex + 1} / {totalItems}
                  </Text>
                </View>

                <Text style={[styles.cardText, { color: C.text }]}>
                  {flipped
                    ? (items[cardIndex] as IFlashcardItem).back
                    : (items[cardIndex] as IFlashcardItem).front}
                </Text>

                <Text style={[styles.cardHint, { color: C.muted }]}>Tap card to flip</Text>
              </View>
            </Pressable>

            {/* Navigation Controls */}
            <View style={styles.controlRow}>
              <Pressable
                disabled={cardIndex === 0}
                onPress={handlePrevCard}
                style={[styles.arrowBtn, { backgroundColor: C.card, borderColor: C.cardBorder }, cardIndex === 0 && { opacity: 0.3 }]}
              >
                <ChevronLeft size={20} color={C.text} />
              </Pressable>

              <Pressable
                disabled={material.sourceStatus === 'DELETED'}
                style={[styles.explainBtn, { backgroundColor: C.primary }, material.sourceStatus === 'DELETED' && { opacity: 0.45 }]}
                onPress={handleExplain}
              >
                <Sparkles size={16} color="#fff" />
                <Text style={styles.explainBtnText}>AI Explain</Text>
              </Pressable>

              <Pressable
                disabled={cardIndex === totalItems - 1}
                onPress={handleNextCard}
                style={[styles.arrowBtn, { backgroundColor: C.card, borderColor: C.cardBorder }, cardIndex === totalItems - 1 && { opacity: 0.3 }]}
              >
                <ChevronRight size={20} color={C.text} />
              </Pressable>
            </View>
          </View>
        ) : (
          // --- MCQ DISPLAY ---
          <View style={styles.centerWrap}>
            {quizFinished ? (
              // Quiz Finished Score Summary
              <View style={[styles.scoreCard, { backgroundColor: C.card, borderColor: C.cardBorder }]}>
                <Text style={[styles.scoreTitle, { color: C.text }]}>Quiz Completed</Text>
                <View
                  style={[
                    styles.scoreRing,
                    {
                      borderColor: quizScore === totalItems ? C.success : C.primary,
                    },
                  ]}
                >
                  <Text style={[styles.scoreValue, { color: C.text }]}>{quizScore}</Text>
                  <Text style={[styles.scoreLabel, { color: C.muted }]}>of {totalItems}</Text>
                </View>
                <Text style={[styles.scoreDesc, { color: C.textSecondary }]}>
                  {quizScore === totalItems
                    ? 'Excellent job! You answered every question correctly.'
                    : quizScore >= totalItems / 2
                    ? 'Good effort! Review the explanations to cover remaining gaps.'
                    : 'Keep studying! Try active recall on flashcards before retaking.'}
                </Text>
                <Pressable style={[styles.resetBtn, { backgroundColor: C.cardBorder }]} onPress={handleResetQuiz}>
                  <RotateCcw size={16} color={C.textSecondary} />
                  <Text style={[styles.resetText, { color: C.text }]}>Retake Quiz</Text>
                </Pressable>
              </View>
            ) : (
              // Question Card
              <ScrollView
                style={{ width: '100%' }}
                contentContainerStyle={{ alignItems: 'center' }}
                showsVerticalScrollIndicator={false}
              >
                <View style={[styles.mcqCard, { backgroundColor: C.card, borderColor: C.cardBorder }]}>
                  <View style={styles.questionHeader}>
                    <Text style={[styles.questionCountText, { color: C.primary }]}>
                      Question {mcqIndex + 1} of {totalItems}
                    </Text>
                    <Text style={{ fontSize: FontSize.xs, color: C.muted }}>
                      Score: {quizScore}
                    </Text>
                  </View>

                  <Text style={[styles.questionText, { color: C.text }]}>
                    {(items[mcqIndex] as IMcqItem).question}
                  </Text>

                  {/* Options */}
                  <View style={styles.optionsList}>
                    {(items[mcqIndex] as IMcqItem).options.map((opt, oIdx) => {
                      const item = items[mcqIndex] as IMcqItem
                      const isCorrect = oIdx === item.correctIndex
                      const isSelected = oIdx === selectedOption
                      
                      let btnBg = C.cardElevated
                      let borderCol = C.cardBorder
                      let labelBg = C.cardBorder
                      let labelTextCol = C.text
                      let IconComponent = null

                      if (selectedOption !== null) {
                        if (isCorrect) {
                          btnBg = `${C.success}14`
                          borderCol = C.success
                          labelBg = C.success
                          labelTextCol = '#fff'
                          IconComponent = <Check size={12} color="#fff" />
                        } else if (isSelected) {
                          btnBg = `${C.error}14`
                          borderCol = C.error
                          labelBg = C.error
                          labelTextCol = '#fff'
                          IconComponent = <X size={12} color="#fff" />
                        }
                      } else if (isSelected) {
                        borderCol = C.primary
                        labelBg = C.primaryDim
                        labelTextCol = C.primary
                      }

                      return (
                        <Pressable
                          key={oIdx}
                          style={[styles.optionBtn, { backgroundColor: btnBg, borderColor: borderCol }]}
                          onPress={() => handleSelectOption(oIdx)}
                          disabled={selectedOption !== null}
                        >
                          <View style={[styles.optionLabel, { backgroundColor: labelBg, borderColor: borderCol }]}>
                            {IconComponent || (
                              <Text style={[styles.optionLabelText, { color: labelTextCol }]}>
                                {String.fromCharCode(65 + oIdx)}
                              </Text>
                            )}
                          </View>
                          <Text style={[styles.optionText, { color: C.text }]}>{opt}</Text>
                        </Pressable>
                      )
                    })}
                  </View>

                  {/* Explanation (Shown after choice) */}
                  {selectedOption !== null && (
                    <View style={[styles.explanationBox, { backgroundColor: C.primaryDim, borderColor: C.primary }]}>
                      <Text style={[styles.explanationTitle, { color: C.primary }]}>EXPLANATION</Text>
                      <Text style={[styles.explanationText, { color: C.textSecondary }]}>
                        {(items[mcqIndex] as IMcqItem).explanation || 'No explanation provided.'}
                      </Text>
                    </View>
                  )}

                  {/* Action Button */}
                  {selectedOption !== null && (
                    <Pressable style={[styles.nextBtn, { backgroundColor: C.primary }]} onPress={handleNextQuestion}>
                      <Text style={styles.nextBtnText}>
                        {mcqIndex === totalItems - 1 ? 'Finish Quiz' : 'Next Question'}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        )}
      </View>

      {/* AI Explanation Drawer Sheet */}
      <Modal
        visible={showExplanation}
        transparent
        animationType="slide"
        onRequestClose={() => setShowExplanation(false)}
      >
        <Pressable style={styles.overlay} onPress={() => !explaining && setShowExplanation(false)}>
          <View
            style={[styles.sheet, { backgroundColor: C.card }]}
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: C.text }]}>AI Concept Explanation</Text>
              <Pressable
                style={[styles.closeBtn, { backgroundColor: C.cardBorder }]}
                onPress={() => setShowExplanation(false)}
                disabled={explaining}
              >
                <X size={16} color={C.textSecondary} />
              </Pressable>
            </View>

            {explaining ? (
              <View style={{ height: 180, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm }}>
                <ActivityIndicator size="large" color={C.primary} />
                <Text style={{ fontSize: FontSize.xs, color: C.muted }}>Generating deep explanation...</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                <Text style={[styles.explanationTextContent, { color: C.text }]}>
                  {explanation}
                </Text>
              </ScrollView>
            )}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: Spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  title: { fontSize: FontSize.lg, fontWeight: '800', letterSpacing: -0.5, flexShrink: 1 },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xl },
  loadingTitle: { fontSize: FontSize.md, fontWeight: '700', marginTop: Spacing.md },
  loadingDesc: { fontSize: FontSize.sm, textAlign: 'center', marginTop: 4, paddingHorizontal: Spacing.xl, lineHeight: 20 },
  
  // Flashcard styles
  flashcardOuter: {
    width: '100%',
    maxWidth: 340,
    aspectRatio: 0.8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  flashcard: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    padding: Spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  cardHeader: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardSideTag: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  cardCount: { fontSize: FontSize.xs, fontWeight: '600' },
  cardText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 28,
    paddingHorizontal: Spacing.md,
  },
  cardHint: {
    position: 'absolute',
    bottom: Spacing.lg,
    fontSize: FontSize.xs,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 340,
    gap: Spacing.md,
  },
  arrowBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  explainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    borderRadius: Radius.full,
    flex: 1,
    justifyContent: 'center',
  },
  explainBtnText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '700' },
  sourceDeletedBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.sm },
  sourceDeletedText: { flex: 1, fontSize: FontSize.xs, lineHeight: 18 },

  // MCQ styles
  mcqCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  questionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  questionCountText: { fontSize: FontSize.xs, fontWeight: '700' },
  questionText: { fontSize: FontSize.md + 1, fontWeight: '700', lineHeight: 24 },
  optionsList: { gap: Spacing.sm, marginTop: Spacing.xs },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  optionLabel: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabelText: { fontSize: FontSize.xs, fontWeight: '700' },
  optionText: { fontSize: FontSize.sm, flex: 1, fontWeight: '500' },
  explanationBox: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    gap: 4,
  },
  explanationTitle: { fontSize: FontSize.xs, fontWeight: '800' },
  explanationText: { fontSize: FontSize.sm, lineHeight: 20 },
  nextBtn: {
    paddingVertical: 14,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  nextBtnText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '700' },

  // Score Summary styles
  scoreCard: {
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  scoreTitle: { fontSize: FontSize.xl, fontWeight: '800' },
  scoreRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    marginVertical: Spacing.sm,
  },
  scoreValue: { fontSize: FontSize.xxl, fontWeight: '900' },
  scoreLabel: { fontSize: FontSize.xs, fontWeight: '600' },
  scoreDesc: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20, marginBottom: Spacing.md },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 12,
    borderRadius: Radius.md,
    width: '100%',
    justifyContent: 'center',
  },
  resetText: { fontSize: FontSize.sm, fontWeight: '700' },

  // Explanation drawer styles
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    maxHeight: '60%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sheetTitle: { fontSize: FontSize.md + 1, fontWeight: '800', flex: 1 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  explanationTextContent: { fontSize: FontSize.sm, lineHeight: 22 },
})
