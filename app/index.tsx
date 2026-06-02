import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '../hooks/useAuth'
import { useColors } from '../contexts/ThemeContext'

export default function Index() {
  const { state } = useAuth()
  const C = useColors()

  useEffect(() => {
    if (state.status === 'authenticated') {
      router.replace('/(app)/dashboard')
    } else if (state.status === 'unauthenticated') {
      router.replace('/(auth)/login')
    }
  }, [state.status])

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background }}>
      <ActivityIndicator size="large" color={C.primary} />
    </View>
  )
}
