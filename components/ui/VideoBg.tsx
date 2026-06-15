/**
 * VideoBg — background with image and dark overlay.
 * No native player lifecycle to manage.
 */
import React from 'react'
import { Image, StyleSheet, View } from 'react-native'

interface VideoBgProps {
  children?: React.ReactNode
  veil?: 'default' | 'strong'
}

export default function VideoBg({ children, veil = 'default' }: VideoBgProps) {
  const scrimOpacity = veil === 'strong' ? 0.35 : 0.2

  return (
    <View style={styles.root}>
      {/* Background image */}
      <Image
        source={require('../../assets/bg.png')}
        style={styles.bg}
        resizeMode="cover"
      />



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
