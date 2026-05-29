import React, { useMemo } from 'react'
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { Radius, Spacing } from '../../constants/colors'
import { useColors } from '../../contexts/ThemeContext'

interface CardProps {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  elevated?: boolean
  padding?: keyof typeof Spacing | number
  row?: boolean
}

export default function Card({
  children,
  style,
  elevated = false,
  padding = 'md',
  row = false,
}: CardProps) {
  const paddingValue = typeof padding === 'number' ? padding : Spacing[padding]
  const C = useColors()
  const styles = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: C.cardBorder,
      shadowColor: C.cardShadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    elevated: {
      backgroundColor: C.cardElevated,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 18,
      elevation: 5,
    },
  }), [C])
  return (
    <View
      style={[
        styles.card,
        elevated && styles.elevated,
        { padding: paddingValue, flexDirection: row ? 'row' : 'column' },
        style,
      ]}
    >
      {children}
    </View>
  )
}

