export const LightColors = {
  // Backgrounds — warm light cosmos
  background: '#f7f5ed',
  backgroundTop: '#fffdfa',
  backgroundMid: '#f1f5fb',
  backgroundBottom: '#f7f2e6',
  card: 'rgba(255, 255, 252, 0.75)',
  cardBorder: 'rgba(155, 170, 220, 0.55)',
  cardElevated: 'rgba(255, 255, 255, 0.90)',
  cardShadowColor: '#17244e',

  // Brand
  primary: '#4f63d2',
  primaryLight: '#6b7ff0',
  primaryDim: 'rgba(79, 99, 210, 0.1)',
  secondary: '#2563eb',
  secondaryDim: 'rgba(37, 99, 235, 0.1)',
  accent: '#7c3aed',
  accentTeal: '#0d9488',
  accentGold: '#c9860e',
  accentCoral: '#e05a48',

  // Gradients
  gradientPrimary: ['#4f63d2', '#6d28d9'] as const,
  gradientHero: ['#3b5bdb', '#0ea5e9'] as const,
  gradientGold: ['#d97706', '#f59e0b'] as const,
  gradientBg: ['#fffdfa', '#f1f5fb', '#f7f2e6'] as const,

  // Text
  text: '#1a2340',
  textSecondary: '#344470',
  muted: '#6b7a9f',
  mutedLight: '#8a94b8',

  // Semantic
  success: '#16a34a',
  successDim: 'rgba(22, 163, 74, 0.1)',
  error: '#dc2626',
  errorDim: 'rgba(220, 38, 38, 0.08)',
  warning: '#d97706',
  warningDim: 'rgba(217, 119, 6, 0.1)',
  info: '#0ea5e9',
  infoDim: 'rgba(14, 165, 233, 0.1)',

  // Overlay
  overlay: 'rgba(247, 245, 237, 0.85)',
  overlayDark: 'rgba(26, 35, 64, 0.06)',

  // Decorative (light mode cosmos dots + nebulas)
  starColor: 'rgba(31, 47, 100, 0.16)',
  starBright: 'rgba(31, 47, 100, 0.32)',
  nebulaBlue: 'rgba(65, 145, 235, 0.13)',
  nebulaGold: 'rgba(220, 165, 60, 0.14)',
  nebulaTeal: 'rgba(31, 184, 175, 0.09)',
  nebulaViolet: 'rgba(109, 40, 217, 0.07)',
}

// Dark mode palette — deep space cosmos
export const DarkColors = {
  background: '#0d1117',
  backgroundTop: '#0a0e1a',
  backgroundMid: '#111827',
  backgroundBottom: '#0f1923',
  card: 'rgba(15, 19, 35, 0.72)',
  cardBorder: 'rgba(79, 99, 210, 0.38)',
  cardElevated: 'rgba(22, 28, 50, 0.88)',
  cardShadowColor: '#000000',

  primary: '#6b7ff0',
  primaryLight: '#818cf8',
  primaryDim: 'rgba(107, 127, 240, 0.15)',
  secondary: '#3b82f6',
  secondaryDim: 'rgba(59, 130, 246, 0.15)',
  accent: '#a78bfa',
  accentTeal: '#14b8a6',
  accentGold: '#fbbf24',
  accentCoral: '#f87171',

  gradientPrimary: ['#4f63d2', '#6d28d9'] as const,
  gradientHero: ['#3b5bdb', '#0ea5e9'] as const,
  gradientGold: ['#d97706', '#f59e0b'] as const,
  gradientBg: ['#0a0e1a', '#111827', '#0f1923'] as const,

  text: '#e8eaf6',
  textSecondary: '#b0bcd8',
  muted: '#8892b0',
  mutedLight: '#667090',

  success: '#4ade80',
  successDim: 'rgba(74, 222, 128, 0.12)',
  error: '#f87171',
  errorDim: 'rgba(248, 113, 113, 0.12)',
  warning: '#fbbf24',
  warningDim: 'rgba(251, 191, 36, 0.12)',
  info: '#38bdf8',
  infoDim: 'rgba(56, 189, 248, 0.12)',

  overlay: 'rgba(13, 17, 23, 0.85)',
  overlayDark: 'rgba(0, 0, 0, 0.4)',

  starColor: 'rgba(255, 255, 255, 0.25)',
  starBright: 'rgba(255, 255, 255, 0.6)',
  nebulaBlue: 'rgba(65, 145, 235, 0.18)',
  nebulaGold: 'rgba(220, 165, 60, 0.15)',
  nebulaTeal: 'rgba(31, 184, 175, 0.12)',
  nebulaViolet: 'rgba(109, 40, 217, 0.10)',
}

// Default export stays as LightColors for backward compat during migration
export const Colors = LightColors

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
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
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
