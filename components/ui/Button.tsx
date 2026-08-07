import React from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { FontSize, Radius, Spacing } from '../../constants/colors'
import { useColors } from '../../contexts/ThemeContext'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leftIcon?: React.ReactNode
  style?: StyleProp<ViewStyle>
  fullWidth?: boolean
}

export default function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  style,
  fullWidth = false,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading
  const C = useColors()

  const sizeStyles = {
    sm: { height: 36, paddingHorizontal: Spacing.md, fontSize: FontSize.sm, radius: Radius.md },
    md: { height: 48, paddingHorizontal: Spacing.lg, fontSize: FontSize.base, radius: Radius.md },
    lg: { height: 56, paddingHorizontal: Spacing.xl, fontSize: FontSize.md, radius: Radius.lg },
  }[size]

  if (variant === 'primary') {
    return (
      <Pressable
        {...props}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.base,
          {
            height: sizeStyles.height,
            paddingHorizontal: sizeStyles.paddingHorizontal,
            borderRadius: sizeStyles.radius,
            backgroundColor: isDisabled ? C.muted : C.primary,
            width: fullWidth ? '100%' : undefined,
            opacity: pressed ? 0.85 : 1,
          },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            {leftIcon}
            <Text style={[styles.text, { fontSize: sizeStyles.fontSize, marginLeft: leftIcon ? 8 : 0 }]}>
              {title}
            </Text>
          </>
        )}
      </Pressable>
    )
  }

  const variantStyle = {
    secondary: { bg: C.secondary, border: C.secondary, text: '#fff' },
    outline: { bg: 'rgba(79,99,210,0.10)', border: C.primaryLight, text: C.primaryLight },
    ghost: { bg: 'transparent', border: 'transparent', text: C.muted },
    danger: { bg: C.errorDim, border: C.error, text: C.error },
  }[variant] ?? { bg: 'transparent', border: 'transparent', text: C.text }

  return (
    <Pressable
      {...props}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          height: sizeStyles.height,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          borderRadius: sizeStyles.radius,
          backgroundColor: variantStyle.bg,
          borderWidth: variantStyle.border !== 'transparent' ? 1 : 0,
          borderColor: variantStyle.border,
          width: fullWidth ? '100%' : undefined,
          opacity: pressed || isDisabled ? 0.65 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variantStyle.text} />
      ) : (
        <>
          {leftIcon}
          <Text
            style={[
              styles.text,
              { fontSize: sizeStyles.fontSize, color: variantStyle.text, marginLeft: leftIcon ? 8 : 0 },
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
    color: '#fff',
  },
})
