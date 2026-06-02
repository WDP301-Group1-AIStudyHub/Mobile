export const LightColors = {
  // Backgrounds — warm light cosmos (dùng cho cards/surfaces, không phải nền màn hình)
  background: '#f7f5ed',
  backgroundTop: '#fffdfa',
  backgroundMid: '#f1f5fb',
  backgroundBottom: '#f7f2e6',
  card: 'rgba(255, 255, 252, 0.18)',
  cardBorder: 'rgba(200, 210, 255, 0.35)',
  cardElevated: 'rgba(255, 255, 255, 0.22)',
  cardShadowColor: '#000000',

  // Brand
  primary: '#7b8ff5',
  primaryLight: '#a5b0ff',
  primaryDim: 'rgba(123, 143, 245, 0.18)',
  secondary: '#60a5fa',
  secondaryDim: 'rgba(96, 165, 250, 0.18)',
  accent: '#c084fc',
  accentTeal: '#2dd4bf',
  accentGold: '#fbbf24',
  accentCoral: '#fb7185',

  // Gradients
  gradientPrimary: ['#4f63d2', '#6d28d9'] as const,
  gradientHero: ['#3b5bdb', '#0ea5e9'] as const,
  gradientGold: ['#d97706', '#f59e0b'] as const,
  gradientBg: ['#fffdfa', '#f1f5fb', '#f7f2e6'] as const,

  // Text — PHẢI sáng vì background luôn là video tối
  text: '#eef0ff',
  textSecondary: '#c5ccf0',
  muted: '#9aa3c8',
  mutedLight: '#7480a8',

  // Semantic
  success: '#4ade80',
  successDim: 'rgba(74, 222, 128, 0.12)',
  error: '#f87171',
  errorDim: 'rgba(248, 113, 113, 0.12)',
  warning: '#fbbf24',
  warningDim: 'rgba(251, 191, 36, 0.12)',
  info: '#38bdf8',
  infoDim: 'rgba(56, 189, 248, 0.12)',

  // Overlay
  overlay: 'rgba(247, 245, 237, 0.15)',
  overlayDark: 'rgba(0, 0, 0, 0.35)',

  // Decorative — sáng hơn để nổi trên video
  starColor: 'rgba(255, 255, 255, 0.30)',
  starBright: 'rgba(255, 255, 255, 0.65)',
  nebulaBlue: 'rgba(65, 145, 235, 0.20)',
  nebulaGold: 'rgba(220, 165, 60, 0.18)',
  nebulaTeal: 'rgba(31, 184, 175, 0.14)',
  nebulaViolet: 'rgba(140, 60, 250, 0.12)',
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
