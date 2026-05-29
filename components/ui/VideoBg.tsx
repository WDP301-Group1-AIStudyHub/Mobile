/**
 * VideoBg — plays the cosmic black-hole video behind screen content.
 * The filter/veil is intentionally thin so the video shows through clearly.
 * A minimal dark scrim (rgba 0,0,0,0.18) ensures text remains readable in
 * both themes without obscuring the video.
 *
 * Falls back to a plain LinearGradient while the video is loading.
 */
import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { VideoView, useVideoPlayer } from 'expo-video'
import { LinearGradient } from 'expo-linear-gradient'
import { useColors } from '../../contexts/ThemeContext'

// Same remote source the web uses (CloudFront-hosted black-hole loop)
const VIDEO_SOURCE =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260217_030345_246c0224-10a4-422c-b324-070b7c0eceda.mp4'

interface VideoBgProps {
  children?: React.ReactNode
  veil?: 'default' | 'strong'   // kept for API compat; strong adds a touch more scrim
}

export default function VideoBg({ children, veil = 'default' }: VideoBgProps) {
  const C = useColors()

  const player = useVideoPlayer(VIDEO_SOURCE, (p) => {
    p.loop = true
    p.muted = true
    p.play()
  })

  // Fallback gradient (visible before video starts streaming)
  const fallbackColors = useMemo(
    () => C.gradientBg as unknown as [string, string, string],
    [C],
  )

  // Very thin scrim — just enough to lift readability without covering the video
  const scrimOpacity = veil === 'strong' ? 0.32 : 0.18

  return (
    <View style={styles.root}>
      {/* Fallback gradient — base layer */}
      <LinearGradient
        colors={fallbackColors}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.4, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Video layer — full screen, no controls */}
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        nativeControls={false}
        contentFit="cover"
      />

      {/* Minimal dark scrim — removes the heavy filter the user asked to drop */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: `rgba(0,0,0,${scrimOpacity})` },
        ]}
      />

      {/* Nebula spot accents */}
      <View
        style={[
          styles.nebula,
          {
            left: '70%',
            top: '5%',
            width: 280,
            height: 280,
            borderRadius: 140,
            backgroundColor: C.nebulaBlue,
          },
        ]}
      />
      <View
        style={[
          styles.nebula,
          {
            left: '-10%',
            top: '12%',
            width: 230,
            height: 230,
            borderRadius: 115,
            backgroundColor: C.nebulaGold,
          },
        ]}
      />
      <View
        style={[
          styles.nebula,
          {
            left: '45%',
            top: '50%',
            width: 310,
            height: 310,
            borderRadius: 155,
            backgroundColor: C.nebulaTeal,
          },
        ]}
      />

      {/* Content */}
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
    opacity: 0.65,
  },
})
