/**
 * VideoBg — background with image and dark overlay.
 * No native player lifecycle to manage.
 */
import React from 'react'
import { Image, StyleSheet, View } from 'react-native'
import { useColors } from '../../contexts/ThemeContext'

interface VideoBgProps {
  children?: React.ReactNode
  veil?: 'default' | 'strong'
}

export default function VideoBg({ children, veil = 'default' }: VideoBgProps) {
  const colors = useColors()

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>

      {/* App content */}
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
  },
})
