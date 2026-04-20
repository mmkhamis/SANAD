import { useWindowDimensions } from 'react-native';

import { BREAKPOINTS, MAX_CONTENT_WIDTH, SPACING } from '../constants/layout';

export interface ResponsiveValues {
  /** Raw device logical width */
  width: number;
  /** Raw device logical height */
  height: number;
  /** Current orientation */
  orientation: 'portrait' | 'landscape';
  /** True on narrow phones (< 375px — iPhone SE 1st gen, older Android) */
  isSmallPhone: boolean;
  /** True on standard phones (< 768px) */
  isPhone: boolean;
  /** True on tablets / large screens (≥ 768px) */
  isTablet: boolean;
  /**
   * Recommended horizontal screen padding for the current breakpoint.
   * - Tablet  : 24px (SPACING.xl)
   * - Phone   : 16px (SPACING.base)
   * - SmPhone : 12px (SPACING.md)
   */
  hPad: number;
  /** Content width capped at MAX_CONTENT_WIDTH (600) */
  contentWidth: number;
  /**
   * Left/right margin to horizontally center content on wide screens.
   * Always 0 on phones — only non-zero when width > MAX_CONTENT_WIDTH.
   */
  hMargin: number;
  /**
   * Usable card / block width = contentWidth − (2 × hPad).
   * Use this instead of `Dimensions.get('window').width - 32` in components.
   */
  cardWidth: number;
}

/**
 * Returns live layout metrics derived from `useWindowDimensions`.
 *
 * ★ Use this instead of `Dimensions.get('window')` in components so that
 *   values update on orientation change and when the keyboard resizes the window.
 *
 * @example
 * const { cardWidth, isTablet, hPad } = useResponsive();
 * // cardWidth replaces: Dimensions.get('window').width - 32
 */
export function useResponsive(): ResponsiveValues {
  const { width, height } = useWindowDimensions();

  const orientation: 'portrait' | 'landscape' = width >= height ? 'landscape' : 'portrait';
  const isSmallPhone = width < BREAKPOINTS.smallPhone;
  const isTablet = width >= BREAKPOINTS.tablet;
  const isPhone = !isTablet;

  const hPad = isTablet
    ? SPACING.xl          // 24px — roomier on wide screens
    : isSmallPhone
      ? SPACING.md        // 12px — tighter on narrow phones
      : SPACING.base;     // 16px — standard phone padding

  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH);
  const hMargin = Math.max(0, (width - MAX_CONTENT_WIDTH) / 2);
  const cardWidth = contentWidth - hPad * 2;

  return {
    width,
    height,
    orientation,
    isSmallPhone,
    isPhone,
    isTablet,
    hPad,
    contentWidth,
    hMargin,
    cardWidth,
  };
}
