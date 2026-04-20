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

  // ─── Neutrals (Light) — Claude Design CSS .light tokens ──────
  background: '#F6F5F1',    // --bg-0
  surface: '#FFFFFF',       // --bg-2 (cards, sheets, inputs)
  surfaceSecondary: '#FAFAF7', // --bg-1
  surfaceTertiary: '#F1EFEA',  // --bg-3
  border: 'rgba(16,10,30,0.08)',     // --stroke
  borderLight: 'rgba(16,10,30,0.04)', // subtler separator

  // ─── Text (Light) — dark text on light surfaces ─────────────
  textPrimary: '#14132A',           // --fg
  textSecondary: 'rgba(20,19,42,0.72)', // --fg-2
  textTertiary: 'rgba(20,19,42,0.52)',  // --fg-3
  textInverse: '#FFFFFF',           // for chips/badges on dark accents

  // ─── Shadows (tinted with #14132A like CSS shadows) ──────────
  shadowLight: 'rgba(20,10,40,0.05)',
  shadowMedium: 'rgba(20,10,40,0.10)',

  // ─── Floating card (glass-morphism) ──────────────────────────
  glass: {
    cardBg: 'rgba(255,255,255,0.055)',
    cardBgElevated: 'rgba(255,255,255,0.08)',
    cardBorder: 'rgba(255,255,255,0.07)',
    cardBorderStrong: 'rgba(255,255,255,0.12)',
    separator: 'rgba(255,255,255,0.07)',
  },
  glassLight: {
    cardBg: '#FFFFFF',                // .light .card base
    cardBgElevated: '#FAFAF7',        // slightly tinted lift
    cardBorder: 'rgba(16,10,30,0.08)', // --stroke
    cardBorderStrong: 'rgba(16,10,30,0.14)', // --stroke-strong
    separator: 'rgba(16,10,30,0.06)',
  },

  // ─── Dark theme (Claude Design — near-black navy, glass + purple) ────
  dark: {
    bg: '#07080F',                   // bg-0 deepest
    surface: '#11131F',              // bg-2 base surface
    surfaceElevated: '#161827',      // bg-3 elevated panel
    surfaceHover: '#1B1E30',
    text: '#F4F4F8',                 // fg
    textSecondary: 'rgba(244,244,248,0.72)',  // fg-2
    textMuted: 'rgba(244,244,248,0.50)',      // fg-3
    textDim: 'rgba(244,244,248,0.32)',        // fg-4
    accent: '#8B5CF6',               // p-500
    accentHover: '#A278EA',          // p-400
    accentBg: 'rgba(139,92,246,0.14)',
    border: 'rgba(255,255,255,0.07)',       // stroke
    borderSubtle: 'rgba(255,255,255,0.04)',
    cardBg: 'rgba(255,255,255,0.03)',       // glass-1 card-section style
    cardBgHover: 'rgba(255,255,255,0.06)',
    buttonBg: 'rgba(255,255,255,0.055)',
    overlay: 'rgba(0,0,0,0.80)',
    success: '#4ECB97',
    successMuted: '#4ECB97',
  },

  // ─── Gradient Backgrounds (hero backplate layering) ──────
  gradient: {
    bgStart: '#0B0C17',   // bg-1
    bgMid: '#07080F',     // bg-0
    bgEnd: '#07080F',     // bg-0
  },

  // ─── Soft Glow (buttons & FABs) ────────────────────────
  glow: {
    primary: 'rgba(139,92,246,0.25)',     // violet glow
    primaryStrong: 'rgba(139,92,246,0.35)',
    fuchsia: 'rgba(217,70,239,0.20)',     // secondary glow
    income: 'rgba(78,203,151,0.22)',
    expense: 'rgba(240,104,96,0.18)',
  },

  // ─── Card Design Tokens ────────────────────────────────
  card: {
    radius: 20,
    radiusSmall: 14,
    spacing: 12,         // vertical gap between cards
    paddingH: 16,
    paddingV: 14,
  },

  // ─── Claude Design Palette (OKLch → sRGB hex) ──────────
  claude: {
    bg0: '#07080F',
    bg1: '#0B0C17',
    bg2: '#11131F',
    bg3: '#161827',
    glass1: 'rgba(255,255,255,0.03)',
    glass2: 'rgba(255,255,255,0.055)',
    glass3: 'rgba(255,255,255,0.08)',
    stroke: 'rgba(255,255,255,0.07)',
    strokeStrong: 'rgba(255,255,255,0.12)',
    insetLight: 'rgba(255,255,255,0.05)',
    fg:  '#F4F4F8',
    fg2: 'rgba(244,244,248,0.72)',
    fg3: 'rgba(244,244,248,0.50)',
    fg4: 'rgba(244,244,248,0.32)',
    p50:  '#F1ECFB',
    p200: '#C8B4F3',
    p400: '#A278EA',
    p500: '#8B5CF6',
    p600: '#7A47EB',
    p700: '#5B2FC7',
    pGlow: 'rgba(139,92,246,0.35)',
    green: '#4ECB97',
    green2: '#2EA577',          // oklch(62% 0.14 160) — darker green
    greenText: '#7EDBB5',       // oklch(80% 0.10 160) — light green text
    amber: '#E8B254',
    red:   '#F06860',
    redText: '#F2978E',         // oklch(80% 0.14 20) — light red text
    blue:  '#6FB4E8',

    // ─── Chip gradient colors (oklch → hex) ─────────────
    chip: {
      // Purple chip
      purpleBgStart: 'rgba(122,71,235,0.28)',   // oklch(58% 0.21 290 / 0.28)
      purpleBgEnd: 'rgba(91,47,199,0.12)',       // oklch(48% 0.18 290 / 0.12)
      purpleBorder: 'rgba(162,120,234,0.35)',    // oklch(70% 0.18 290 / 0.35)
      purpleIcon: '#C8B4F3',                     // oklch(82% 0.12 290)
      purpleGlow: 'rgba(107,69,214,0.25)',       // oklch(55% 0.2 290 / 0.25)
      // Green chip
      greenBgStart: 'rgba(46,165,119,0.28)',     // oklch(62% 0.14 160 / 0.28)
      greenBgEnd: 'rgba(34,128,91,0.10)',        // oklch(50% 0.12 160 / 0.10)
      greenBorder: 'rgba(93,194,150,0.32)',      // oklch(70% 0.12 160 / 0.32)
      greenIcon: '#7EDBB5',                      // oklch(80% 0.10 160)
      // Blue chip
      blueBgStart: 'rgba(62,157,218,0.25)',      // oklch(60% 0.14 230 / 0.25)
      blueBgEnd: 'rgba(41,127,190,0.10)',        // oklch(50% 0.12 230 / 0.10)
      blueBorder: 'rgba(93,183,231,0.30)',       // oklch(70% 0.12 230 / 0.30)
      blueIcon: '#A5D6F5',                       // oklch(80% 0.10 230)
      // Amber chip
      amberBgStart: 'rgba(200,160,55,0.28)',     // oklch(72% 0.14 75 / 0.28)
      amberBgEnd: 'rgba(166,128,40,0.10)',       // oklch(60% 0.12 75 / 0.10)
      amberBorder: 'rgba(220,186,90,0.35)',      // oklch(78% 0.12 75 / 0.35)
      amberIcon: '#E6D08A',                      // oklch(85% 0.10 75)
      // Red chip
      redBgStart: 'rgba(195,72,58,0.22)',        // oklch(62% 0.20 20 / 0.22)
      redBgEnd: 'rgba(160,52,42,0.10)',          // oklch(50% 0.18 20 / 0.10)
      redBorder: 'rgba(218,108,93,0.30)',        // oklch(70% 0.18 20 / 0.30)
      redIcon: '#F2978E',                        // oklch(80% 0.14 20)
    },

    // ─── Pill badge colors ──────────────────────────────
    pill: {
      purpleBg: 'rgba(107,69,214,0.18)',         // oklch(55% 0.2 290 / 0.18)
      purpleText: '#C8B4F3',                     // oklch(82% 0.12 290)
      purpleBorder: 'rgba(162,120,234,0.30)',    // oklch(70% 0.18 290 / 0.3)
      greenBg: 'rgba(50,155,107,0.18)',          // oklch(55% 0.14 160 / 0.18)
      greenText: '#9AE8C8',                      // oklch(82% 0.11 160)
      greenBorder: 'rgba(93,194,150,0.30)',      // oklch(70% 0.12 160 / 0.3)
      redBg: 'rgba(160,52,42,0.15)',             // oklch(55% 0.2 20 / 0.15)
      redText: '#E89F95',                        // oklch(78% 0.14 20)
      redBorder: 'rgba(195,72,58,0.30)',         // oklch(68% 0.18 20 / 0.3)
    },

    // ─── Hero card gradient overlays ────────────────────
    heroCard: {
      purpleWash: 'rgba(139,92,246,0.30)',       // oklch(55% 0.18 290 / 0.30)
      blueWash: 'rgba(80,138,200,0.18)',         // oklch(50% 0.12 230 / 0.18)
      glassBgStart: 'rgba(255,255,255,0.055)',
      glassBgEnd: 'rgba(255,255,255,0.02)',
      innerShadow: 'rgba(255,255,255,0.08)',
      dropShadow: 'rgba(0,0,0,0.35)',
    },

    // ─── Segmented control ──────────────────────────────
    segmented: {
      bg: 'rgba(0,0,0,0.25)',
      border: 'rgba(255,255,255,0.07)',
      inactiveText: 'rgba(244,244,248,0.50)',
      activeBgStart: '#8B5CF6',                  // p-500
      activeBgEnd: '#5B2FC7',                    // p-700
      activeGlow: 'rgba(139,92,246,0.35)',       // p-glow
    },

    // ─── Analytics categories (oklch → hex) ─────────────
    catColors: {
      food: '#C1752E',         // oklch(65% 0.18 40) — مطاعم ومقاهي
      shopping: '#8B5CF6',     // oklch(65% 0.18 290) — تسوق
      transport: '#6FB4E8',    // oklch(68% 0.15 200) — تنقل
      entertainment: '#4ECB97', // oklch(72% 0.15 140) — ترفيه
      other: '#7A6FA8',        // oklch(60% 0.08 280) — أخرى
    },

    // ─── Asset colors ───────────────────────────────────
    assetColors: {
      stocks: '#6FB4E8',       // oklch(65% 0.18 230)
      gold: '#E8B254',         // oklch(72% 0.13 85)
      crypto: '#C87832',       // oklch(68% 0.18 40)
      silver: '#6FA0B8',       // oklch(60% 0.08 240)
    },

    // ─── Sparkline / area chart ─────────────────────────
    sparkPurple: '#A278EA',          // oklch(72% 0.16 290) — stroke
    sparkPurpleFill: 'rgba(162,120,234,0.60)', // same, 60% for gradient top
    sparkGreen: '#4ECB97',           // oklch(72% 0.14 160) — up
    sparkRed: '#F06860',             // oklch(68% 0.18 20) — down
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
