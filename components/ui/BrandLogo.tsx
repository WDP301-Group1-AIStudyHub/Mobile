/**
 * BrandLogo — mirrors the web's "black-hole orbital" brand mark.
 *
 * Circular glass container + two tilted elliptical rings (outer: foreground,
 * inner: accentGold) + a glowing centre dot + optional "AI Study Hub" label.
 *
 * Props:
 *   size     — diameter of the icon mark in px  (default 32)
 *   compact  — show icon only, no text          (default false)
 *   textSize — override label font size
 */
import React from 'react'
import { View, Text } from 'react-native'
import { useColors, useTheme } from '../../contexts/ThemeContext'
import { FontSize } from '../../constants/colors'

interface BrandLogoProps {
  compact?: boolean
  size?: number
  textSize?: number
}

export default function BrandLogo({
  compact = false,
  size = 32,
  textSize,
}: BrandLogoProps) {
  const C = useColors()
  const { isDark } = useTheme()

  // Proportional measurements (matching web's 2.05rem base)
  const r = size / 2
  const outerW = size * 0.69   // 1.42rem / 2.05rem ≈ 69 %
  const outerH = size * 0.35   // 0.72rem / 2.05rem ≈ 35 %
  const innerW = size * 0.49   // 1.00rem / 2.05rem ≈ 49 %
  const innerH = size * 0.24   // 0.50rem / 2.05rem ≈ 24 %
  const dotD  = size * 0.165   // 0.34rem / 2.05rem ≈ 16.5 %

  // Colors — adapt to theme exactly like the CSS
  const ringMain  = isDark ? 'rgba(232,234,246,0.82)' : 'rgba(26,35,64,0.82)'
  const ringGold  = isDark ? 'rgba(251,191,36,0.76)'  : 'rgba(201,134,14,0.76)'
  const glassBase = isDark ? 'rgba(22,27,42,0.82)'    : 'rgba(255,255,252,0.82)'
  const glassBorder = isDark ? 'rgba(79,99,210,0.38)' : 'rgba(155,170,220,0.50)'

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {/* ── Icon mark ── */}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: r,
          backgroundColor: glassBase,
          borderWidth: 1,
          borderColor: glassBorder,
          alignItems: 'center',
          justifyContent: 'center',
          // Glow from accentGold (matches web box-shadow)
          shadowColor: C.accentGold,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.45,
          shadowRadius: 10,
          elevation: 3,
        }}
      >
        {/* Outer orbital ring — main foreground border, gold on left */}
        <View
          style={{
            position: 'absolute',
            width: outerW,
            height: outerH,
            borderRadius: 999,
            borderWidth: 1.25,
            borderColor: ringMain,
            borderLeftColor: ringGold,
            transform: [{ rotate: '-24deg' }],
          }}
        />
        {/* Inner orbital ring — smaller, gold tint */}
        <View
          style={{
            position: 'absolute',
            width: innerW,
            height: innerH,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: ringGold,
            transform: [{ rotate: '-24deg' }],
            opacity: 0.72,
          }}
        />
        {/* Centre dot — glowing core */}
        <View
          style={{
            width: dotD,
            height: dotD,
            borderRadius: dotD / 2,
            backgroundColor: C.text,
            shadowColor: C.accentGold,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.72,
            shadowRadius: 6,
            elevation: 2,
          }}
        />
      </View>

      {/* ── Label ── */}
      {!compact && (
        <Text
          style={{
            fontSize: textSize ?? FontSize.base,
            fontWeight: '700',
            color: C.background === 'transparent' ? '#ffffff' : C.text,
            letterSpacing: -0.2,
          }}
        >
          AI Study Hub
        </Text>
      )}
    </View>
  )
}
