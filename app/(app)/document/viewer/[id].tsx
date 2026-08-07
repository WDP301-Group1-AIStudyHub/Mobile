import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { SafeAreaView } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
import { useLocalSearchParams, router } from 'expo-router'
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Maximize2,
  Minimize2,
  RefreshCw,
  Sparkles,
  Users,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react-native'
import { FontSize, Radius, Spacing } from '../../../../constants/colors'
import { useColors } from '../../../../contexts/ThemeContext'
import {
  getDocument,
  getDocumentDownloadUrl,
} from '../../../../services/documentApi'
import {
  createDocumentSummary,
  getArtifactById,
  getExistingDocumentSummary,
  type ArtifactRecord,
} from '../../../../services/artifactApi'
import { getApiErrorDetails } from '../../../../services/apiClient'
import SummaryMarkdown from '../../../../components/artifacts/SummaryMarkdown'
import SummaryShareSheet from '../../../../components/artifacts/summary-share-sheet'
import { useAiUsage, refreshAiUsage } from '../../../../hooks/useAiUsage'
import { deriveAiPlanState } from '../../../../utils/aiPlanState'
import type { DocumentItem } from '../../../../types/document'

const SUMMARY_POLL_INTERVAL_MS = 2000
const SUMMARY_POLL_TIMEOUT_MS = 90000

// ─── Constants ─────────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window')

/** File size limit for inline viewing: 50 MB */
const MAX_INLINE_SIZE = 50 * 1024 * 1024

// Correct Google Docs Viewer URL
const GOOGLE_DOCS_VIEWER = 'https://docs.google.com/viewer'

// ─── Viewer type detection ─────────────────────────────────────────────────────

type ViewerMode = 'pdf' | 'office' | 'image' | 'text' | 'unsupported'

function detectViewerMode(fileType?: string, fileName?: string): ViewerMode {
  const mime = (fileType || '').toLowerCase()
  const ext = (fileName?.split('.').pop() || '').toLowerCase()

  if (mime.includes('pdf') || ext === 'pdf') return 'pdf'
  if (
    mime.includes('word') ||
    mime.includes('officedocument') ||
    ['docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls'].includes(ext)
  ) return 'office'
  if (
    mime.startsWith('image/') ||
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)
  ) return 'image'
  if (
    mime.includes('text/') ||
    ['txt', 'md', 'markdown', 'csv', 'json', 'xml', 'html'].includes(ext)
  ) return 'text'
  return 'unsupported'
}

function getViewerLabel(mode: ViewerMode, fileType?: string, fileName?: string): string {
  const ext = (fileName?.split('.').pop() || '').toUpperCase()
  if (mode === 'pdf') return 'PDF'
  if (mode === 'office') return ext || 'OFFICE'
  if (mode === 'image') return ext || 'IMAGE'
  if (mode === 'text') return ext || 'TEXT'
  return ext || 'FILE'
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Main Viewer Page ──────────────────────────────────────────────────────────

export default function DocumentViewerPage() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const C = useColors()

  const [doc, setDoc] = useState<DocumentItem | null>(null)
  const [viewUrl, setViewUrl] = useState<string | null>(null)
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [loadingViewer, setLoadingViewer] = useState(true)
  const [viewerError, setViewerError] = useState<string | null>(null)
  const [textContent, setTextContent] = useState<string | null>(null)
  const [textZoom, setTextZoom] = useState(1)
  const [headerCollapsed, setHeaderCollapsed] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  const [showSummaryPanel, setShowSummaryPanel] = useState(false)
  const [summaryRecord, setSummaryRecord] = useState<ArtifactRecord | null>(null)
  const [summaryPhase, setSummaryPhase] = useState<
    'idle' | 'starting' | 'polling' | 'done' | 'error'
  >('idle')
  const [summaryError, setSummaryError] = useState<{
    code?: string
    message: string
    details?: Record<string, unknown>
  } | null>(null)
  const [showSummaryShare, setShowSummaryShare] = useState(false)
  const [copied, setCopied] = useState(false)
  const { usage: aiUsage } = useAiUsage()
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const webviewRef = useRef<WebView>(null)

  // ── Load document metadata + resolve viewer URL ────────────────────────────
  useEffect(() => {
    let cancelled = false

    const prepare = async () => {
      try {
        setLoadingMeta(true)
        setViewerError(null)
        setLoadingViewer(true)
        setViewUrl(null)
        setTextContent(null)

        const data = await getDocument(id)
        if (cancelled) return
        setDoc(data)

        const mode = detectViewerMode(data.fileType, data.fileName)

        // For oversized files (non-image), warn & fallback to browser
        if (mode !== 'image' && data.fileSize > MAX_INLINE_SIZE) {
          setViewerError(
            `This file is ${formatBytes(data.fileSize)}, which exceeds the 50 MB inline preview limit.`,
          )
          setLoadingViewer(false)
          return
        }

        // Obtain a signed download URL (works for private docs)
        let url = data.fileUrl
        try {
          const res = await getDocumentDownloadUrl(id)
          url = res.downloadUrl
        } catch {
          // Fallback to fileUrl
        }

        if (cancelled) return

        if (mode === 'pdf' || mode === 'office') {
          // Google Docs Viewer handles both PDF and Office on Android/iOS.
          // Use the signed download URL (time-limited but always accessible,
          // including private documents) so Google can fetch it.
          const encoded = encodeURIComponent(url)
          setViewUrl(`${GOOGLE_DOCS_VIEWER}?url=${encoded}&embedded=true`)
        } else if (mode === 'image') {
          setViewUrl(url)
        } else if (mode === 'text') {
          // Try to fetch text content (works if URL is accessible)
          try {
            const res = await fetch(url, { method: 'GET' })
            if (res.ok) {
              const text = await res.text()
              if (cancelled) return
              setTextContent(text.slice(0, 200_000)) // cap at 200k chars
              setLoadingViewer(false)
              return
            }
          } catch {
            // fall through to browser fallback
          }
          setViewerError('Text preview unavailable. Open in browser to view.')
          setLoadingViewer(false)
          return
        } else {
          setViewerError('This file format cannot be previewed inline.')
          setLoadingViewer(false)
          return
        }
      } catch (err) {
        if (!cancelled) {
          setViewerError(
            err instanceof Error ? err.message : 'Failed to load document.',
          )
          setLoadingViewer(false)
        }
      } finally {
        if (!cancelled) setLoadingMeta(false)
      }
    }

    prepare()
    return () => { cancelled = true }
  }, [id, retryKey])

  // ── Open in browser ────────────────────────────────────────────────────────
  const openInBrowser = useCallback(async () => {
    try {
      const { downloadUrl } = await getDocumentDownloadUrl(id)
      await Linking.openURL(downloadUrl)
    } catch {
      Alert.alert('Error', 'Could not open document in browser.')
    }
  }, [id])

  // ── Download ───────────────────────────────────────────────────────────────
  const download = useCallback(async () => {
    try {
      const { downloadUrl } = await getDocumentDownloadUrl(id)
      await Linking.openURL(downloadUrl)
    } catch {
      Alert.alert('Error', 'Could not download document.')
    }
  }, [id])

  // ── Summarize with AI ──────────────────────────────────────────────────────
  const pollSummary = async (artifactId: string) => {
    const startedAt = Date.now()

    for (;;) {
      if (!isMountedRef.current) return

      try {
        const updated = await getArtifactById(artifactId)
        if (!isMountedRef.current) return
        setSummaryRecord(updated)

        if (updated.status === 'COMPLETED') {
          setSummaryPhase('done')
          return
        }
        if (updated.status === 'FAILED') {
          setSummaryPhase('error')
          setSummaryError({ message: 'Summary generation failed. You can retry.' })
          return
        }
      } catch {
        // A transient poll failure isn't fatal — keep trying until the timeout.
      }

      if (Date.now() - startedAt >= SUMMARY_POLL_TIMEOUT_MS) {
        // Still processing is not a failure — leave the phase as polling so
        // the UI keeps showing "generating" rather than an error.
        return
      }

      await new Promise((resolve) => setTimeout(resolve, SUMMARY_POLL_INTERVAL_MS))
    }
  }

  const handleSummarize = async () => {
    if (!doc) return
    setSummaryPhase('starting')
    setSummaryError(null)

    try {
      const { record, status } = await createDocumentSummary(doc.id)
      if (!isMountedRef.current) return
      setSummaryRecord(record)

      if (status === 202) {
        void refreshAiUsage()
      }

      if (record.status === 'COMPLETED') {
        setSummaryPhase('done')
        return
      }
      if (record.status === 'FAILED') {
        setSummaryPhase('error')
        setSummaryError({ message: 'Summary generation failed. You can retry.' })
        return
      }

      setSummaryPhase('polling')
      await pollSummary(record._id)
    } catch (error) {
      if (!isMountedRef.current) return
      const details = getApiErrorDetails(error)
      setSummaryPhase('error')

      if (details.status === 429) {
        setSummaryError({ code: details.code, message: details.message, details: details.details })
      } else if (details.status === 400 && details.code === 'DOCUMENT_NOT_READABLE') {
        Alert.alert(
          'Document not ready',
          'This document is not ready to be summarized yet (still processing, or a scanned/image file with no extracted text).',
        )
        setSummaryPhase('idle')
      } else {
        Alert.alert('Summary failed', details.message || 'Could not generate summary.')
        setSummaryPhase('idle')
      }
    }
  }

  // Restore an already-generated summary on mount so it survives leaving and
  // reopening the viewer — without ever calling the quota-charging create
  // endpoint. A document that was never summarized just gets null back and
  // stays untouched (idle, panel closed).
  useEffect(() => {
    if (!doc?.id || !doc?.isOwner) return

    let cancelled = false

    getExistingDocumentSummary(doc.id)
      .then((record) => {
        if (cancelled || !record || !isMountedRef.current) return

        setSummaryRecord(record)
        setShowSummaryPanel(true)

        if (record.status === 'COMPLETED') {
          setSummaryPhase('done')
        } else if (record.status === 'FAILED') {
          setSummaryPhase('error')
          setSummaryError({ message: record.error || 'Summary generation failed.' })
        } else {
          setSummaryPhase('polling')
          void pollSummary(record._id)
        }
      })
      .catch(() => {
        // No existing summary to restore — leave the panel closed and idle.
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id, doc?.isOwner])

  const copySummary = async () => {
    const content = summaryRecord?.content
    if (content && 'markdown' in content) {
      await Clipboard.setStringAsync(content.markdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const mode = doc ? detectViewerMode(doc.fileType, doc.fileName) : null
  const typeLabel = doc ? getViewerLabel(mode!, doc.fileType, doc.fileName) : '...'

  // ── WebView injection: ensure PDF renders at 100% width ───────────────────
  const pdfInjected = `
    (function(){
      var meta = document.querySelector('meta[name=viewport]');
      if(!meta){ meta=document.createElement('meta'); meta.name='viewport'; document.head.appendChild(meta); }
      meta.content='width=device-width,initial-scale=1,maximum-scale=4,user-scalable=yes';
      document.documentElement.style.margin='0';
      document.body.style.margin='0';
    })();
    true;
  `

  if (loadingMeta) {
    return (
      <SafeAreaView style={[st.safe, { backgroundColor: C.background }]}>
        <View style={st.loadingWrap}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={[st.loadingText, { color: C.muted }]}>Preparing document...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[st.safe, { backgroundColor: '#000' }]}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      {!headerCollapsed && (
        <View style={[st.header, { backgroundColor: C.background, borderBottomColor: C.cardBorder }]}>
          <Pressable
            style={[st.headerBtn, { backgroundColor: C.card, borderColor: C.cardBorder }]}
            onPress={() => router.back()}
            hitSlop={8}
          >
            <ArrowLeft size={18} color={C.textSecondary} />
          </Pressable>

          <View style={st.headerMid}>
            <Text style={[st.headerTitle, { color: C.text }]} numberOfLines={1}>
              {doc?.title ?? 'Document'}
            </Text>
            <View style={st.headerMeta}>
              <View style={[st.typePill, { backgroundColor: `${C.primary}18` }]}>
                <Text style={[st.typePillText, { color: C.primary }]}>{typeLabel}</Text>
              </View>
              {doc?.fileSize ? (
                <Text style={[st.sizeText, { color: C.muted }]}>
                  {formatBytes(doc.fileSize)}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={st.headerActions}>
            {/* Zoom controls for text mode */}
            {mode === 'text' && textContent && (
              <>
                <Pressable
                  style={[st.headerBtn, { backgroundColor: C.card, borderColor: C.cardBorder }]}
                  onPress={() => setTextZoom((z) => Math.max(0.7, z - 0.1))}
                  hitSlop={8}
                  disabled={textZoom <= 0.7}
                >
                  <ZoomOut size={16} color={textZoom <= 0.7 ? C.muted : C.text} />
                </Pressable>
                <Pressable
                  style={[st.headerBtn, { backgroundColor: C.card, borderColor: C.cardBorder }]}
                  onPress={() => setTextZoom((z) => Math.min(2, z + 0.1))}
                  hitSlop={8}
                  disabled={textZoom >= 2}
                >
                  <ZoomIn size={16} color={textZoom >= 2 ? C.muted : C.text} />
                </Pressable>
              </>
            )}

            {/* Retry */}
            {viewerError && (
              <Pressable
                style={[st.headerBtn, { backgroundColor: C.primaryDim, borderColor: C.primary }]}
                onPress={() => setRetryKey((k) => k + 1)}
                hitSlop={8}
              >
                <RefreshCw size={16} color={C.primary} />
              </Pressable>
            )}

            {/* Summarize with AI (owner-only) */}
            {doc?.isOwner && (
              <Pressable
                style={[st.headerBtn, { backgroundColor: C.primaryDim, borderColor: C.primary }]}
                onPress={() => setShowSummaryPanel(true)}
                hitSlop={8}
              >
                <Sparkles size={16} color={C.primary} />
              </Pressable>
            )}

            {/* Download */}
            <Pressable
              style={[st.headerBtn, { backgroundColor: C.card, borderColor: C.cardBorder }]}
              onPress={download}
              hitSlop={8}
            >
              <Download size={16} color={C.text} />
            </Pressable>

            {/* Open in browser */}
            <Pressable
              style={[st.headerBtn, { backgroundColor: C.card, borderColor: C.cardBorder }]}
              onPress={openInBrowser}
              hitSlop={8}
            >
              <ExternalLink size={16} color={C.text} />
            </Pressable>

            {/* Collapse header */}
            <Pressable
              style={[st.headerBtn, { backgroundColor: C.card, borderColor: C.cardBorder }]}
              onPress={() => setHeaderCollapsed(true)}
              hitSlop={8}
            >
              <Maximize2 size={16} color={C.text} />
            </Pressable>
          </View>
        </View>
      )}

      {/* Collapsed header – show button to restore */}
      {headerCollapsed && (
        <Pressable
          style={[st.floatingRestore, { backgroundColor: C.primary }]}
          onPress={() => setHeaderCollapsed(false)}
        >
          <Minimize2 size={16} color="#fff" />
        </Pressable>
      )}

      {/* ── Viewer Area ─────────────────────────────────────────────────── */}
      <View style={st.viewerArea}>
        {/* Error state */}
        {viewerError ? (
          <ErrorView
            message={viewerError}
            C={C}
            onOpenBrowser={openInBrowser}
            onRetry={() => setRetryKey((k) => k + 1)}
          />
        ) : mode === 'image' && viewUrl ? (
          /* ── Image viewer ───────────────────────────────────────────── */
          <ScrollView
            style={{ flex: 1, backgroundColor: '#0a0a0a' }}
            contentContainerStyle={st.imageContainer}
            maximumZoomScale={4}
            minimumZoomScale={0.5}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            centerContent
            bouncesZoom
          >
            <Image
              source={{ uri: viewUrl }}
              style={st.image}
              resizeMode="contain"
              onLoadEnd={() => setLoadingViewer(false)}
              onError={() => {
                setLoadingViewer(false)
                setViewerError('Failed to load image. The file may be corrupted or inaccessible.')
              }}
            />
            {loadingViewer && (
              <View style={st.imageLoadingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
              </View>
            )}
          </ScrollView>
        ) : mode === 'text' && textContent !== null ? (
          /* ── Plain text viewer ──────────────────────────────────────── */
          <ScrollView
            style={[st.textScroll, { backgroundColor: C.background }]}
            contentContainerStyle={st.textContent}
            showsVerticalScrollIndicator
          >
            <Text
              style={[
                st.textBody,
                { color: C.text, fontSize: FontSize.sm * textZoom },
              ]}
              selectable
            >
              {textContent}
            </Text>
          </ScrollView>
        ) : viewUrl ? (
          /* ── WebView viewer (PDF / Office via Google Docs) ──────────── */
          <>
            <WebView
              ref={webviewRef}
              key={`webview-${retryKey}`}
              source={{ uri: viewUrl }}
              style={st.webview}
              javaScriptEnabled
              domStorageEnabled
              scalesPageToFit={Platform.OS === 'android'}
              allowsInlineMediaPlayback
              startInLoadingState={false}
              onLoadStart={() => setLoadingViewer(true)}
              onLoadEnd={() => setLoadingViewer(false)}
              onError={(e) => {
                setLoadingViewer(false)
                const desc = e.nativeEvent.description || 'Could not load document.'
                // Only show error for real failures, not google redirects
                if (!viewUrl?.includes('google.com')) {
                  setViewerError(desc)
                }
              }}
              onHttpError={(e) => {
                // Ignore HTTP errors from Google Docs Viewer itself (e.g. 204
                // redirect or internal errors) — the viewer handles them gracefully.
                // Only surface real errors for non-Google URLs.
                if (
                  e.nativeEvent.statusCode >= 400 &&
                  !e.nativeEvent.url?.includes('google.com')
                ) {
                  setLoadingViewer(false)
                  setViewerError(
                    `HTTP ${e.nativeEvent.statusCode}: Document could not be loaded. Try opening in browser.`,
                  )
                }
              }}
              // Allow navigating within the doc viewer without leaving app
              onShouldStartLoadWithRequest={(req) => {
                try {
                  const allowedHosts = [
                    'docs.google.com',
                    'googleapis.com',
                    'cloudinary.com',
                    'res.cloudinary.com',
                    'accounts.google.com',
                  ]
                  const reqUrl = new URL(req.url)
                  const isAllowed =
                    allowedHosts.some((h) => reqUrl.hostname.includes(h)) ||
                    req.url === viewUrl ||
                    req.url.startsWith('https://docs.google.com')
                  if (!isAllowed) {
                    Linking.openURL(req.url).catch(() => {})
                    return false
                  }
                } catch {
                  // If URL parsing fails, allow the request (safe default)
                }
                return true
              }}
            />
            {loadingViewer && (
              <View style={st.webviewLoading}>
                <ActivityIndicator size="large" color={C.primary} />
                <Text style={[st.loadingText, { color: C.muted }]}>
                  {mode === 'pdf' || mode === 'office'
                    ? 'Opening with Google Docs Viewer...'
                    : 'Loading document...'}
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={st.loadingWrap}>
            <ActivityIndicator size="large" color={C.primary} />
          </View>
        )}
      </View>

      <Modal
        animationType="slide"
        transparent
        visible={showSummaryPanel}
        onRequestClose={() => setShowSummaryPanel(false)}
      >
        <View style={st.summaryOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowSummaryPanel(false)}
          />
          <View style={[st.summarySheet, { backgroundColor: C.background, borderColor: C.cardBorder }]}>
          <View style={st.summaryHandle}>
            <View style={[st.summaryHandleBar, { backgroundColor: C.cardBorder }]} />
          </View>
          <View style={st.summaryHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 }}>
              <Sparkles size={18} color={C.primary} />
              <Text style={[st.summaryTitle, { color: C.text }]}>AI Summary</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              {summaryPhase === 'done' && summaryRecord && (
                <>
                  <Pressable style={st.summaryIconBtn} onPress={copySummary} hitSlop={8}>
                    {copied ? <Check size={17} color={C.success} /> : <Copy size={17} color={C.text} />}
                  </Pressable>
                  <Pressable style={st.summaryIconBtn} onPress={() => setShowSummaryShare(true)} hitSlop={8}>
                    <Users size={17} color={C.text} />
                  </Pressable>
                </>
              )}
              <Pressable style={st.summaryIconBtn} onPress={() => setShowSummaryPanel(false)} hitSlop={8}>
                <X size={17} color={C.text} />
              </Pressable>
            </View>
          </View>

          <ScrollView contentContainerStyle={st.summaryBody}>
            {summaryPhase === 'idle' || summaryPhase === 'error' ? (
              <Pressable
                style={[st.summaryButton, { backgroundColor: C.primaryDim, borderColor: C.primary }]}
                onPress={handleSummarize}
              >
                <Sparkles size={16} color={C.primary} />
                <Text style={[st.summaryButtonText, { color: C.primary }]}>
                  {summaryPhase === 'error' ? 'Retry summary' : 'Summarize with AI'}
                </Text>
              </Pressable>
            ) : null}

            {aiUsage && (summaryPhase === 'idle' || summaryPhase === 'error') && (
              <Text style={{ color: C.muted, fontSize: FontSize.xs, textAlign: 'center', marginTop: Spacing.sm }}>
                {(() => {
                  const plan = deriveAiPlanState(aiUsage)
                  if (plan.kind === 'byok' || plan.kind === 'exempt') return 'Unlimited AI usage'
                  return `AI usage: ${plan.used}/${plan.limit} this period`
                })()}
              </Text>
            )}

            {summaryPhase === 'starting' || summaryPhase === 'polling' ? (
              <View style={{ alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.xl }}>
                <ActivityIndicator color={C.primary} />
                <Text style={{ color: C.muted, fontSize: FontSize.sm }}>
                  Analyzing document content and generating summary...
                </Text>
              </View>
            ) : summaryPhase === 'error' && summaryError?.details ? (
              <Text style={{ color: C.error, fontSize: FontSize.sm, marginTop: Spacing.md }}>
                You've reached your AI usage limit for this period
                {typeof summaryError.details.resetAt === 'string'
                  ? ` (resets ${new Date(summaryError.details.resetAt as string).toLocaleDateString()})`
                  : ''}
                .
              </Text>
            ) : summaryPhase === 'error' && summaryError ? (
              <Text style={{ color: C.error, fontSize: FontSize.sm, marginTop: Spacing.md }}>
                {summaryError.message}
              </Text>
            ) : summaryPhase === 'done' && summaryRecord?.content && 'markdown' in summaryRecord.content ? (
              <SummaryMarkdown markdown={summaryRecord.content.markdown} />
            ) : null}
          </ScrollView>
          </View>
        </View>
      </Modal>

      <SummaryShareSheet
        artifactId={summaryRecord?._id ?? null}
        onClose={() => setShowSummaryShare(false)}
        title={doc?.title}
        visible={showSummaryShare}
      />
    </SafeAreaView>
  )
}

// ─── Error View ────────────────────────────────────────────────────────────────

function ErrorView({
  message,
  C,
  onOpenBrowser,
  onRetry,
}: {
  message: string
  C: ReturnType<typeof useColors>
  onOpenBrowser: () => void
  onRetry: () => void
}) {
  return (
    <View style={[ev.wrap, { backgroundColor: C.background }]}>
      <View style={[ev.iconCircle, { backgroundColor: C.errorDim }]}>
        <FileText size={36} color={C.error} />
      </View>
      <Text style={[ev.title, { color: C.text }]}>Preview Unavailable</Text>
      <Text style={[ev.message, { color: C.muted }]}>{message}</Text>
      <View style={ev.btnRow}>
        <Pressable
          style={({ pressed }) => [
            ev.btn,
            { backgroundColor: C.card, borderColor: C.cardBorder },
            pressed && { opacity: 0.7 },
          ]}
          onPress={onRetry}
        >
          <RefreshCw size={15} color={C.text} />
          <Text style={[ev.btnText, { color: C.text }]}>Retry</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            ev.btn,
            { backgroundColor: C.primary },
            pressed && { opacity: 0.8 },
          ]}
          onPress={onOpenBrowser}
        >
          <ExternalLink size={15} color="#fff" />
          <Text style={[ev.btnText, { color: '#fff' }]}>Open in Browser</Text>
        </Pressable>
      </View>
    </View>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  safe: { flex: 1 },
  summaryOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(23,32,26,0.35)' },
  summarySheet: {
    height: '55%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  summaryHandle: { alignItems: 'center', paddingTop: Spacing.sm },
  summaryHandleBar: { width: 40, height: 4, borderRadius: 2 },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  summaryTitle: { fontSize: FontSize.base, fontWeight: '700' },
  summaryIconBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  summaryBody: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  summaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  summaryButtonText: { fontSize: FontSize.sm, fontWeight: '700' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerMid: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontSize: FontSize.sm + 1,
    fontWeight: '700',
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  typePillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  sizeText: {
    fontSize: FontSize.xs,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  floatingRestore: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.md,
    zIndex: 100,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerArea: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webviewLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  imageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
  image: {
    width: SCREEN_WIDTH,
    height: undefined,
    aspectRatio: 1,
    maxHeight: 1200,
  },
  imageLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  textScroll: {
    flex: 1,
  },
  textContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  textBody: {
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
})

const ev = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  btnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  btnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
})
