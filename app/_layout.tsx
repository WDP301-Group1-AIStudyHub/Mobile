import { Component, ReactNode, useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Text, View, Pressable } from 'react-native'
import { ThemeProvider } from '../contexts/ThemeContext'
import { clearAuthSession } from '../services/authStorage'

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
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#ffffff', gap: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#f87171' }}>
              Something went wrong
            </Text>
            <Text selectable style={{ fontSize: 13, color: '#5f6b63', textAlign: 'center', maxWidth: 320 }}>
              {this.state.message}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Pressable
                onPress={() => this.setState({ hasError: false, message: '' })}
                style={{ backgroundColor: '#2f6b4f', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Try Again</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  await clearAuthSession()
                  this.setState({ hasError: false, message: '' })
                }}
                style={{ backgroundColor: '#f2f5f3', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
              >
                <Text style={{ color: '#17201a', fontWeight: '600' }}>Sign out & reset</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaProvider>
      )
    }
    return this.props.children
  }
}

// ── App Stack ─────────────────────────────────────────────────────────────────
function AppStack() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: '#ffffff' } }}>
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

