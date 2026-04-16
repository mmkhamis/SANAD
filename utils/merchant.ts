// ─── Merchant Normalization ──────────────────────────────────────────
// Aliases map common abbreviations/misspellings → canonical merchant names.

const MERCHANT_ALIASES: Record<string, string> = {
  // Groceries
  'karfour': 'Carrefour',
  'carfour': 'Carrefour',
  'carrefur': 'Carrefour',
  'carefour': 'Carrefour',
  'carrefour': 'Carrefour',
  'spinneys': 'Spinneys',
  'spinney': 'Spinneys',
  'lulu': 'LuLu Hypermarket',
  'lulu hypermarket': 'LuLu Hypermarket',
  'tamimi': 'Tamimi Markets',
  'panda': 'Panda',
  'danube': 'Danube',
  'farm': 'Farm Superstores',

  // Dining
  'mac': "McDonald's",
  'mcd': "McDonald's",
  'mcdonalds': "McDonald's",
  "mcdonald's": "McDonald's",
  'starbux': 'Starbucks',
  'starbucks': 'Starbucks',
  'sbux': 'Starbucks',
  'kfc': 'KFC',
  'bk': 'Burger King',
  'burger king': 'Burger King',
  'hardees': "Hardee's",
  "hardee's": "Hardee's",

  // Ride-hailing
  'uber': 'Uber',
  'careem': 'Careem',

  // E-commerce
  'amzn': 'Amazon',
  'amazon': 'Amazon',
  'noon': 'Noon',
  'shein': 'SHEIN',
  'namshi': 'Namshi',

  // Subscriptions
  'nflx': 'Netflix',
  'netflix': 'Netflix',
  'spotify': 'Spotify',
  'apple': 'Apple',
  'icloud': 'iCloud',
  'youtube': 'YouTube',
  'yt premium': 'YouTube Premium',
  'google': 'Google',

  // Telecom
  'stc': 'STC',
  'mobily': 'Mobily',
  'zain': 'Zain',
  'etisalat': 'Etisalat',
  'du': 'du',
  'vodafone': 'Vodafone',
  'orange': 'Orange',
  'we': 'WE',

  // Furniture / Home
  'ikea': 'IKEA',

  // Fashion
  'zara': 'Zara',
  'h&m': 'H&M',

  // Fuel
  'aramco': 'Aramco',
  'adnoc': 'ADNOC',
};

/**
 * Normalize a raw merchant string to its canonical form.
 * Returns the original (trimmed & title-cased) if no alias matches.
 */
export function normalizeMerchant(raw: string | null | undefined): string | null {
  if (!raw || !raw.trim()) return null;

  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();

  // Direct alias lookup
  const alias = MERCHANT_ALIASES[lower];
  if (alias) return alias;

  // Fuzzy: check if any alias key is contained in the input
  for (const [key, canonical] of Object.entries(MERCHANT_ALIASES)) {
    if (lower.includes(key) && key.length >= 3) {
      return canonical;
    }
  }

  // No match — return original with leading cap
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}
