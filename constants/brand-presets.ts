/**
 * Brand presets — maps merchant names to logos, categories, and icons.
 *
 * Used for:
 *  1. Showing brand logos in transaction rows
 *  2. Voice transcription vocabulary hints
 *  3. Auto-categorization fallback
 *
 * logo: Google Favicon API for reliable 128px icons.
 */

const gFav = (domain: string): string =>
  `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=128`;

export interface BrandPreset {
  /** Canonical English name */
  nameEn: string;
  /** Arabic name (for display + voice recognition) */
  nameAr: string;
  /** Google favicon logo URL */
  logo: string | null;
  /** The category this brand maps to */
  category: string;
  /** Lucide icon name fallback */
  icon: string;
  /** Brand domain for favicon */
  domain: string | null;
  /** Common aliases used in voice/text (lowercase) */
  aliases: string[];
}

// ─── Fast Food & Restaurants ─────────────────────────────────────────

export const FOOD_BRANDS: BrandPreset[] = [
  { nameEn: "McDonald's", nameAr: 'ماكدونالدز', logo: gFav('mcdonalds.com'), category: 'Food & Dining', icon: 'beef', domain: 'mcdonalds.com', aliases: ['mac', 'mcd', 'mcdonalds', "mcdonald's", 'ماك', 'ماكدونالدز'] },
  { nameEn: 'KFC', nameAr: 'كنتاكي', logo: gFav('kfc.com'), category: 'Food & Dining', icon: 'drumstick', domain: 'kfc.com', aliases: ['kfc', 'kentucky', 'كنتاكي', 'كي اف سي'] },
  { nameEn: 'Burger King', nameAr: 'برجر كنج', logo: gFav('burgerking.com'), category: 'Food & Dining', icon: 'beef', domain: 'burgerking.com', aliases: ['burger king', 'bk', 'برجر كنج', 'برقر كنق'] },
  { nameEn: "Hardee's", nameAr: 'هارديز', logo: gFav('hardees.com'), category: 'Food & Dining', icon: 'beef', domain: 'hardees.com', aliases: ['hardees', "hardee's", 'هارديز'] },
  { nameEn: 'Starbucks', nameAr: 'ستاربكس', logo: gFav('starbucks.com'), category: 'Food & Dining', icon: 'coffee', domain: 'starbucks.com', aliases: ['starbucks', 'starbux', 'sbux', 'ستاربكس'] },
  { nameEn: 'Dunkin', nameAr: 'دانكن', logo: gFav('dunkindonuts.com'), category: 'Food & Dining', icon: 'coffee', domain: 'dunkindonuts.com', aliases: ['dunkin', "dunkin'", 'dunkin donuts', 'دانكن'] },
  { nameEn: 'Tim Hortons', nameAr: 'تيم هورتنز', logo: gFav('timhortons.com'), category: 'Food & Dining', icon: 'coffee', domain: 'timhortons.com', aliases: ['tim hortons', 'timhortons', 'تيم هورتنز'] },
  { nameEn: 'Subway', nameAr: 'صب واي', logo: gFav('subway.com'), category: 'Food & Dining', icon: 'sandwich', domain: 'subway.com', aliases: ['subway', 'صب واي', 'صبواي'] },
  { nameEn: 'Pizza Hut', nameAr: 'بيتزا هت', logo: gFav('pizzahut.com'), category: 'Food & Dining', icon: 'pizza', domain: 'pizzahut.com', aliases: ['pizza hut', 'بيتزا هت'] },
  { nameEn: "Domino's", nameAr: 'دومينوز', logo: gFav('dominos.com'), category: 'Food & Dining', icon: 'pizza', domain: 'dominos.com', aliases: ['dominos', "domino's", 'دومينوز'] },
  { nameEn: 'Shawarmer', nameAr: 'شاورمر', logo: gFav('shawarmer.com'), category: 'Food & Dining', icon: 'utensils', domain: 'shawarmer.com', aliases: ['shawarmer', 'شاورمر'] },
  { nameEn: 'Al Baik', nameAr: 'البيك', logo: gFav('albaik.com'), category: 'Food & Dining', icon: 'drumstick', domain: 'albaik.com', aliases: ['albaik', 'al baik', 'البيك'] },
  { nameEn: 'Kudu', nameAr: 'كودو', logo: gFav('kudu.com.sa'), category: 'Food & Dining', icon: 'beef', domain: 'kudu.com.sa', aliases: ['kudu', 'كودو'] },
  { nameEn: 'Herfy', nameAr: 'هرفي', logo: gFav('herfy.com'), category: 'Food & Dining', icon: 'beef', domain: 'herfy.com', aliases: ['herfy', 'هرفي'] },
  { nameEn: "Papa John's", nameAr: 'بابا جونز', logo: gFav('papajohns.com'), category: 'Food & Dining', icon: 'pizza', domain: 'papajohns.com', aliases: ['papa johns', "papa john's", 'بابا جونز'] },
  { nameEn: 'Baskin Robbins', nameAr: 'باسكن روبنز', logo: gFav('baskinrobbins.com'), category: 'Food & Dining', icon: 'ice-cream-cone', domain: 'baskinrobbins.com', aliases: ['baskin robbins', 'باسكن روبنز'] },
  { nameEn: 'Krispy Kreme', nameAr: 'كرسبي كريم', logo: gFav('krispykreme.com'), category: 'Food & Dining', icon: 'donut', domain: 'krispykreme.com', aliases: ['krispy kreme', 'كرسبي كريم'] },
  { nameEn: 'The Cheesecake Factory', nameAr: 'تشيز كيك فاكتوري', logo: gFav('thecheesecakefactory.com'), category: 'Food & Dining', icon: 'cake-slice', domain: 'thecheesecakefactory.com', aliases: ['cheesecake factory', 'تشيز كيك فاكتوري'] },
  { nameEn: 'Barn\'s', nameAr: 'بارنز', logo: gFav('barnscafe.com'), category: 'Food & Dining', icon: 'coffee', domain: 'barnscafe.com', aliases: ['barns', "barn's", 'بارنز'] },
  { nameEn: 'Maestro Pizza', nameAr: 'مايسترو بيتزا', logo: gFav('maestropizza.com'), category: 'Food & Dining', icon: 'pizza', domain: 'maestropizza.com', aliases: ['maestro pizza', 'maestro', 'مايسترو', 'مايسترو بيتزا'] },
];

// ─── Delivery & Ride-Hailing ─────────────────────────────────────────

export const DELIVERY_BRANDS: BrandPreset[] = [
  { nameEn: 'HungerStation', nameAr: 'هنقرستيشن', logo: gFav('hungerstation.com'), category: 'Food & Dining', icon: 'bike', domain: 'hungerstation.com', aliases: ['hungerstation', 'hunger station', 'هنقرستيشن'] },
  { nameEn: 'Jahez', nameAr: 'جاهز', logo: gFav('jahez.net'), category: 'Food & Dining', icon: 'bike', domain: 'jahez.net', aliases: ['jahez', 'جاهز'] },
  { nameEn: 'ToYou', nameAr: 'تويو', logo: gFav('toyou.io'), category: 'Food & Dining', icon: 'bike', domain: 'toyou.io', aliases: ['toyou', 'to you', 'تويو'] },
  { nameEn: 'Talabat', nameAr: 'طلبات', logo: gFav('talabat.com'), category: 'Food & Dining', icon: 'bike', domain: 'talabat.com', aliases: ['talabat', 'طلبات'] },
  { nameEn: 'Uber', nameAr: 'أوبر', logo: gFav('uber.com'), category: 'Transportation', icon: 'car', domain: 'uber.com', aliases: ['uber', 'أوبر'] },
  { nameEn: 'Uber Eats', nameAr: 'أوبر إيتس', logo: gFav('ubereats.com'), category: 'Food & Dining', icon: 'bike', domain: 'ubereats.com', aliases: ['uber eats', 'أوبر إيتس'] },
  { nameEn: 'Careem', nameAr: 'كريم', logo: gFav('careem.com'), category: 'Transportation', icon: 'car', domain: 'careem.com', aliases: ['careem', 'كريم'] },
  { nameEn: 'Bolt', nameAr: 'بولت', logo: gFav('bolt.eu'), category: 'Transportation', icon: 'car', domain: 'bolt.eu', aliases: ['bolt', 'بولت'] },
  { nameEn: 'Mrsool', nameAr: 'مرسول', logo: gFav('mrsool.co'), category: 'Food & Dining', icon: 'bike', domain: 'mrsool.co', aliases: ['mrsool', 'مرسول'] },
];

// ─── Groceries & Supermarkets ────────────────────────────────────────

export const GROCERY_BRANDS: BrandPreset[] = [
  { nameEn: 'Carrefour', nameAr: 'كارفور', logo: gFav('carrefour.com'), category: 'Groceries', icon: 'shopping-cart', domain: 'carrefour.com', aliases: ['carrefour', 'karfour', 'carfour', 'carefour', 'كارفور'] },
  { nameEn: 'Tamimi Markets', nameAr: 'أسواق التميمي', logo: gFav('tamimimarkets.com'), category: 'Groceries', icon: 'shopping-cart', domain: 'tamimimarkets.com', aliases: ['tamimi', 'التميمي', 'أسواق التميمي'] },
  { nameEn: 'Panda', nameAr: 'بنده', logo: gFav('pfranchise.com'), category: 'Groceries', icon: 'shopping-cart', domain: 'pfranchise.com', aliases: ['panda', 'بنده', 'بندة'] },
  { nameEn: 'Danube', nameAr: 'الدانوب', logo: gFav('danube.sa'), category: 'Groceries', icon: 'shopping-cart', domain: 'danube.sa', aliases: ['danube', 'الدانوب', 'دانوب'] },
  { nameEn: 'LuLu Hypermarket', nameAr: 'لولو هايبرماركت', logo: gFav('luluhypermarket.com'), category: 'Groceries', icon: 'shopping-cart', domain: 'luluhypermarket.com', aliases: ['lulu', 'لولو'] },
  { nameEn: 'Farm Superstores', nameAr: 'المزرعة', logo: gFav('farm.com.sa'), category: 'Groceries', icon: 'shopping-cart', domain: 'farm.com.sa', aliases: ['farm', 'المزرعة'] },
  { nameEn: 'Spinneys', nameAr: 'سبينيس', logo: gFav('spinneys.com'), category: 'Groceries', icon: 'shopping-cart', domain: 'spinneys.com', aliases: ['spinneys', 'spinney', 'سبينيس'] },
  { nameEn: 'Bin Dawood', nameAr: 'بن داود', logo: gFav('bindawood.com'), category: 'Groceries', icon: 'shopping-cart', domain: 'bindawood.com', aliases: ['bin dawood', 'bindawood', 'بن داود'] },
  { nameEn: 'Othaim', nameAr: 'العثيم', logo: gFav('othaimmarkets.com'), category: 'Groceries', icon: 'shopping-cart', domain: 'othaimmarkets.com', aliases: ['othaim', 'العثيم'] },
  { nameEn: 'Nesto', nameAr: 'نستو', logo: gFav('nestogroup.com'), category: 'Groceries', icon: 'shopping-cart', domain: 'nestogroup.com', aliases: ['nesto', 'نستو'] },
];

// ─── E-commerce & Shopping ───────────────────────────────────────────

export const SHOPPING_BRANDS: BrandPreset[] = [
  { nameEn: 'Amazon', nameAr: 'أمازون', logo: gFav('amazon.sa'), category: 'Shopping', icon: 'shopping-bag', domain: 'amazon.sa', aliases: ['amazon', 'amzn', 'أمازون'] },
  { nameEn: 'Noon', nameAr: 'نون', logo: gFav('noon.com'), category: 'Shopping', icon: 'shopping-bag', domain: 'noon.com', aliases: ['noon', 'نون'] },
  { nameEn: 'SHEIN', nameAr: 'شي إن', logo: gFav('shein.com'), category: 'Shopping', icon: 'shirt', domain: 'shein.com', aliases: ['shein', 'شي إن', 'شي ان'] },
  { nameEn: 'Namshi', nameAr: 'نمشي', logo: gFav('namshi.com'), category: 'Shopping', icon: 'shirt', domain: 'namshi.com', aliases: ['namshi', 'نمشي'] },
  { nameEn: 'Temu', nameAr: 'تيمو', logo: gFav('temu.com'), category: 'Shopping', icon: 'shopping-bag', domain: 'temu.com', aliases: ['temu', 'تيمو'] },
  { nameEn: 'AliExpress', nameAr: 'علي إكسبرس', logo: gFav('aliexpress.com'), category: 'Shopping', icon: 'shopping-bag', domain: 'aliexpress.com', aliases: ['aliexpress', 'ali express', 'علي إكسبرس'] },
  { nameEn: 'Jarir', nameAr: 'جرير', logo: gFav('jarir.com'), category: 'Shopping', icon: 'book-open', domain: 'jarir.com', aliases: ['jarir', 'جرير'] },
  { nameEn: 'Extra', nameAr: 'اكسترا', logo: gFav('extra.com'), category: 'Shopping', icon: 'monitor', domain: 'extra.com', aliases: ['extra', 'اكسترا'] },
];

// ─── Fashion ─────────────────────────────────────────────────────────

export const FASHION_BRANDS: BrandPreset[] = [
  { nameEn: 'Zara', nameAr: 'زارا', logo: gFav('zara.com'), category: 'Fashion & Clothing', icon: 'shirt', domain: 'zara.com', aliases: ['zara', 'زارا'] },
  { nameEn: 'H&M', nameAr: 'اتش اند ام', logo: gFav('hm.com'), category: 'Fashion & Clothing', icon: 'shirt', domain: 'hm.com', aliases: ['h&m', 'hm', 'اتش اند ام'] },
  { nameEn: 'Nike', nameAr: 'نايكي', logo: gFav('nike.com'), category: 'Fashion & Clothing', icon: 'shirt', domain: 'nike.com', aliases: ['nike', 'نايك', 'نايكي'] },
  { nameEn: 'Adidas', nameAr: 'أديداس', logo: gFav('adidas.com'), category: 'Fashion & Clothing', icon: 'shirt', domain: 'adidas.com', aliases: ['adidas', 'أديداس'] },
  { nameEn: 'Skechers', nameAr: 'سكيتشرز', logo: gFav('skechers.com'), category: 'Fashion & Clothing', icon: 'footprints', domain: 'skechers.com', aliases: ['skechers', 'سكيتشرز'] },
  { nameEn: 'Max Fashion', nameAr: 'ماكس فاشن', logo: gFav('maxfashion.com'), category: 'Fashion & Clothing', icon: 'shirt', domain: 'maxfashion.com', aliases: ['max', 'max fashion', 'ماكس'] },
  { nameEn: 'Ounass', nameAr: 'أوناس', logo: gFav('ounass.com'), category: 'Fashion & Clothing', icon: 'shirt', domain: 'ounass.com', aliases: ['ounass', 'أوناس'] },
  { nameEn: 'Splash', nameAr: 'سبلاش', logo: gFav('splashfashions.com'), category: 'Fashion & Clothing', icon: 'shirt', domain: 'splashfashions.com', aliases: ['splash', 'سبلاش'] },
  { nameEn: 'Centrepoint', nameAr: 'سنتربوينت', logo: gFav('centrepointstores.com'), category: 'Fashion & Clothing', icon: 'shirt', domain: 'centrepointstores.com', aliases: ['centrepoint', 'سنتربوينت'] },
  { nameEn: 'Bath & Body Works', nameAr: 'باث اند بودي', logo: gFav('bathandbodyworks.com'), category: 'Fashion & Clothing', icon: 'sparkles', domain: 'bathandbodyworks.com', aliases: ['bath and body works', 'bath & body', 'باث اند بودي'] },
  { nameEn: 'Sephora', nameAr: 'سيفورا', logo: gFav('sephora.com'), category: 'Fashion & Clothing', icon: 'sparkles', domain: 'sephora.com', aliases: ['sephora', 'سيفورا'] },
];

// ─── Telecom ─────────────────────────────────────────────────────────

export const TELECOM_BRANDS: BrandPreset[] = [
  { nameEn: 'STC', nameAr: 'اس تي سي', logo: gFav('stc.com.sa'), category: 'Phone & Internet', icon: 'smartphone', domain: 'stc.com.sa', aliases: ['stc', 'اس تي سي', 'الاتصالات السعودية'] },
  { nameEn: 'Mobily', nameAr: 'موبايلي', logo: gFav('mobily.com.sa'), category: 'Phone & Internet', icon: 'smartphone', domain: 'mobily.com.sa', aliases: ['mobily', 'موبايلي'] },
  { nameEn: 'Zain', nameAr: 'زين', logo: gFav('zain.com'), category: 'Phone & Internet', icon: 'smartphone', domain: 'zain.com', aliases: ['zain', 'زين'] },
  { nameEn: 'Vodafone', nameAr: 'فودافون', logo: gFav('vodafone.com'), category: 'Phone & Internet', icon: 'smartphone', domain: 'vodafone.com', aliases: ['vodafone', 'فودافون'] },
  { nameEn: 'Etisalat', nameAr: 'اتصالات', logo: gFav('etisalat.ae'), category: 'Phone & Internet', icon: 'smartphone', domain: 'etisalat.ae', aliases: ['etisalat', 'اتصالات'] },
  { nameEn: 'du', nameAr: 'دو', logo: gFav('du.ae'), category: 'Phone & Internet', icon: 'smartphone', domain: 'du.ae', aliases: ['du', 'دو'] },
  { nameEn: 'Orange', nameAr: 'أورنج', logo: gFav('orange.com'), category: 'Phone & Internet', icon: 'smartphone', domain: 'orange.com', aliases: ['orange', 'أورنج'] },
  { nameEn: 'WE', nameAr: 'وي', logo: gFav('te.eg'), category: 'Phone & Internet', icon: 'smartphone', domain: 'te.eg', aliases: ['we', 'وي'] },
];

// ─── Subscriptions & Entertainment ───────────────────────────────────

export const SUBSCRIPTION_BRANDS: BrandPreset[] = [
  { nameEn: 'Netflix', nameAr: 'نتفلكس', logo: gFav('netflix.com'), category: 'Subscriptions', icon: 'tv', domain: 'netflix.com', aliases: ['netflix', 'nflx', 'نتفلكس'] },
  { nameEn: 'Spotify', nameAr: 'سبوتيفاي', logo: gFav('spotify.com'), category: 'Subscriptions', icon: 'music', domain: 'spotify.com', aliases: ['spotify', 'سبوتيفاي'] },
  { nameEn: 'Apple', nameAr: 'آبل', logo: gFav('apple.com'), category: 'Subscriptions', icon: 'smartphone', domain: 'apple.com', aliases: ['apple', 'آبل', 'ابل'] },
  { nameEn: 'YouTube Premium', nameAr: 'يوتيوب بريميوم', logo: gFav('youtube.com'), category: 'Subscriptions', icon: 'tv', domain: 'youtube.com', aliases: ['youtube', 'yt premium', 'يوتيوب'] },
  { nameEn: 'Shahid', nameAr: 'شاهد', logo: gFav('shahid.mbc.net'), category: 'Subscriptions', icon: 'tv', domain: 'shahid.mbc.net', aliases: ['shahid', 'شاهد'] },
  { nameEn: 'Google', nameAr: 'جوجل', logo: gFav('google.com'), category: 'Subscriptions', icon: 'globe', domain: 'google.com', aliases: ['google', 'icloud', 'جوجل'] },
  { nameEn: 'PlayStation', nameAr: 'بلايستيشن', logo: gFav('playstation.com'), category: 'Entertainment', icon: 'gamepad-2', domain: 'playstation.com', aliases: ['playstation', 'psn', 'بلايستيشن', 'بلستيشن'] },
  { nameEn: 'Xbox', nameAr: 'اكس بوكس', logo: gFav('xbox.com'), category: 'Entertainment', icon: 'gamepad-2', domain: 'xbox.com', aliases: ['xbox', 'اكس بوكس'] },
  { nameEn: 'Anghami', nameAr: 'أنغامي', logo: gFav('anghami.com'), category: 'Subscriptions', icon: 'music', domain: 'anghami.com', aliases: ['anghami', 'أنغامي'] },
];

// ─── Fuel & Transportation ───────────────────────────────────────────

export const FUEL_BRANDS: BrandPreset[] = [
  { nameEn: 'Aramco', nameAr: 'أرامكو', logo: gFav('aramco.com'), category: 'Transportation', icon: 'fuel', domain: 'aramco.com', aliases: ['aramco', 'أرامكو'] },
  { nameEn: 'ADNOC', nameAr: 'أدنوك', logo: gFav('adnoc.ae'), category: 'Transportation', icon: 'fuel', domain: 'adnoc.ae', aliases: ['adnoc', 'أدنوك'] },
  { nameEn: 'Nayel', nameAr: 'نايل', logo: null, category: 'Transportation', icon: 'fuel', domain: null, aliases: ['nayel', 'نايل'] },
  { nameEn: 'Salik', nameAr: 'سالك', logo: gFav('salik.ae'), category: 'Transportation', icon: 'car', domain: 'salik.ae', aliases: ['salik', 'سالك'] },
];

// ─── Healthcare & Pharmacy ───────────────────────────────────────────

export const HEALTH_BRANDS: BrandPreset[] = [
  { nameEn: 'Nahdi', nameAr: 'النهدي', logo: gFav('nahdionline.com'), category: 'Healthcare', icon: 'pill', domain: 'nahdionline.com', aliases: ['nahdi', 'النهدي'] },
  { nameEn: 'Al Dawaa', nameAr: 'الدواء', logo: gFav('al-dawaa.com'), category: 'Healthcare', icon: 'pill', domain: 'al-dawaa.com', aliases: ['aldawaa', 'al dawaa', 'الدواء'] },
  { nameEn: 'Whites Pharmacy', nameAr: 'صيدلية وايتس', logo: gFav('whites.sa'), category: 'Healthcare', icon: 'pill', domain: 'whites.sa', aliases: ['whites', 'وايتس'] },
];

// ─── Furniture & Home ────────────────────────────────────────────────

export const HOME_BRANDS: BrandPreset[] = [
  { nameEn: 'IKEA', nameAr: 'ايكيا', logo: gFav('ikea.com'), category: 'Home & Utilities', icon: 'sofa', domain: 'ikea.com', aliases: ['ikea', 'ايكيا'] },
  { nameEn: 'Home Centre', nameAr: 'هوم سنتر', logo: gFav('homecentre.com'), category: 'Home & Utilities', icon: 'sofa', domain: 'homecentre.com', aliases: ['home centre', 'home center', 'هوم سنتر'] },
  { nameEn: 'Pottery Barn', nameAr: 'بوتري بارن', logo: gFav('potterybarn.com'), category: 'Home & Utilities', icon: 'sofa', domain: 'potterybarn.com', aliases: ['pottery barn', 'بوتري بارن'] },
];

// ─── Education ───────────────────────────────────────────────────────

export const EDUCATION_BRANDS: BrandPreset[] = [
  { nameEn: 'Udemy', nameAr: 'يوديمي', logo: gFav('udemy.com'), category: 'Education', icon: 'graduation-cap', domain: 'udemy.com', aliases: ['udemy', 'يوديمي'] },
  { nameEn: 'Coursera', nameAr: 'كورسيرا', logo: gFav('coursera.org'), category: 'Education', icon: 'graduation-cap', domain: 'coursera.org', aliases: ['coursera', 'كورسيرا'] },
];

// ─── Fitness ─────────────────────────────────────────────────────────

export const FITNESS_BRANDS: BrandPreset[] = [
  { nameEn: 'Fitness Time', nameAr: 'فتنس تايم', logo: gFav('fitnesstime.com.sa'), category: 'Fitness & Sports', icon: 'dumbbell', domain: 'fitnesstime.com.sa', aliases: ['fitness time', 'فتنس تايم', 'وقت اللياقة'] },
  { nameEn: 'GymNation', nameAr: 'جيم نيشن', logo: gFav('gymnation.com'), category: 'Fitness & Sports', icon: 'dumbbell', domain: 'gymnation.com', aliases: ['gymnation', 'جيم نيشن'] },
];

// ─── Combined ────────────────────────────────────────────────────────

export const ALL_BRAND_PRESETS: BrandPreset[] = [
  ...FOOD_BRANDS,
  ...DELIVERY_BRANDS,
  ...GROCERY_BRANDS,
  ...SHOPPING_BRANDS,
  ...FASHION_BRANDS,
  ...TELECOM_BRANDS,
  ...SUBSCRIPTION_BRANDS,
  ...FUEL_BRANDS,
  ...HEALTH_BRANDS,
  ...HOME_BRANDS,
  ...EDUCATION_BRANDS,
  ...FITNESS_BRANDS,
];

// ─── Lookup helpers ──────────────────────────────────────────────────

/** Pre-built lowercase alias → BrandPreset index for O(1) lookups */
const ALIAS_INDEX = new Map<string, BrandPreset>();
for (const brand of ALL_BRAND_PRESETS) {
  for (const alias of brand.aliases) {
    ALIAS_INDEX.set(alias.toLowerCase(), brand);
  }
  // Also index canonical names
  ALIAS_INDEX.set(brand.nameEn.toLowerCase(), brand);
  ALIAS_INDEX.set(brand.nameAr, brand);
}

/**
 * Find a brand by merchant name, description, or any alias.
 * Returns null if no match.
 */
export function findBrand(text: string | null | undefined): BrandPreset | null {
  if (!text?.trim()) return null;
  const lower = text.trim().toLowerCase();

  // Direct alias hit
  const direct = ALIAS_INDEX.get(lower);
  if (direct) return direct;

  // Substring match: check if text contains any known alias (min 3 chars)
  for (const [alias, brand] of ALIAS_INDEX.entries()) {
    if (alias.length >= 3 && lower.includes(alias)) return brand;
  }

  return null;
}
