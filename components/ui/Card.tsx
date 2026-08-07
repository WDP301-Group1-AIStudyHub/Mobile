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
    },
    elevated: {
      backgroundColor: C.cardElevated,
      borderColor: C.cardBorder,
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

