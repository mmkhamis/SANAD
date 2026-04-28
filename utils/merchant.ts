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
  'bin dawood': 'Bin Dawood',
  'bindawood': 'Bin Dawood',
  'othaim': 'Othaim',
  'nesto': 'Nesto',

  // Fast food & dining
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
  'albaik': 'Al Baik',
  'al baik': 'Al Baik',
  'kudu': 'Kudu',
  'herfy': 'Herfy',
  'shawarmer': 'Shawarmer',
  'dunkin': 'Dunkin',
  "dunkin'": 'Dunkin',
  'tim hortons': 'Tim Hortons',
  'timhortons': 'Tim Hortons',
  'subway': 'Subway',
  'pizza hut': 'Pizza Hut',
  'dominos': "Domino's",
  "domino's": "Domino's",
  "papa john's": "Papa John's",
  'papa johns': "Papa John's",
  'baskin robbins': 'Baskin Robbins',
  'krispy kreme': 'Krispy Kreme',
  'cheesecake factory': 'The Cheesecake Factory',
  'maestro': 'Maestro Pizza',
  'maestro pizza': 'Maestro Pizza',
  "barn's": "Barn's",
  'barns': "Barn's",

  // Delivery
  'hungerstation': 'HungerStation',
  'hunger station': 'HungerStation',
  'هنقرستيشن': 'HungerStation',
  'هنقر ستيشن': 'HungerStation',
  'jahez': 'Jahez',
  'toyou': 'ToYou',
  'to you': 'ToYou',
  'mrsool': 'Mrsool',
  'talabat': 'Talabat',

  // Ride-hailing
  'uber': 'Uber',
  'careem': 'Careem',
  'bolt': 'Bolt',

  // E-commerce
  'amzn': 'Amazon',
  'amazon': 'Amazon',
  'noon': 'Noon',
  'shein': 'SHEIN',
  'namshi': 'Namshi',
  'temu': 'Temu',
  'aliexpress': 'AliExpress',
  'ali express': 'AliExpress',
  'jarir': 'Jarir',
  'extra': 'Extra',

  // Fashion
  'zara': 'Zara',
  'h&m': 'H&M',
  'nike': 'Nike',
  'adidas': 'Adidas',
  'skechers': 'Skechers',
  'max fashion': 'Max Fashion',
  'centrepoint': 'Centrepoint',
  'sephora': 'Sephora',
  'bath and body works': 'Bath & Body Works',
  'bath & body': 'Bath & Body Works',
  'splash': 'Splash',
  'ounass': 'Ounass',

  // Subscriptions
  'nflx': 'Netflix',
  'netflix': 'Netflix',
  'spotify': 'Spotify',
  'apple': 'Apple',
  'icloud': 'iCloud',
  'youtube': 'YouTube',
  'yt premium': 'YouTube Premium',
  'google': 'Google',
  'shahid': 'Shahid',
  'anghami': 'Anghami',
  'playstation': 'PlayStation',
  'xbox': 'Xbox',

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
  'home centre': 'Home Centre',
  'home center': 'Home Centre',
  'pottery barn': 'Pottery Barn',

  // Fuel
  'aramco': 'Aramco',
  'adnoc': 'ADNOC',

  // Healthcare
  'nahdi': 'Nahdi',
  'al dawaa': 'Al Dawaa',
  'aldawaa': 'Al Dawaa',
  'whites': 'Whites Pharmacy',

  // Fitness
  'fitness time': 'Fitness Time',
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
