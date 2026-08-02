import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'
import { FontSize, Radius, Spacing } from '../../constants/colors'
import { useColors } from '../../contexts/ThemeContext'

/**
 * Purpose-built rather than the shared Button: the current-plan state and the
 * hover state both need to override the text colour, which Button does not
 * expose. onHoverIn/onHoverOut only fire on react-native-web (mouse/trackpad);
 * they are inert on a touch device, so this never interferes with the press
 * feedback on the card underneath it.
 */
export default function StoragePlanButton({
  disabled,
  isCurrent,
  loading = false,
  onPress,
  title,
}: {
  disabled: boolean
  isCurrent: boolean
  loading?: boolean
  onPress: () => void
  title: string
}) {
  const C = useColors()
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)
  const highlighted = isCurrent || hovered || pressed

  return (
    <Pressable
      disabled={disabled}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={onPress}
      style={() => {
        // Touch devices have no hover, so pressed gets the same green feedback.
        return [
          styles.base,
          {
            borderColor: highlighted ? C.success : C.cardBorder,
            backgroundColor: highlighted ? C.success : C.card,
            opacity: disabled && !isCurrent ? 0.5 : 1,
          },
        ]
      }}
    >
      {loading ? (
        <ActivityIndicator color={highlighted ? '#fff' : C.text} size="small" />
      ) : (
        <Text style={[styles.text, { color: highlighted ? '#fff' : C.text }]}>
          {title}
        </Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  text: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
})
