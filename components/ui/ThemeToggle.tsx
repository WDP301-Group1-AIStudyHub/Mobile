/**
 * ThemeToggle — Sun / Moon button that flips the global light/dark theme.
 * Drop into any top-bar or settings row.
 */
import React, { useMemo } from 'react'
import { Pressable, StyleSheet } from 'react-native'
import { Moon, Sun } from 'lucide-react-native'
import { useTheme, useColors } from '../../contexts/ThemeContext'
import { Radius } from '../../constants/colors'

interface ThemeToggleProps {
  /** Bounding-box size in px (default 38) */
  size?: number
}

export default function ThemeToggle({ size = 38 }: ThemeToggleProps) {
  const { isDark, toggle } = useTheme()
  const C = useColors()

  const styles = useMemo(
    () =>
      StyleSheet.create({
        btn: {
          width: size,
          height: size,
          borderRadius: Radius.md,
          backgroundColor: C.cardElevated,
          borderWidth: 1,
          borderColor: C.cardBorder,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: C.cardShadowColor,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 6,
          elevation: 2,
        },
      }),
    [C, size],
  )

  return (
    <Pressable
      onPress={toggle}
      style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.65 : 1 }]}
      hitSlop={8}
    >
      {isDark ? (
        <Sun size={17} color={C.accentGold} strokeWidth={1.8} />
      ) : (
        <Moon size={17} color={C.primary} strokeWidth={1.8} />
      )}
    </Pressable>
  )
}
