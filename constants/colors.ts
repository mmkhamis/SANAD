export const COLORS = {
  // ─── Brand (Sain — Violet/Navy) ────────────────────────
  primary: '#8B5CF6',       // violet-500 — signature accent
  primaryLight: '#A78BFA',  // violet-400 — lighter accent
  primaryDark: '#7C3AED',   // violet-600 — pressed/active

  // ─── Semantic ───────────────────────────────────────────
  income: '#34D399',        // emerald-400
  incomeBg: '#34D39918',
  expense: '#FB7185',       // rose-400
  expenseBg: '#FB718515',
  warning: '#FBBF24',       // amber-400
  warningBg: '#FBBF2415',
  info: '#38BDF8',          // sky-400
  infoBg: '#38BDF815',

  // ─── Neutrals (Light) ─────────────────────────────────
  background: '#F1F5F9',    // slate-100
  surface: '#FFFFFF',
  surfaceSecondary: '#F1F5F9',
  surfaceTertiary: '#E2E8F0', // slate-200
  border: '#CBD5E1',        // slate-300
  borderLight: '#E2E8F0',   // slate-200

  // ─── Text (Light) ─────────────────────────────────────
  textPrimary: '#1E293B',   // slate-800
  textSecondary: '#64748B', // slate-500
  textTertiary: '#94A3B8',  // slate-400
  textInverse: '#FFFFFF',

  // ─── Shadows ───────────────────────────────────────────
  shadowLight: 'rgba(15, 23, 42, 0.06)',
  shadowMedium: 'rgba(15, 23, 42, 0.10)',

  // ─── Floating card (glass-morphism) ────────────────────
  glass: {
    cardBg: 'rgba(30,41,56,0.75)',          // slate-800/75
    cardBgElevated: 'rgba(15,23,42,0.80)',  // slate-900/80
    cardBorder: 'rgba(51,65,85,0.30)',       // slate-700/30
    cardBorderStrong: 'rgba(51,65,85,0.50)', // slate-700/50
    separator: 'rgba(51,65,85,0.30)',
  },
  glassLight: {
    cardBg: '#FFFFFF',
    cardBgElevated: '#FFFFFF',
    cardBorder: '#E2E8F0',
    cardBorderStrong: '#CBD5E1',
    separator: '#E2E8F0',
  },

  // ─── Dark theme (Sain Navy) ────────────────────────────
  dark: {
    bg: '#1a1f2e',                // deep navy background
    surface: '#242938',           // mid-navy surface
    surfaceElevated: '#2d3348',   // elevated panel
    surfaceHover: '#343a50',
    text: '#F1F5F9',              // slate-100
    textSecondary: '#94A3B8',     // slate-400
    textMuted: '#94A3B8',
    textDim: '#64748B',           // slate-500
    accent: '#8B5CF6',            // violet-500
    accentHover: '#A78BFA',       // violet-400
    accentBg: '#8B5CF620',
    border: 'rgba(51,65,85,0.30)',
    borderSubtle: 'rgba(51,65,85,0.15)',
    cardBg: '#242938',
    cardBgHover: '#2d3348',
    buttonBg: '#2d3348',
    overlay: 'rgba(0,0,0,0.85)',
    success: '#34D399',
    successMuted: '#34D399',
  },

  // ─── Gradient Backgrounds (dark mode layering) ──────────
  gradient: {
    bgStart: '#1a1f2e',
    bgMid: '#242938',
    bgEnd: '#1a1f2e',
  },

  // ─── Soft Glow (buttons & FABs) ────────────────────────
  glow: {
    primary: 'rgba(139,92,246,0.25)',     // violet glow
    primaryStrong: 'rgba(139,92,246,0.40)',
    fuchsia: 'rgba(217,70,239,0.20)',     // secondary glow
    income: 'rgba(52,211,153,0.20)',
    expense: 'rgba(251,113,133,0.15)',
  },

  // ─── Card Design Tokens ────────────────────────────────
  card: {
    radius: 16,
    radiusSmall: 12,
    spacing: 10,         // vertical gap between cards
    paddingH: 16,
    paddingV: 14,
  },

  // ─── Chart Palette (Sain spectrum) ─────────────────────
  chart: [
    '#8B5CF6',  // violet
    '#34D399',  // emerald
    '#FB7185',  // rose
    '#38BDF8',  // sky
    '#D946EF',  // fuchsia
    '#FBBF24',  // amber
    '#F97316',  // orange
    '#14B8A6',  // teal
    '#3B82F6',  // blue
    '#06B6D4',  // cyan
  ],

  // ─── Saudi Theme — premium forest green ───────────────
  // Light: warm off-white surfaces, deep green accent
  // Dark:  near-black with deep forest background
  saudi: {
    // Light mode palette
    light: {
      bg: '#F5F8F5',              // faint green-tinted white
      surface: '#FFFFFF',
      surfaceSecondary: '#EEF3EE',
      surfaceTertiary: '#E4EDE4',
      accent: '#1D6A40',          // premium forest green
      accentLight: '#2A9A5E',     // brighter for hover/active
      accentBg: '#1D6A4015',
      accentGlow: 'rgba(29,106,64,0.18)',
      text: '#0F2419',            // very dark green-black
      textSecondary: '#4A7060',   // muted green-grey
      textMuted: '#7A9A87',
      border: '#C8DDD0',
      borderLight: '#DCE9E0',
      shadow: 'rgba(29,106,64,0.08)',
      income: '#1D6A40',
      expense: '#C0392B',
      gradientStart: '#F5F8F5',
      gradientEnd: '#EEF5F0',
      glass: {
        cardBg: '#FFFFFF',
        cardBgElevated: '#FFFFFF',
        cardBorder: '#C8DDD0',
        separator: '#DCE9E0',
      },
    },
    // Dark mode palette
    dark: {
      bg: '#0C1510',              // deep forest night
      surface: '#142018',         // dark green surface
      surfaceElevated: '#1C2C20', // lifted panel
      surfaceHover: '#243428',
      accent: '#2DB866',          // vivid Saudi green for dark
      accentLight: '#3FD47A',     // highlight
      accentBg: '#2DB86620',
      accentGlow: 'rgba(45,184,102,0.25)',
      text: '#E8F2EC',            // warm off-white
      textSecondary: '#7FB896',   // muted green
      textMuted: '#4A7060',
      textDim: '#2E5040',
      border: 'rgba(45,184,102,0.18)',
      borderSubtle: 'rgba(45,184,102,0.08)',
      cardBg: '#142018',
      overlay: 'rgba(0,0,0,0.88)',
      income: '#2DB866',
      expense: '#FF6B6B',
      gradientStart: '#0C1510',
      gradientMid: '#142018',
      gradientEnd: '#0C1510',
      glass: {
        cardBg: 'rgba(20,32,24,0.85)',
        cardBgElevated: 'rgba(12,21,16,0.90)',
        cardBorder: 'rgba(45,184,102,0.15)',
        separator: 'rgba(45,184,102,0.10)',
      },
    },
    // Saudi chart palette (green spectrum + neutral pops)
    chart: [
      '#2DB866',  // saudi green
      '#F4C430',  // saffron gold
      '#38BDF8',  // sky
      '#FB7185',  // rose
      '#14B8A6',  // teal
      '#FBBF24',  // amber
      '#3B82F6',  // blue
      '#D946EF',  // fuchsia
      '#F97316',  // orange
      '#06B6D4',  // cyan
    ],
  },
} as const;

export type ColorKey = keyof typeof COLORS;
