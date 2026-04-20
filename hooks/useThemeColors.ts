import { useColorScheme } from 'react-native';

import { COLORS } from '../constants/colors';
import { ELEVATION, INSET_LIGHT } from '../constants/layout';
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
  /** Two overlays (top-right purple + bottom-left blue) for hero backplate. */
  heroWashPrimary: readonly [string, string];
  heroWashSecondary: readonly [string, string];
  // Glow tokens
  glowPrimary: string;
  glowPrimaryStrong: string;
  // Card design
  cardRadius: number;
  cardRadiusSmall: number;
  cardSpacing: number;
  // Claude Design extras
  insetLight: string;
  elevation: typeof ELEVATION;
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
  gradientBg: [COLORS.background, '#d2d3db', COLORS.background] as const,
  heroWashPrimary: ['rgba(139,92,246,0.14)', 'transparent'] as const,
  heroWashSecondary: ['rgba(111,180,232,0.10)', 'transparent'] as const,
  glowPrimary: 'rgba(72,75,106,0.14)',
  glowPrimaryStrong: 'rgba(72,75,106,0.26)',
  cardRadius: COLORS.card.radius,
  cardRadiusSmall: COLORS.card.radiusSmall,
  cardSpacing: COLORS.card.spacing,
  insetLight: INSET_LIGHT,
  elevation: ELEVATION,
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
  textInverse: COLORS.claude.bg0,
  primary: COLORS.dark.accent,
  primaryLight: COLORS.dark.accentHover,
  primaryDark: COLORS.claude.p700,
  income: COLORS.claude.green,
  incomeBg: 'rgba(78,203,151,0.14)',
  expense: COLORS.claude.red,
  expenseBg: 'rgba(240,104,96,0.14)',
  warning: COLORS.claude.amber,
  warningBg: 'rgba(232,178,84,0.14)',
  info: COLORS.claude.blue,
  infoBg: 'rgba(111,180,232,0.14)',
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
  heroWashPrimary: ['rgba(139,92,246,0.28)', 'transparent'] as const,
  heroWashSecondary: ['rgba(111,180,232,0.18)', 'transparent'] as const,
  glowPrimary: COLORS.glow.primary,
  glowPrimaryStrong: COLORS.glow.primaryStrong,
  cardRadius: COLORS.card.radius,
  cardRadiusSmall: COLORS.card.radiusSmall,
  cardSpacing: COLORS.card.spacing,
  insetLight: INSET_LIGHT,
  elevation: ELEVATION,
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
