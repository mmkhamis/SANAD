// Icons.jsx — line icons used across the app
// All icons are 24x24, stroke-based, currentColor

const Icon = {
  Home: (p) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
    </svg>
  ),
  Grid: (p) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  Chart: (p) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 20h18" />
      <rect x="5" y="11" width="3" height="7" rx="1" />
      <rect x="10.5" y="7" width="3" height="11" rx="1" />
      <rect x="16" y="13" width="3" height="5" rx="1" />
    </svg>
  ),
  Coins: (p) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <ellipse cx="9" cy="8" rx="6" ry="3" />
      <path d="M3 8v4c0 1.7 2.7 3 6 3s6-1.3 6-3V8" />
      <path d="M15 12.5c3.3 0 6-1.3 6-3s-2.7-3-6-3" />
      <path d="M21 9.5v4c0 1.7-2.7 3-6 3" />
    </svg>
  ),
  User: (p) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  ),
  Card: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="2" y="5" width="20" height="14" rx="3" />
      <path d="M2 10h20" />
      <path d="M6 15h3" />
    </svg>
  ),
  Target: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  ),
  Users: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="9" cy="9" r="3.5" />
      <circle cx="17" cy="10" r="2.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <path d="M17 14c2.8 0 5 1.8 5 4.5" />
    </svg>
  ),
  Sparkle: (p) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    </svg>
  ),
  Chevron: (p) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  ),
  Plus: (p) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" {...p}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  Eye: (p) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  EyeOff: (p) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 3l18 18" />
      <path d="M10.6 6.1C11 6 11.5 6 12 6c6.5 0 10 6 10 6s-1.3 2.4-3.8 4.3" />
      <path d="M6.6 7.8C3.7 9.6 2 12 2 12s3.5 7 10 7c1.7 0 3.2-.4 4.5-1" />
      <path d="M14.1 14.1a3 3 0 0 1-4.2-4.2" />
    </svg>
  ),
  Bell: (p) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M18 16H6l1.5-2V10a4.5 4.5 0 0 1 9 0v4Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  ),
  Search: (p) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  ),
  ArrowDown: (p) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 5v14M6 13l6 6 6-6" />
    </svg>
  ),
  ArrowUp: (p) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  ),
  Swap: (p) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M7 7h12l-3-3M17 17H5l3 3" />
    </svg>
  ),
  Bulb: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M9 18h6" />
      <path d="M10 21h4" />
      <path d="M12 2a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5v1h6v-1c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 2Z" />
    </svg>
  ),
  Lock: (p) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="4" y="10" width="16" height="11" rx="2.5" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  ),
  Gold: (p) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="12" cy="12" r="9" fill="url(#gold-g)" stroke="oklch(78% 0.14 85)" strokeWidth="1" />
      <path d="M9.5 9.5h3.5a1.5 1.5 0 0 1 0 3h-3.5zM9.5 12.5h4a1.5 1.5 0 0 1 0 3h-4z" stroke="#2a1f08" strokeWidth="1.2" fill="none" />
      <defs>
        <linearGradient id="gold-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="oklch(85% 0.13 85)" />
          <stop offset="1" stopColor="oklch(62% 0.13 70)" />
        </linearGradient>
      </defs>
    </svg>
  ),
  Silver: (p) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="12" cy="12" r="9" fill="url(#sil-g)" stroke="oklch(82% 0.02 240)" strokeWidth="1" />
      <path d="M9.5 9.5v5l2.5 1 2.5-1v-5z" stroke="#222" strokeWidth="1.2" fill="none" />
      <defs>
        <linearGradient id="sil-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="oklch(90% 0.01 240)" />
          <stop offset="1" stopColor="oklch(65% 0.01 240)" />
        </linearGradient>
      </defs>
    </svg>
  ),
  Stocks: (p) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="12" cy="12" r="9" fill="oklch(35% 0.08 230 / 0.4)" stroke="oklch(70% 0.12 230)" strokeWidth="1" />
      <path d="M7 15l3-3 2 2 5-5" stroke="oklch(80% 0.12 160)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 8h3v3" stroke="oklch(80% 0.12 160)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Crypto: (p) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="12" cy="12" r="9" fill="oklch(35% 0.15 40 / 0.4)" stroke="oklch(72% 0.15 40)" strokeWidth="1" />
      <text x="12" y="16" textAnchor="middle" fill="oklch(85% 0.13 40)" fontSize="11" fontWeight="700" fontFamily="system-ui">₿</text>
    </svg>
  ),
  Uber: (p) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" {...p}>
      <rect width="24" height="24" rx="7" fill="#1a1a1a" />
      <text x="12" y="15" textAnchor="middle" fill="#fff" fontSize="7.5" fontWeight="800" fontFamily="system-ui, -apple-system" letterSpacing="-0.3">Uber</text>
    </svg>
  ),
  Settings: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  ),
  Moon: (p) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  ),
  Globe: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  ),
  Trash: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M6 7v13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" />
    </svg>
  ),
  Msg: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2Z" />
    </svg>
  ),
  Whatsapp: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 21l1.7-5A8 8 0 1 1 8 19.5Z" />
    </svg>
  ),
  Bolt: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
    </svg>
  ),
  Edit: (p) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  ),
  Shield: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 3 4 6v6c0 4.4 3.4 8.5 8 9 4.6-.5 8-4.6 8-9V6z" />
    </svg>
  ),
};

// Saudi Riyal glyph — stylized
function RiyalGlyph({ size = 14, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M7 4v11c0 2 1.5 3.5 3.5 3.5s3.5-1.5 3.5-3.5V4" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none"/>
      <path d="M16 8l-12 3M18 12l-14 3.5" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

window.Icon = Icon;
window.RiyalGlyph = RiyalGlyph;
