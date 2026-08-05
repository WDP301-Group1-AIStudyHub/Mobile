import { useMemo } from 'react'
import Markdown from 'react-native-markdown-display'
import { useColors } from '../../contexts/ThemeContext'
import { FontSize, Spacing } from '../../constants/colors'

export default function SummaryMarkdown({ markdown }: { markdown: string }) {
  const C = useColors()

  const styles = useMemo(
    () => ({
      body: { color: C.text, fontSize: FontSize.base, lineHeight: 22 },
      heading1: { color: C.text, fontSize: FontSize.lg, fontWeight: '700' as const, marginTop: Spacing.md, marginBottom: Spacing.sm },
      heading2: { color: C.text, fontSize: FontSize.md, fontWeight: '700' as const, marginTop: Spacing.md, marginBottom: Spacing.sm },
      heading3: { color: C.text, fontSize: FontSize.base, fontWeight: '600' as const, marginTop: Spacing.sm, marginBottom: Spacing.xs },
      paragraph: { marginTop: 0, marginBottom: Spacing.sm },
      strong: { fontWeight: '700' as const },
      bullet_list: { marginBottom: Spacing.sm },
      ordered_list: { marginBottom: Spacing.sm },
      list_item: { marginBottom: Spacing.xs },
      bullet_list_icon: { color: C.muted },
      code_inline: {
        backgroundColor: C.secondary,
        color: C.text,
        borderRadius: 4,
        paddingHorizontal: 4,
      },
      code_block: {
        backgroundColor: C.secondary,
        color: C.text,
        borderRadius: 8,
        padding: Spacing.sm,
      },
      fence: {
        backgroundColor: C.secondary,
        color: C.text,
        borderRadius: 8,
        padding: Spacing.sm,
      },
      table: { borderColor: C.cardBorder, borderWidth: 1, marginBottom: Spacing.sm },
      th: { padding: Spacing.xs, backgroundColor: C.secondary, color: C.text, fontWeight: '700' as const },
      td: { padding: Spacing.xs, borderColor: C.cardBorder, borderWidth: 1 },
      hr: { backgroundColor: C.cardBorder, height: 1, marginVertical: Spacing.md },
      blockquote: {
        backgroundColor: C.secondaryDim,
        borderLeftColor: C.primary,
        borderLeftWidth: 3,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
      },
      link: { color: C.primary },
    }),
    [C],
  )

  return <Markdown style={styles}>{markdown}</Markdown>
}
