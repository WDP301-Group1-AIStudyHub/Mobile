import { Component, ReactNode, useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Text, View, Pressable } from 'react-native'
import { ThemeProvider, useTheme } from '../contexts/ThemeContext'

SplashScreen.preventAutoHideAsync()


interface EBState { hasError: boolean; message: string }
class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { hasError: false, message: '' }

  static getDerivedStateFromError(error: unknown): EBState {
    const message = error instanceof Error ? error.message : String(error)
    return { hasError: true, message }
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaProvider>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#0a0e1a' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#f87171', marginBottom: 8 }}>
              Something went wrong
            </Text>
            <Text style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', marginBottom: 24 }}>
              {this.state.message}
            </Text>
            <Pressable
              onPress={() => this.setState({ hasError: false, message: '' })}
              style={{ backgroundColor: '#6366f1', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>Try Again</Text>
            </Pressable>
          </View>
        </SafeAreaProvider>
      )
    }
    return this.props.children
  }
}

// ── App Stack ─────────────────────────────────────────────────────────────────
function AppStack() {
  const { isDark } = useTheme()
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="admin" options={{ animation: 'slide_from_bottom' }} />
      </Stack>
    </>
  )
}

// ── Root Layout ───────────────────────────────────────────────────────────────
export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync()
  }, [])

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <ThemeProvider>
            <AppStack />
          </ThemeProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ErrorBoundary>
  )
}

