import React, { createContext, useContext } from 'react'
import { LightColors, type ColorPalette } from '../constants/colors'

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
  return (
    <ThemeContext.Provider value={{ isDark: false, toggle: () => {}, colors: LightColors }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

export function useColors(): ColorPalette {
  return useContext(ThemeContext).colors
}
