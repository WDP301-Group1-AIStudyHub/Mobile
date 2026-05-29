import React, { useMemo } from 'react'
import { View, StyleSheet, Dimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useColors } from '../../contexts/ThemeContext'

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')

interface StarfieldBgProps {
  children?: React.ReactNode
}

// Deterministic star positions (dark dots on light bg)
const DOTS = Array.from({ length: 48 }, (_, i) => ({
  id: i,
  x: ((i * 173 + 47) % 97) / 100,
  y: ((i * 137 + 23) % 97) / 100,
  size: 1.5 + (i % 3) * 0.8,
  opacity: 0.12 + (i % 4) * 0.06,
}))

// Static nebula positions (no colors — resolved at render time)
const NEBULA_POSITIONS = [
  { left: 0.72, top: 0.04, w: 260, h: 260, key: 'nebulaBlue' as const },
  { left: 0.08, top: 0.10, w: 220, h: 220, key: 'nebulaGold' as const },
  { left: 0.50, top: 0.44, w: 300, h: 300, key: 'nebulaTeal' as const },
  { left: 0.78, top: 0.58, w: 240, h: 240, key: 'nebulaViolet' as const },
  { left: 0.15, top: 0.72, w: 200, h: 200, key: 'nebulaBlue' as const },
]

export default function StarfieldBg({ children }: StarfieldBgProps) {
  const C = useColors()

  const nebulas = useMemo(
    () => NEBULA_POSITIONS.map((n) => ({ ...n, color: C[n.key] as string })),
    [C],
  )

  return (
    <View style={styles.root}>
      {/* Cosmos gradient */}
      <LinearGradient
        colors={C.gradientBg}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.4, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Soft nebula glows */}
      {nebulas.map((n, i) => (
        <View
          key={i}
          style={[
            styles.nebula,
            {
              left: n.left * SCREEN_W - n.w / 2,
              top: n.top * SCREEN_H - n.h / 2,
              width: n.w,
              height: n.h,
              borderRadius: n.w / 2,
              backgroundColor: n.color,
            },
          ]}
        />
      ))}

      {/* Cosmos dots */}
      {DOTS.map((d) => (
        <View
          key={d.id}
          style={[
            styles.dot,
            {
              left: d.x * SCREEN_W,
              top: d.y * SCREEN_H,
              width: d.size,
              height: d.size,
              borderRadius: d.size / 2,
              opacity: d.opacity,
              backgroundColor: C.starColor,
            },
          ]}
        />
      ))}

      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  nebula: {
    position: 'absolute',
  },
  dot: {
    position: 'absolute',
    // backgroundColor set inline via useColors()
  },
})

