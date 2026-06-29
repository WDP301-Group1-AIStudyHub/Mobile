// Clean color palette - no gradients, solid colors only
export const LightColors = {
  // Backgrounds
  background: '#f7f8f1', // moon-paper
  backgroundTop: '#f7f8f1',
  backgroundMid: '#f7f8f1',
  backgroundBottom: '#f7f8f1',
  card: '#fffdf7', // paper
  cardBorder: '#d5dfd0', // border
  cardElevated: '#ffffff',
  cardShadowColor: 'rgba(73, 107, 85, 0.1)', // shadow-soft

  // Brand colors
  primary: '#496b55', // moss
  primaryLight: '#638f74', // accent-teal
  primaryDim: 'rgba(73, 107, 85, 0.1)',
  secondary: '#eef6f1', // lichen/dew
  secondaryDim: 'rgba(238, 246, 241, 0.5)',
  accent: '#dce7d4', // sage
  accentDim: 'rgba(220, 231, 212, 0.2)',
  accentTeal: '#6f9b9b', // accent-cyan
  accentTealDim: 'rgba(111, 155, 155, 0.1)',
  accentGold: '#9a7a3d', // accent-gold
  accentGoldDim: 'rgba(154, 122, 61, 0.1)',
  accentCoral: '#b8876c', // clay

  // Text
  text: '#263126', // bark
  textSecondary: '#617064', // muted-foreground
  muted: '#88968b', // readable muted text
  mutedLight: '#a6b4a9', // readable lighter muted text

  // Semantic
  success: '#527267', // accent-sapphire
  successDim: 'rgba(82, 114, 103, 0.1)',
  error: '#9f5d55', // berry
  errorDim: 'rgba(159, 93, 85, 0.1)',
  warning: '#9a7a3d',
  warningDim: 'rgba(154, 122, 61, 0.1)',
  info: '#6f9b9b',
  infoDim: 'rgba(111, 155, 155, 0.1)',

  // Overlay
  overlay: 'rgba(247, 248, 241, 0.6)',
  overlayDark: 'rgba(38, 49, 38, 0.2)', // bark 20%
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
