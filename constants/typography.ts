export const TYPOGRAPHY = {
  // ─── Font Sizes ─────────────────────────────────────────
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,

  // ─── Font Weights ───────────────────────────────────────
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,

  // ─── Line Heights ───────────────────────────────────────
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.75,

  // ─── Claude Design scale (h1/h2/h3/body/caption/micro) ──
  h1:      { fontSize: 30, fontWeight: '700' as const, lineHeight: 34, letterSpacing: -0.6 },
  h2:      { fontSize: 20, fontWeight: '600' as const, letterSpacing: -0.2 },
  h3:      { fontSize: 17, fontWeight: '600' as const },
  body:    { fontSize: 15, fontWeight: '400' as const, lineHeight: 21 },
  caption: { fontSize: 12, fontWeight: '500' as const, letterSpacing: 0.1 },
  micro:   { fontSize: 11, fontWeight: '500' as const, letterSpacing: 0.4 },
} as const;
