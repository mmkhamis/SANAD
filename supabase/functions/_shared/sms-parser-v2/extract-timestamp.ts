// Timestamp extraction. SMS timestamps are inconsistent; we accept several
// formats and return ISO 8601. Falls back to ctx.arrived_at when none parsed.

const PATTERNS: Array<{ re: RegExp; build: (m: RegExpMatchArray) => string | null }> = [
  // 2026-04-21 18:10:07
  {
    re: /\b(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?\b/,
    build: (m) => `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] ?? '00'}+03:00`,
  },
  // 21/04/26 18:10  or  21-04-26 18:10
  {
    re: /\b(\d{2})[\/\-](\d{2})[\/\-](\d{2})(?:\s+(\d{2}):(\d{2}))?\b/,
    build: (m) => {
      const yy = parseInt(m[3], 10);
      const yyyy = yy < 70 ? 2000 + yy : 1900 + yy;
      const hh = m[4] ?? '00';
      const mm = m[5] ?? '00';
      return `${yyyy}-${m[2]}-${m[1]}T${hh}:${mm}:00+03:00`;
    },
  },
  // 21-04-2026 18:10
  {
    re: /\b(\d{2})[\/\-](\d{2})[\/\-](\d{4})(?:\s+(\d{2}):(\d{2}))?\b/,
    build: (m) => {
      const hh = m[4] ?? '00';
      const mm = m[5] ?? '00';
      return `${m[3]}-${m[2]}-${m[1]}T${hh}:${mm}:00+03:00`;
    },
  },
];

export function extractTimestamp(text: string, fallbackIso?: string): { timestamp: string | null; parsed: boolean } {
  for (const { re, build } of PATTERNS) {
    const m = text.match(re);
    if (m) {
      const iso = build(m);
      if (iso && !isNaN(new Date(iso).getTime())) {
        return { timestamp: iso, parsed: true };
      }
    }
  }
  if (fallbackIso) return { timestamp: fallbackIso, parsed: false };
  return { timestamp: null, parsed: false };
}
