import React, { useMemo, useState } from 'react'
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native'
import { FontSize, Radius, Spacing } from '../../constants/colors'
import { useColors } from '../../contexts/ThemeContext'

interface InputProps extends TextInputProps {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  onRightIconPress?: () => void
  containerStyle?: StyleProp<ViewStyle>
}

export default function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  style,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false)
  const C = useColors()
  const styles = useMemo(() => StyleSheet.create({
    wrapper: { gap: 6 },
    label: {
      fontSize: FontSize.sm,
      fontWeight: '600',
      color: C.textSecondary,
      marginBottom: 2,
      letterSpacing: 0.1,
    },
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.cardElevated,
      borderWidth: 1.5,
      borderColor: C.cardBorder,
      borderRadius: Radius.lg,
      height: 52,
      overflow: 'hidden',
    },
    focused: {
      borderColor: C.primary,
      backgroundColor: C.cardElevated,
    },
    errorBorder: { borderColor: C.error },
    input: {
      flex: 1,
      height: '100%',
      paddingHorizontal: Spacing.md,
      fontSize: FontSize.base,
      color: C.text,
    },
    inputWithLeft: { paddingLeft: Spacing.sm },
    inputWithRight: { paddingRight: Spacing.sm },
    iconLeft: { paddingLeft: Spacing.md, alignItems: 'center', justifyContent: 'center' },
    iconRight: { paddingRight: Spacing.md, alignItems: 'center', justifyContent: 'center' },
    errorText: { fontSize: FontSize.xs, color: C.error },
    hintText: { fontSize: FontSize.xs, color: C.muted },
  }), [C])

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.container,
          focused && styles.focused,
          !!error && styles.errorBorder,
        ]}
      >
        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}

        <TextInput
          placeholderTextColor={C.muted}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            styles.input,
            leftIcon ? styles.inputWithLeft : null,
            rightIcon ? styles.inputWithRight : null,
            style,
          ]}
          {...props}
        />

        {rightIcon && (
          <Pressable
            style={styles.iconRight}
            onPress={onRightIconPress}
            hitSlop={8}
          >
            {rightIcon}
          </Pressable>
        )}
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  )
}
