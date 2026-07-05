import { useEffect } from 'react'
import { View, ActivityIndicator, Pressable, Text } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '../hooks/useAuth'
import { useColors } from '../contexts/ThemeContext'

export default function Index() {
  const { state, signOut } = useAuth()
  const C = useColors()

  // Safety net: 5s loading timeout so users aren't stuck on splash
  useEffect(() => {
    if (state.status !== 'loading') return
    const t = setTimeout(() => {
      console.warn('[index] auth loading timeout, forcing unauth')
      signOut()
    }, 5000)
    return () => clearTimeout(t)
  }, [state.status, signOut])

  useEffect(() => {
    if (state.status === 'authenticated') {
      if (state.user.role === 'admin') {
        router.replace('/admin')
      } else {
        router.replace('/(app)/dashboard')
      }
    } else if (state.status === 'unauthenticated') {
      router.replace('/(auth)/login')
    }
  }, [state.status])

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', gap: 16 }}>
      <ActivityIndicator size="large" color={C.primary} />
      {state.status === 'loading' && (
        <Pressable onPress={() => signOut()} hitSlop={8}>
          <Text style={{ color: C.muted, fontSize: 12, textDecorationLine: 'underline' }}>
            Skip / Reset
          </Text>
        </Pressable>
      )}
    </View>
  )
}
