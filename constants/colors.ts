// Clean color palette - no gradients, solid colors only
export const LightColors = {
  background: '#ffffff',
  backgroundTop: '#ffffff',
  backgroundMid: '#ffffff',
  backgroundBottom: '#ffffff',
  card: '#ffffff',
  cardBorder: '#e1e6e2',
  cardElevated: '#ffffff',
  cardShadowColor: 'rgba(16, 24, 20, 0.06)',

  primary: '#2f6b4f',
  primaryLight: '#3f7f61',
  primaryDim: '#eaf3ee',
  secondary: '#f2f5f3',
  secondaryDim: '#f7f8f7',
  accent: '#eaf3ee',
  accentDim: '#f4f8f5',
  accentTeal: '#287f78',
  accentTealDim: '#e8f5f3',
  accentGold: '#9a6700',
  accentGoldDim: '#fff7db',
  accentCoral: '#b42318',

  text: '#17201a',
  textSecondary: '#455249',
  muted: '#5f6b63',
  mutedLight: '#7b867f',

  success: '#267a4f',
  successDim: '#e9f6ef',
  error: '#b42318',
  errorDim: '#fff1f0',
  warning: '#9a6700',
  warningDim: '#fff7db',
  info: '#276b9b',
  infoDim: '#edf6fc',

  overlay: 'rgba(255, 255, 255, 0.82)',
  overlayDark: 'rgba(23, 32, 26, 0.35)',
}

// Dark mode palette
export const DarkColors = {
  // Backgrounds
  background: '#0f172a',
  backgroundTop: '#0f172a',
  backgroundMid: '#0f172a',
  backgroundBottom: '#0f172a',
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
  md: 8,
  lg: 10,
  xl: 12,
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
