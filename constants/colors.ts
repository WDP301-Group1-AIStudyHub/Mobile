// Clean color palette - no gradients, solid colors only
export const LightColors = {
  // Backgrounds
  background: 'transparent',
  backgroundTop: 'transparent',
  backgroundMid: 'transparent',
  backgroundBottom: 'transparent',
  card: '#ffffff',
  cardBorder: '#e2e6ef',
  cardElevated: '#f0f2f7',
  cardShadowColor: '#1a1a2e',

  // Brand colors
  primary: '#4a6cf7',
  primaryLight: '#6b8aff',
  primaryDim: 'rgba(74, 108, 247, 0.1)',
  secondary: '#3b82f6',
  secondaryDim: 'rgba(59, 130, 246, 0.1)',
  accent: '#8b5cf6',
  accentDim: 'rgba(139, 92, 246, 0.1)',
  accentTeal: '#14b8a6',
  accentTealDim: 'rgba(20, 184, 166, 0.1)',
  accentGold: '#f59e0b',
  accentGoldDim: 'rgba(245, 158, 11, 0.1)',
  accentCoral: '#ef4444',

  // Text
  text: '#1e293b',
  textSecondary: '#475569',
  muted: '#94a3b8',
  mutedLight: '#cbd5e1',

  // Semantic
  success: '#22c55e',
  successDim: 'rgba(34, 197, 94, 0.1)',
  error: '#ef4444',
  errorDim: 'rgba(239, 68, 68, 0.1)',
  warning: '#f59e0b',
  warningDim: 'rgba(245, 158, 11, 0.1)',
  info: '#3b82f6',
  infoDim: 'rgba(59, 130, 246, 0.1)',

  // Overlay
  overlay: 'rgba(255, 255, 255, 0.15)',
  overlayDark: 'rgba(15, 23, 42, 0.08)',
}

// Dark mode palette
export const DarkColors = {
  // Backgrounds
  background: 'transparent',
  backgroundTop: 'transparent',
  backgroundMid: 'transparent',
  backgroundBottom: 'transparent',
  card: '#1e293b',
  cardBorder: '#334155',
  cardElevated: '#253347',
  cardShadowColor: '#000000',

  // Brand colors
  primary: '#60a5fa',
  primaryLight: '#818cf8',
  primaryDim: 'rgba(96, 165, 250, 0.15)',
  secondary: '#38bdf8',
  secondaryDim: 'rgba(56, 189, 248, 0.15)',
  accent: '#a78bfa',
  accentDim: 'rgba(167, 139, 250, 0.15)',
  accentTeal: '#2dd4bf',
  accentTealDim: 'rgba(45, 212, 191, 0.15)',
  accentGold: '#fbbf24',
  accentGoldDim: 'rgba(251, 191, 36, 0.15)',
  accentCoral: '#f87171',

  // Text
  text: '#f1f5f9',
  textSecondary: '#cbd5e1',
  muted: '#94a3b8',
  mutedLight: '#64748b',

  // Semantic
  success: '#4ade80',
  successDim: 'rgba(74, 222, 128, 0.15)',
  error: '#f87171',
  errorDim: 'rgba(248, 113, 113, 0.15)',
  warning: '#fbbf24',
  warningDim: 'rgba(251, 191, 36, 0.15)',
  info: '#38bdf8',
  infoDim: 'rgba(56, 189, 248, 0.15)',

  // Overlay
  overlay: 'rgba(15, 23, 42, 0.5)',
  overlayDark: 'rgba(0, 0, 0, 0.2)',
}

export type ColorPalette = typeof LightColors | typeof DarkColors

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
}

export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
}

export const FontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 30,
  xxxl: 36,
}
