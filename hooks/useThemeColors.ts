import { useColorScheme } from 'react-native';

import { COLORS } from '../constants/colors';
import { useThemeStore, resolveTheme, type ColorScheme } from '../store/theme-store';

/** Resolved color tokens for the active theme. */
export interface ThemeColors {
  background: string;
  surface: string;
  surfaceSecondary: string;
  surfaceTertiary: string;
  cardBg: string;
  overlay: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textDim: string;
  textInverse: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  income: string;
  incomeBg: string;
  expense: string;
  expenseBg: string;
  warning: string;
  warningBg: string;
  info: string;
  infoBg: string;
  border: string;
  borderLight: string;
  shadowLight: string;
  shadowMedium: string;
  chart: readonly string[];
  isDark: boolean;
  // Floating card tokens
  glassBg: string;
  glassBgElevated: string;
  glassBorder: string;
  glassBorderStrong: string;
  glassSeparator: string;
  // Gradient background
  gradientBg: readonly [string, string, string];
  // Glow tokens
  glowPrimary: string;
  glowPrimaryStrong: string;
  // Card design
  cardRadius: number;
  cardRadiusSmall: number;
  cardSpacing: number;
}

const LIGHT_COLORS: ThemeColors = {
  background: COLORS.background,
  surface: COLORS.surface,
  surfaceSecondary: COLORS.surfaceSecondary,
  surfaceTertiary: COLORS.surfaceTertiary,
  cardBg: COLORS.surface,
  overlay: 'rgba(0,0,0,0.5)',
  textPrimary: COLORS.textPrimary,
  textSecondary: COLORS.textSecondary,
  textTertiary: COLORS.textTertiary,
  textDim: COLORS.textTertiary,
  textInverse: COLORS.textInverse,
  primary: COLORS.primary,
  primaryLight: COLORS.primaryLight,
  primaryDark: COLORS.primaryDark,
  income: COLORS.income,
  incomeBg: COLORS.incomeBg,
  expense: COLORS.expense,
  expenseBg: COLORS.expenseBg,
  warning: COLORS.warning,
  warningBg: COLORS.warningBg,
  info: COLORS.info,
  infoBg: COLORS.infoBg,
  border: COLORS.border,
  borderLight: COLORS.borderLight,
  shadowLight: COLORS.shadowLight,
  shadowMedium: COLORS.shadowMedium,
  chart: COLORS.chart,
  isDark: false,
  glassBg: COLORS.glassLight.cardBg,
  glassBgElevated: COLORS.glassLight.cardBgElevated,
  glassBorder: COLORS.glassLight.cardBorder,
  glassBorderStrong: COLORS.glassLight.cardBorderStrong,
  glassSeparator: COLORS.glassLight.separator,
  gradientBg: [COLORS.background, COLORS.background, COLORS.background] as const,
  glowPrimary: 'rgba(139,92,246,0.08)',
  glowPrimaryStrong: 'rgba(139,92,246,0.14)',
  cardRadius: COLORS.card.radius,
  cardRadiusSmall: COLORS.card.radiusSmall,
  cardSpacing: COLORS.card.spacing,
};

const DARK_COLORS: ThemeColors = {
  background: COLORS.dark.bg,
  surface: COLORS.dark.surface,
  surfaceSecondary: COLORS.dark.surfaceElevated,
  surfaceTertiary: COLORS.dark.surfaceHover,
  cardBg: COLORS.dark.cardBg,
  overlay: COLORS.dark.overlay,
  textPrimary: COLORS.dark.text,
  textSecondary: COLORS.dark.textSecondary,
  textTertiary: COLORS.dark.textMuted,
  textDim: COLORS.dark.textDim,
  textInverse: '#1a1f2e',
  primary: COLORS.dark.accent,
  primaryLight: COLORS.dark.accentHover,
  primaryDark: COLORS.dark.accentBg,
  income: '#34D399',
  incomeBg: '#34D39918',
  expense: '#FB7185',
  expenseBg: '#FB718518',
  warning: '#FBBF24',
  warningBg: '#FBBF2418',
  info: '#38BDF8',
  infoBg: '#38BDF818',
  border: COLORS.dark.border,
  borderLight: COLORS.dark.borderSubtle,
  shadowLight: 'rgba(0,0,0,0.25)',
  shadowMedium: 'rgba(0,0,0,0.45)',
  chart: COLORS.chart,
  isDark: true,
  glassBg: COLORS.glass.cardBg,
  glassBgElevated: COLORS.glass.cardBgElevated,
  glassBorder: COLORS.glass.cardBorder,
  glassBorderStrong: COLORS.glass.cardBorderStrong,
  glassSeparator: COLORS.glass.separator,
  gradientBg: [COLORS.gradient.bgStart, COLORS.gradient.bgMid, COLORS.gradient.bgEnd] as const,
  glowPrimary: COLORS.glow.primary,
  glowPrimaryStrong: COLORS.glow.primaryStrong,
  cardRadius: COLORS.card.radius,
  cardRadiusSmall: COLORS.card.radiusSmall,
  cardSpacing: COLORS.card.spacing,
};

/**
 * Returns the active theme's color tokens.
 * Reacts to store changes and system appearance.
 */
export function useThemeColors(): ThemeColors {
  const mode = useThemeStore((s) => s.mode);
  // Subscribe to system changes so 'system' mode re-renders.
  useColorScheme();
  const resolved = resolveTheme(mode);
  return resolved === 'dark' ? DARK_COLORS : LIGHT_COLORS;
}
