import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { LightColors, DarkColors, type ColorPalette } from '../constants/colors'

const THEME_KEY = 'ash_theme_mode'

interface ThemeContextValue {
  isDark: boolean
  toggle: () => void
  colors: ColorPalette
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  toggle: () => {},
  colors: LightColors,
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false)

  // Load persisted preference on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((val) => {
      if (val === 'dark') setIsDark(true)
    })
  }, [])

  const toggle = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev
      AsyncStorage.setItem(THEME_KEY, next ? 'dark' : 'light')
      return next
    })
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ isDark, toggle, colors: isDark ? DarkColors : LightColors }),
    [isDark, toggle],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}

export function useColors(): ColorPalette {
  return useContext(ThemeContext).colors
}
