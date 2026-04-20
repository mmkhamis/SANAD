export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
} as const;

export const BORDER_RADIUS = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 9999,
  full: 9999,
} as const;

/**
 * Shared shadow / elevation presets matching the Claude Design language.
 * All values are RN-safe (no CSS shadows, no backdrop-filter).
 */
export const ELEVATION = {
  card:   { shadowColor: '#000',      shadowOpacity: 0.25, shadowRadius: 8,  shadowOffset: { width: 0, height: 4 },  elevation: 3 },
  hero:   { shadowColor: '#000',      shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
  glow:   { shadowColor: '#8B5CF6',   shadowOpacity: 0.45, shadowRadius: 28, shadowOffset: { width: 0, height: 8 },  elevation: 10 },
  tabbar: { shadowColor: '#000',      shadowOpacity: 0.50, shadowRadius: 24, shadowOffset: { width: 0, height: 20 }, elevation: 16 },
} as const;

/** 1px inset-light band drawn as a top-edge highlight on glass surfaces. */
export const INSET_LIGHT = 'rgba(255,255,255,0.05)' as const;

/**
 * Screen-width breakpoints (logical pixels).
 * - smallPhone : < 375  (iPhone SE 1st gen, narrow Android)
 * - tablet     : ≥ 768  (iPad, large Android tablet)
 * Anything in between is treated as a regular phone.
 */
export const BREAKPOINTS = {
  smallPhone: 375,
  tablet: 768,
} as const;

/**
 * Cap content width on large screens so layouts don't stretch to
 * full 1024px+ widths when supportsTablet is eventually enabled.
 */
export const MAX_CONTENT_WIDTH = 600 as const;

/**
 * Minimum recommended touch target sizes.
 * iOS HIG: 44pt  |  Material Design: 48dp
 * Using 44 as the shared floor since we target iOS-first.
 */
export const MIN_TOUCH_TARGET = 44 as const;

export const DASHBOARD_RECENT_TRANSACTIONS_LIMIT = 5;
