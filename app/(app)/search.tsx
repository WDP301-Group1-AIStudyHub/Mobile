import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Filter,
  Search,
  X,
} from 'lucide-react-native'
import { router } from 'expo-router'
import { FontSize, Radius, Spacing } from '../../constants/colors'
import { useColors } from '../../contexts/ThemeContext'
import { listDocuments, listSharedWithMe } from '../../services/documentApi'
import { listSubjects } from '../../services/subjectApi'
import type { DocumentItem } from '../../types/document'
import type { SubjectItem } from '../../types/subject'
import { anyMatches, extractSnippet } from '../../utils/searchUtils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSafeId(item: unknown): string {
  if (!item || typeof item !== 'object') return ''
  const obj = item as { _id?: string; id?: string }
  return obj._id?.toString() || obj.id?.toString() || ''
}

function getSubjectName(subject: unknown, fallback = 'Uncategorized'): string {
  if (!subject) return fallback
  if (typeof subject === 'string') return subject || fallback
  if (typeof subject === 'object') {
    const n = (subject as Record<string, unknown>).name
    if (typeof n === 'string' && n.length > 0) return n
  }
  return fallback
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileTypeLabel(fileType?: string, fileName?: string): string {
  const source = fileType || fileName || ''
  if (source.includes('pdf')) return 'PDF'
  if (source.includes('word') || source.includes('docx') || source.endsWith('.docx')) return 'DOCX'
  if (source.includes('presentation') || source.includes('pptx')) return 'PPTX'
  if (source.includes('sheet') || source.includes('xlsx')) return 'XLSX'
  if (source.includes('plain') || source.includes('.txt')) return 'TXT'
  if (source.includes('image') || source.includes('png') || source.includes('jpg')) return 'IMG'
  const ext = fileName?.split('.').pop()?.toUpperCase()
  return ext || 'FILE'
}

function getFileTypeColor(label: string, C: ReturnType<typeof useColors>): string {
  switch (label) {
    case 'PDF': return C.error
    case 'DOCX': case 'DOC': return C.info
    case 'PPTX': return '#f97316'
    case 'XLSX': return C.success
    case 'IMG': return C.accentTeal
    default: return C.muted
  }
}

// ─── FILE TYPE FILTER OPTIONS ─────────────────────────────────────────────────
const FILE_TYPE_OPTIONS = ['ALL', 'PDF', 'DOCX', 'PPTX', 'XLSX', 'TXT', 'IMG']

// ─── Search Screen ────────────────────────────────────────────────────────────
export default function SearchPage() {
  const C = useColors()

  // Data
  const [allDocs, setAllDocs] = useState<DocumentItem[]>([])
  const [subjects, setSubjects] = useState<SubjectItem[]>([])
  const [loadingData, setLoadingData] = useState(true)

  // Search state
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [subjectFilter, setSubjectFilter] = useState<string>('ALL') // 'ALL' or subject id
  const [fileTypeFilter, setFileTypeFilter] = useState<string>('ALL')
  const [showSubjectSheet, setShowSubjectSheet] = useState(false)

  // Debounce
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<TextInput>(null)

  // Load all accessible documents on mount
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoadingData(true)
        const [myDocs, sharedDocs, subs] = await Promise.all([
          listDocuments().catch(() => [] as DocumentItem[]),
          listSharedWithMe().catch(() => [] as DocumentItem[]),
          listSubjects().catch(() => [] as SubjectItem[]),
        ])

        if (!cancelled) {
          // Merge, deduplicate by id
          const seen = new Set<string>()
          const merged: DocumentItem[] = []
          for (const d of [...myDocs, ...sharedDocs]) {
            const id = d.id || (d as any)._id || ''
            if (!seen.has(id)) {
              seen.add(id)
              merged.push(d)
            }
          }
          setAllDocs(merged)
          setSubjects(Array.isArray(subs) ? subs : [])
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoadingData(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Auto-focus search bar
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 200)
    return () => clearTimeout(t)
  }, [])

  // Debounce query input
  const handleQueryChange = useCallback((text: string) => {
    setQuery(text)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(text.trim())
    }, 250)
  }, [])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // ── Filtered results ───────────────────────────────────────────────────────
  const results = React.useMemo(() => {
    let list = allDocs

    // Subject filter
    if (subjectFilter !== 'ALL') {
      list = list.filter((d) => {
        const docSubjectId = d.subjectId || getSafeId(d.subject) || getSafeId(d.personalSubject)
        return docSubjectId === subjectFilter
      })
    }

    // File type filter
    if (fileTypeFilter !== 'ALL') {
      list = list.filter((d) => {
        const label = getFileTypeLabel(d.fileType, d.fileName)
        return label === fileTypeFilter
      })
    }

    // Keyword filter (accent/case insensitive)
    if (debouncedQuery) {
      list = list.filter((d) => {
        const subjectName = getSubjectName(d.personalSubject ?? d.subject)
        const author =
          typeof d.uploadedBy === 'object' && d.uploadedBy !== null
            ? ((d.uploadedBy as any).fullName || (d.uploadedBy as any).name || (d.uploadedBy as any).email || '')
            : typeof d.uploadedBy === 'string' ? d.uploadedBy : ''
        return anyMatches(
          [
            d.title,
            d.fileName,
            d.description,
            subjectName,
            author,
            d.metadata?.author,
            ...(d.metadata?.tags ?? []),
          ],
          debouncedQuery,
        )
      })
    }

    return list
  }, [allDocs, subjectFilter, fileTypeFilter, debouncedQuery])

  // ── Selected subject name ──────────────────────────────────────────────────
  const selectedSubjectName = React.useMemo(() => {
    if (subjectFilter === 'ALL') return 'All Subjects'
    const found = subjects.find((s) => getSafeId(s) === subjectFilter)
    return found?.name || 'All Subjects'
  }, [subjects, subjectFilter])

  const activeFilterCount =
    Number(subjectFilter !== 'ALL') + Number(fileTypeFilter !== 'ALL')

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.background }]}>
      {/* ── Search Header ────────────────────────────────────────────────── */}
      <View style={[s.header, { backgroundColor: C.background, borderBottomColor: C.cardBorder }]}>
        <Pressable
          style={[s.backBtn, { backgroundColor: C.card, borderColor: C.cardBorder }]}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <ArrowLeft size={18} color={C.textSecondary} />
        </Pressable>

        <View style={[s.searchBox, { backgroundColor: C.card, borderColor: C.cardBorder }]}>
          <Search size={16} color={C.muted} />
          <TextInput
            ref={inputRef}
            style={[s.searchInput, { color: C.text }]}
            placeholder="Search documents..."
            placeholderTextColor={C.muted}
            value={query}
            onChangeText={handleQueryChange}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
          {query.length > 0 && (
            <Pressable onPress={() => { setQuery(''); setDebouncedQuery('') }} hitSlop={8}>
              <X size={16} color={C.muted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Filter Bar ───────────────────────────────────────────────────── */}
      <View style={[s.filterBar, { backgroundColor: C.background, borderBottomColor: C.cardBorder }]}>
        {/* Subject filter button */}
        <Pressable
          style={[
            s.filterBtn,
            {
              backgroundColor: subjectFilter !== 'ALL' ? C.primaryDim : C.card,
              borderColor: subjectFilter !== 'ALL' ? C.primary : C.cardBorder,
            },
          ]}
          onPress={() => setShowSubjectSheet(true)}
        >
          <BookOpen size={13} color={subjectFilter !== 'ALL' ? C.primary : C.muted} />
          <Text
            style={[s.filterBtnText, { color: subjectFilter !== 'ALL' ? C.primary : C.textSecondary }]}
            numberOfLines={1}
          >
            {selectedSubjectName}
          </Text>
          {subjectFilter !== 'ALL' && (
            <Pressable
              hitSlop={8}
              onPress={() => setSubjectFilter('ALL')}
            >
              <X size={12} color={C.primary} />
            </Pressable>
          )}
        </Pressable>

        {/* File type chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipRow}
        >
          {FILE_TYPE_OPTIONS.map((type) => {
            const active = fileTypeFilter === type
            const color = type === 'ALL' ? C.primary : getFileTypeColor(type, C)
            return (
              <Pressable
                key={type}
                style={[
                  s.chip,
                  {
                    backgroundColor: active ? (type === 'ALL' ? C.primaryDim : `${color}18`) : C.card,
                    borderColor: active ? color : C.cardBorder,
                  },
                ]}
                onPress={() => setFileTypeFilter(type)}
              >
                <Text style={[s.chipText, { color: active ? color : C.muted }]}>
                  {type}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>
      </View>

      {/* ── Results count ────────────────────────────────────────────────── */}
      {!loadingData && (
        <View style={s.resultsMeta}>
          <Text style={[s.resultsCount, { color: C.muted }]}>
            {debouncedQuery || subjectFilter !== 'ALL' || fileTypeFilter !== 'ALL'
              ? `${results.length} result${results.length !== 1 ? 's' : ''}`
              : `${allDocs.length} document${allDocs.length !== 1 ? 's' : ''} available`}
          </Text>
          {activeFilterCount > 0 && (
            <Pressable
              onPress={() => { setSubjectFilter('ALL'); setFileTypeFilter('ALL') }}
              style={s.clearFilters}
            >
              <Filter size={11} color={C.primary} />
              <Text style={[s.clearFiltersText, { color: C.primary }]}>Clear filters</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* ── Content ──────────────────────────────────────────────────────── */}
      {loadingData ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={[s.loadingText, { color: C.muted }]}>Loading documents...</Text>
        </View>
      ) : (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={[
            s.scrollContent,
            results.length === 0 && s.scrollEmpty,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {results.length === 0 ? (
            <EmptyState query={debouncedQuery} C={C} />
          ) : (
            results.map((doc) => (
              <DocumentCard
                key={doc.id || (doc as any)._id}
                doc={doc}
                query={debouncedQuery}
                C={C}
                onPress={() =>
                  router.push(`/(app)/document/${doc.id || (doc as any)._id}` as any)
                }
              />
            ))
          )}
        </ScrollView>
      )}

      {/* ── Subject Picker Sheet ─────────────────────────────────────────── */}
      <Modal
        visible={showSubjectSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSubjectSheet(false)}
      >
        <Pressable
          style={[s.sheetOverlay, { backgroundColor: C.overlayDark }]}
          onPress={() => setShowSubjectSheet(false)}
        >
          <Pressable style={[s.sheet, { backgroundColor: C.card }]} onPress={() => {}}>
            <View style={[s.sheetHandle, { backgroundColor: C.cardBorder }]} />
            <View style={s.sheetHeader}>
              <Text style={[s.sheetTitle, { color: C.text }]}>Filter by Subject</Text>
              <Pressable onPress={() => setShowSubjectSheet(false)} hitSlop={8}>
                <X size={20} color={C.muted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* All subjects option */}
              {[
                { id: 'ALL', name: 'All Subjects', code: undefined, color: undefined } as any,
                ...subjects,
              ].map((sub) => {
                const subId = sub.id === 'ALL' ? 'ALL' : getSafeId(sub)
                const active = subjectFilter === subId
                const dotColor = sub.color || C.primary
                return (
                  <Pressable
                    key={subId}
                    style={[
                      s.subjectOption,
                      {
                        backgroundColor: active ? C.primaryDim : C.cardElevated,
                        borderColor: active ? C.primary : C.cardBorder,
                      },
                    ]}
                    onPress={() => {
                      setSubjectFilter(subId)
                      setShowSubjectSheet(false)
                    }}
                  >
                    <View
                      style={[
                        s.subjectDot,
                        { backgroundColor: sub.id === 'ALL' ? C.muted : dotColor },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.subjectName, { color: C.text }]} numberOfLines={1}>
                        {sub.name}
                      </Text>
                      {sub.code ? (
                        <Text style={[s.subjectCode, { color: C.muted }]}>{sub.code}</Text>
                      ) : null}
                    </View>
                    {active && (
                      <View style={[s.checkDot, { backgroundColor: C.primary }]} />
                    )}
                  </Pressable>
                )
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}

// ─── Document Result Card ──────────────────────────────────────────────────────

interface DocCardProps {
  doc: DocumentItem
  query: string
  C: ReturnType<typeof useColors>
  onPress: () => void
}

function DocumentCard({ doc, query, C, onPress }: DocCardProps) {
  const typeLabel = getFileTypeLabel(doc.fileType, doc.fileName)
  const typeColor = getFileTypeColor(typeLabel, C)
  const subjectName = getSubjectName(doc.personalSubject ?? doc.subject)
  const hasSnippet = Boolean(doc.description)
  const snippet = hasSnippet
    ? extractSnippet(doc.description || '', query, 130)
    : ''

  const author =
    typeof doc.uploadedBy === 'object' && doc.uploadedBy !== null
      ? ((doc.uploadedBy as any).fullName || (doc.uploadedBy as any).name || '')
      : typeof doc.uploadedBy === 'string' ? doc.uploadedBy : doc.metadata?.author || ''

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        cs.card,
        { backgroundColor: C.card, borderColor: C.cardBorder },
        pressed && { opacity: 0.8 },
      ]}
    >
      {/* Icon + type badge */}
      <View style={[cs.iconWrap, { backgroundColor: `${typeColor}15` }]}>
        <FileText size={22} color={typeColor} />
        <View style={[cs.typeBadge, { backgroundColor: `${typeColor}25` }]}>
          <Text style={[cs.typeText, { color: typeColor }]}>{typeLabel}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={cs.content}>
        {/* Title */}
        <Text style={[cs.title, { color: C.text }]} numberOfLines={2}>
          {doc.title}
        </Text>

        {/* Meta row */}
        <View style={cs.metaRow}>
          {subjectName !== 'Uncategorized' && (
            <View style={[cs.subjectChip, { backgroundColor: C.primaryDim }]}>
              <BookOpen size={10} color={C.primary} />
              <Text style={[cs.subjectChipText, { color: C.primary }]} numberOfLines={1}>
                {subjectName}
              </Text>
            </View>
          )}
          {author ? (
            <Text style={[cs.metaText, { color: C.muted }]} numberOfLines={1}>
              {author}
            </Text>
          ) : null}
          <Text style={[cs.metaText, { color: C.mutedLight }]}>
            {formatBytes(doc.fileSize)}
          </Text>
        </View>

        {/* Snippet */}
        {snippet ? (
          <Text style={[cs.snippet, { color: C.muted }]} numberOfLines={2}>
            {snippet}
          </Text>
        ) : null}
      </View>
    </Pressable>
  )
}

// ─── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({
  query,
  C,
}: {
  query: string
  C: ReturnType<typeof useColors>
}) {
  return (
    <View style={es.wrap}>
      <View style={[es.iconCircle, { backgroundColor: C.primaryDim }]}>
        <Search size={32} color={C.primary} />
      </View>
      {query ? (
        <>
          <Text style={[es.title, { color: C.text }]}>No results for "{query}"</Text>
          <Text style={[es.desc, { color: C.muted }]}>
            Try different keywords, check spelling, or remove accent marks.
          </Text>
        </>
      ) : (
        <>
          <Text style={[es.title, { color: C.text }]}>Start searching</Text>
          <Text style={[es.desc, { color: C.muted }]}>
            Type a document name, subject or author to find what you need.
          </Text>
        </>
      )}
    </View>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 42,
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.base,
    paddingVertical: 0,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: Radius.xl,
    borderWidth: 1,
    maxWidth: 140,
  },
  filterBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    flex: 1,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
    paddingRight: Spacing.md,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  resultsMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  resultsCount: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  clearFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clearFiltersText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.sm,
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: Spacing.md,
    gap: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  scrollEmpty: {
    flexGrow: 1,
  },
  // Sheet
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: Spacing.lg,
    paddingBottom: 40,
    maxHeight: '75%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sheetTitle: { fontSize: FontSize.lg, fontWeight: '800' },
  subjectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    marginBottom: Spacing.sm,
  },
  subjectDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  subjectName: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  subjectCode: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  checkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
})

const cs = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  iconWrap: {
    width: 48,
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  typeBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: FontSize.sm + 1,
    fontWeight: '700',
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  subjectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  subjectChipText: {
    fontSize: 10,
    fontWeight: '700',
    maxWidth: 100,
  },
  metaText: {
    fontSize: FontSize.xs,
  },
  snippet: {
    fontSize: FontSize.xs,
    lineHeight: 16,
    marginTop: 2,
  },
})

const es = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
    paddingVertical: 80,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '800',
    textAlign: 'center',
  },
  desc: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
})
