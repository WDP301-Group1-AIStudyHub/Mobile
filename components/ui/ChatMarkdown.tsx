import { useMemo } from 'react'
import Markdown from 'react-native-markdown-display'
import { useColors } from '../../contexts/ThemeContext'
import { FontSize, Spacing } from '../../constants/colors'

/**
 * Renders markdown content inside chat bubbles.
 * Tighter spacing than SummaryMarkdown to fit the conversational layout.
 * Strips the citation markers [1][2] into styled superscript-like badges.
 */
export default function ChatMarkdown({
  children,
  isUser = false,
}: {
  children: string
  isUser?: boolean
}) {
  const C = useColors()
  const textColor = isUser ? '#fff' : C.text
  const mutedColor = isUser ? 'rgba(255,255,255,0.7)' : C.muted
  const codeBg = isUser ? 'rgba(255,255,255,0.15)' : C.secondary
  const tableBorder = isUser ? 'rgba(255,255,255,0.25)' : C.cardBorder

  const styles = useMemo(
    () => ({
      body: {
        color: textColor,
        fontSize: FontSize.sm,
        lineHeight: 20,
      },
      heading1: {
        color: textColor,
        fontSize: FontSize.md,
        fontWeight: '700' as const,
        marginTop: Spacing.sm,
        marginBottom: 4,
      },
      heading2: {
        color: textColor,
        fontSize: FontSize.sm + 1,
        fontWeight: '700' as const,
        marginTop: Spacing.sm,
        marginBottom: 4,
      },
      heading3: {
        color: textColor,
        fontSize: FontSize.sm,
        fontWeight: '600' as const,
        marginTop: 4,
        marginBottom: 2,
      },
      paragraph: {
        marginTop: 0,
        marginBottom: 6,
      },
      strong: { fontWeight: '700' as const },
      em: { fontStyle: 'italic' as const },
      bullet_list: { marginBottom: 4 },
      ordered_list: { marginBottom: 4 },
      list_item: { marginBottom: 2 },
      bullet_list_icon: { color: mutedColor },
      code_inline: {
        backgroundColor: codeBg,
        color: textColor,
        borderRadius: 4,
        paddingHorizontal: 4,
        fontFamily: 'monospace' as const,
        fontSize: FontSize.sm - 1,
      },
      code_block: {
        backgroundColor: codeBg,
        color: textColor,
        borderRadius: 6,
        padding: Spacing.sm,
        fontFamily: 'monospace' as const,
        fontSize: FontSize.sm - 1,
      },
      fence: {
        backgroundColor: codeBg,
        color: textColor,
        borderRadius: 6,
        padding: Spacing.sm,
        fontFamily: 'monospace' as const,
        fontSize: FontSize.sm - 1,
      },
      table: {
        borderColor: tableBorder,
        borderWidth: 1,
        marginBottom: 6,
      },
      th: {
        padding: 4,
        backgroundColor: codeBg,
        color: textColor,
        fontWeight: '700' as const,
      },
      td: {
        padding: 4,
        borderColor: tableBorder,
        borderWidth: 1,
      },
      hr: {
        backgroundColor: tableBorder,
        height: 1,
        marginVertical: Spacing.sm,
      },
      blockquote: {
        backgroundColor: isUser ? 'rgba(255,255,255,0.1)' : C.secondaryDim,
        borderLeftColor: isUser ? 'rgba(255,255,255,0.5)' : C.primary,
        borderLeftWidth: 3,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
      },
      link: { color: isUser ? '#fff' : C.primary, textDecorationLine: 'underline' as const },
    }),
    [textColor, mutedColor, codeBg, tableBorder, isUser, C],
  )

  return <Markdown style={styles}>{children}</Markdown>
}
