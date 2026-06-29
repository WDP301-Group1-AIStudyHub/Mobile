import { Stack } from 'expo-router'
import { useColors } from '../../../contexts/ThemeContext'

export default function ChatLayout() {
  const C = useColors()
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" options={{ animation: 'slide_from_right' }} />
    </Stack>
  )
}
