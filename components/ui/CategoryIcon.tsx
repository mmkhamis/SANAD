/**
 * CategoryIcon
 *
 * Renders the correct Lucide icon for a category whose `icon` field contains
 * a kebab-case Lucide icon name (e.g. 'briefcase', 'shopping-cart').
 *
 * If the string is not a valid kebab-case identifier (e.g. it's a legacy emoji
 * from an older DB record or a user-created category), it falls back to
 * rendering the raw character(s) inside a <Text>.
 */

import React from 'react';
import {
  Activity,
  Award,
  Baby,
  Backpack,
  Banknote,
  Beef,
  Bike,
  Bitcoin,
  Bone,
  Book,
  BookHeart,
  BookOpen,
  Bot,
  Boxes,
  Briefcase,
  BriefcaseBusiness,
  Building,
  Building2,
  Bus,
  BusFront,
  Calendar,
  CalendarCheck,
  CarFront,
  Car,
  CarTaxiFront,
  ChartColumn,
  ChartLine,
  ChartPie,
  ChefHat,
  CircleHelp,
  Clapperboard,
  Cloud,
  Coffee,
  Coins,
  CreditCard,
  Croissant,
  CupSoda,
  Droplets,
  Dumbbell,
  FileText,
  Film,
  Fish,
  Flame,
  FlaskConical,
  Flower2,
  Footprints,
  Fuel,
  Gamepad2,
  Gem,
  Gift,
  Globe,
  GraduationCap,
  Hammer,
  HandCoins,
  HandHeart,
  Heart,
  HeartHandshake,
  HeartPulse,
  Home,
  Hospital,
  Hotel,
  Hourglass,
  IceCreamCone,
  Key,
  Lamp,
  Landmark,
  Laptop,
  Leaf,
  Megaphone,
  Monitor,
  MonitorCog,
  MonitorPlay,
  Moon,
  MoonStar,
  Music,
  Music2,
  Music4,
  OctagonAlert,
  Package,
  Palette,
  Paperclip,
  PartyPopper,
  ParkingMeter,
  PawPrint,
  ChartPie as PieChart,
  PiggyBank,
  Pill,
  Plane,
  PlaneTakeoff,
  PlusCircle,
  Receipt,
  ReceiptText,
  Refrigerator,
  Repeat,
  RotateCcw,
  Scale,
  Scissors,
  School,
  ScrollText,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldEllipsis,
  ShieldPlus,
  ShoppingBag,
  ShoppingCart,
  Smile,
  SmilePlus,
  Smartphone,
  SmartphoneNfc,
  Sofa,
  SprayCan,
  Sparkles,
  Stethoscope,
  Store,
  Ticket,
  ToyBrick,
  TrainFront,
  TrendingUp,
  TriangleAlert,
  Truck,
  Tv,
  UserRound,
  Users,
  UsersRound,
  Utensils,
  Wallet,
  WalletCards,
  WashingMachine,
  Watch,
  Wifi,
  Wrench,
  Youtube,
  Zap,
  type LucideProps,
} from 'lucide-react-native';

// ─── Icon Map ─────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  // Income
  'wallet': Wallet,
  'briefcase': Briefcase,
  'briefcase-business': BriefcaseBusiness,
  'award': Award,
  'laptop': Laptop,
  'store': Store,
  'building-2': Building2,
  'chart-column': ChartColumn,
  'hand-coins': HandCoins,
  'gift': Gift,
  'rotate-ccw': RotateCcw,
  'plus-circle': PlusCircle,

  // Bills & Utilities
  'receipt': Receipt,
  'receipt-text': ReceiptText,
  'zap': Zap,
  'droplets': Droplets,
  'flame': Flame,
  'wifi': Wifi,
  'smartphone': Smartphone,
  'smartphone-nfc': SmartphoneNfc,
  'tv': Tv,
  'building': Building,
  'landmark': Landmark,

  // Housing / Home
  'house': Home,
  'house-plus': Home,
  'key': Key,
  'hammer': Hammer,
  'sofa': Sofa,
  'refrigerator': Refrigerator,
  'spray-can': SprayCan,
  'lamp': Lamp,
  'shield': Shield,
  'user-round': UserRound,

  // Food & Dining
  'utensils-crossed': Utensils,
  'utensils': Utensils,
  'shopping-cart': ShoppingCart,
  'croissant': Croissant,
  'fish': Fish,
  'chef-hat': ChefHat,
  'coffee': Coffee,
  'bike': Bike,
  'ice-cream-cone': IceCreamCone,
  'cup-soda': CupSoda,
  'beef': Beef,

  // Transport
  'car': Car,
  'car-front': CarFront,
  'car-taxi-front': CarTaxiFront,
  'fuel': Fuel,
  'bus': Bus,
  'bus-front': BusFront,
  'parking-circle': ParkingMeter,
  'train-front': TrainFront,
  'plane': Plane,
  'plane-takeoff': PlaneTakeoff,
  'road': Globe,
  'wrench': Wrench,
  'shield-check': ShieldCheck,
  'scroll-text': ScrollText,
  'file-badge': ScrollText,

  // Shopping
  'shopping-bag': ShoppingBag,
  'footprints': Footprints,
  'gem': Gem,
  'watch': Watch,
  'package': Package,

  // Health
  'heart-pulse': HeartPulse,
  'stethoscope': Stethoscope,
  'pill': Pill,
  'flask-conical': FlaskConical,
  'hospital': Hospital,
  'smile-plus': SmilePlus,
  'activity': Activity,
  'shield-plus': ShieldPlus,

  // Education
  'graduation-cap': GraduationCap,
  'school': School,
  'building-library': BookOpen,
  'book-open': BookOpen,
  'book': Book,
  'book-heart': BookHeart,
  'file-pen-line': FileText,
  'languages': Globe,

  // Family & Children
  'users': Users,
  'baby': Baby,
  'banknote': Banknote,
  'hand-heart': HandHeart,
  'backpack': Backpack,
  'toy-brick': ToyBrick,
  'heart': Heart,
  'heart-handshake': HeartHandshake,

  // Entertainment
  'clapperboard': Clapperboard,
  'ticket': Ticket,
  'gamepad-2': Gamepad2,
  'palette': Palette,
  'sparkles': Sparkles,
  'dumbbell': Dumbbell,
  'party-popper': PartyPopper,
  'washing-machine': WashingMachine,

  // Digital Subscriptions
  'monitor-play': MonitorPlay,
  'monitor-cog': MonitorCog,
  'film': Film,
  'music-4': Music4,
  'music': Music,
  'music-2': Music2,
  'youtube': Youtube,
  'cloud': Cloud,
  'bot': Bot,
  'shield-ellipsis': ShieldEllipsis,
  'globe': Globe,

  // Savings & Goals
  'piggy-bank': PiggyBank,
  'shield-alert': ShieldAlert,
  'wallet-cards': WalletCards,
  'moon-star': MoonStar,
  'moon': Moon,

  // Investments
  'candlestick-chart': TrendingUp,
  'chart-line': ChartLine,
  'chart-pie': ChartPie,
  'bitcoin': Bitcoin,
  'coins': Coins,
  'hourglass': Hourglass,

  // Debt & Commitments
  'credit-card': CreditCard,
  'calendar-sync': CalendarCheck,
  'calendar': Calendar,
  'scale': Scale,

  // Travel
  'hotel': Hotel,
  'passport': FileText,

  // Religion / Charity
  'flower-2': Flower2,

  // Business
  'paperclip': Paperclip,
  'megaphone': Megaphone,
  'truck': Truck,
  'users-round': UsersRound,
  'boxes': Boxes,

  // Pets
  'paw-print': PawPrint,
  'bone': Bone,
  'scissors': Scissors,

  // Misc
  'octagon-alert': OctagonAlert,
  'triangle-alert': TriangleAlert,
  'circle-help': CircleHelp,
  'file-text': FileText,

  // Transfers
  'arrow-left-right': Repeat,
  'repeat': Repeat,
  'refresh-cw': RotateCcw,

  // ─── Aliases (taxonomy names → closest Lucide match) ──────────────────
  // Food & Dining
  'restaurant': Utensils,
  'restaurants': Utensils,
  'cafe': Coffee,
  'latte': Coffee,
  'bakery': Croissant,
  'bread': Croissant,
  'dessert': IceCreamCone,
  'snacks': IceCreamCone,
  'drinks': CupSoda,
  'juice': CupSoda,
  'meat': Beef,
  'seafood': Fish,
  'dish': Utensils,
  'iftar': Utensils,
  'suhoor': Utensils,
  'groceries': ShoppingCart,
  'supermarket': ShoppingCart,
  'cigarette': Flame,
  'cigarettes': Flame,
  'shisha': Flame,

  // Transport / Ride-hailing
  'taxi': CarTaxiFront,
  'uber': CarTaxiFront,
  'careem': CarTaxiFront,
  'jahez': CarTaxiFront,
  'marsool': CarTaxiFront,
  'ekar': Car,
  'udrive': Car,
  'theeb': Car,
  'gas': Fuel,
  'petrol': Fuel,
  'diesel': Fuel,
  'oil': Fuel,
  'gallon': Fuel,
  'parking': ParkingMeter,
  'toll': ParkingMeter,
  'tolls': ParkingMeter,
  'salik': ParkingMeter,
  'metro': TrainFront,
  'tram': TrainFront,
  'train': TrainFront,
  'flight': Plane,
  'flights': Plane,
  'boarding': Plane,
  'delivery': Truck,
  'shipping': Truck,
  'courier': Truck,
  'transport': Bus,

  // Shopping / Retail
  'accessories': ShoppingBag,
  'bag': ShoppingBag,
  'clothes': ShoppingBag,
  'fashion': ShoppingBag,
  'jewelry': Gem,
  'shirt': ShoppingBag,
  'shoes': Footprints,
  'sneakers': Footprints,
  'watches': Watch,
  'smartwatch': Watch,
  'glasses': Gem,
  'retail': ShoppingBag,
  'shopping': ShoppingBag,
  'furniture': Sofa,
  'appliances': WashingMachine,
  'electronics': Monitor,
  'decor': Lamp,
  'stationery': Paperclip,
  'books': Book,
  'crafts': Palette,
  'hobbies': Palette,
  'hobby': Palette,
  'gifts': Gift,
  'present': Gift,
  'eidiya': Gift,
  'souvenirs': Gift,

  // Health & Wellness
  'clinic': Stethoscope,
  'doctor': Stethoscope,
  'dentist': Smile,
  'dental': Smile,
  'optician': Gem,
  'optometrist': Gem,
  'physio': HeartPulse,
  'nurse': HeartPulse,
  'pharmacy': Pill,
  'medicine': Pill,
  'medicines': Pill,
  'lab': FlaskConical,
  'therapy': HeartPulse,
  'emergency': ShieldAlert,

  // Personal care / Beauty
  'barber': Scissors,
  'salon': Scissors,
  'grooming': Scissors,
  'beauty': Sparkles,
  'skincare': Sparkles,
  'manicure': Sparkles,
  'pedicure': Sparkles,
  'nail': Sparkles,
  'spa': Sparkles,
  'laundry': WashingMachine,
  'ironing': WashingMachine,
  'toiletries': SprayCan,

  // Education
  'college': GraduationCap,
  'university': GraduationCap,
  'tuition': GraduationCap,
  'tutor': BookOpen,
  'tutoring': BookOpen,
  'lesson': BookOpen,
  'course': BookOpen,
  'training': BookOpen,

  // Family / Kids
  'childcare': Baby,
  'babysitter': Baby,
  'nanny': Baby,
  'maid': UserRound,
  'housekeeper': UserRound,
  'driver': UserRound,
  'diapers': Baby,
  'maternity': Baby,
  'pregnancy': Baby,

  // Entertainment
  'cinema': Film,
  'movie': Film,
  'concert': Music,
  'club': Music,
  'hangout': PartyPopper,
  'outing': PartyPopper,
  'occasion': PartyPopper,
  'gaming': Gamepad2,
  'xbox': Gamepad2,
  'playstation': Gamepad2,
  'gym': Dumbbell,

  // Subscriptions / Digital
  'netflix': MonitorPlay,
  'shahid': MonitorPlay,
  'anghami': Music4,
  'spotify': Music4,
  'icloud': Cloud,
  'onedrive': Cloud,
  'dropbox': Cloud,
  'storage': Cloud,
  'adobe': Palette,
  'photoshop': Palette,
  'illustrator': Palette,
  'designer': Palette,
  'microsoft': MonitorCog,
  'software': MonitorCog,
  'saas': MonitorCog,
  'chatgpt': Bot,
  'openai': Bot,
  'claude': Bot,
  'gemini': Bot,
  'vpn': ShieldEllipsis,
  'nordvpn': ShieldEllipsis,
  'expressvpn': ShieldEllipsis,
  'internet': Wifi,
  'fiber': Wifi,
  'broadband': Wifi,
  'phone': Smartphone,
  'landline': Smartphone,
  'mobile': Smartphone,
  'sim': Smartphone,
  'recharge': Smartphone,
  'satellite': Cloud,
  'cctv': ShieldCheck,
  'security': Shield,

  // Bills / Utilities
  'electricity': Zap,
  'water': Droplets,
  'rent': Key,
  'mortgage': Home,
  'lease': Key,
  'fee': Receipt,
  'tax': Receipt,
  'fine': Receipt,
  'penalty': Receipt,
  'damage': OctagonAlert,

  // Income / Finance
  'salary': Briefcase,
  'wage': Briefcase,
  'payroll': Briefcase,
  'revenue': ChartLine,
  'commission': HandCoins,
  'bonus': Gift,
  'incentive': Gift,
  'freelance': Laptop,
  'consultant': Briefcase,
  'partnership': Users,
  'profit': TrendingUp,
  'dividend': Coins,
  'yield': Coins,
  'shares': ChartLine,
  'etf': ChartLine,
  'fund': ChartLine,
  'stocks': ChartLine,
  'crypto': Bitcoin,
  'usdt': Bitcoin,
  'gold': Coins,
  'silver': Coins,
  'cashback': RotateCcw,
  'refund': RotateCcw,
  'rebate': RotateCcw,
  'coupon': Ticket,
  'pension': Hourglass,
  'retirement': Hourglass,
  'savings': PiggyBank,
  'allowance': HandCoins,
  'allowances': HandCoins,
  'loss': OctagonAlert,
  'installment': CreditCard,
  'atm': CreditCard,
  'tabby': CreditCard,
  'tamara': CreditCard,
  'fawry': CreditCard,

  // Charity / Religion
  'alimony': HandHeart,
  'charity': HandHeart,
  'donation': HandHeart,
  'sadaqah': HandHeart,
  'zakat': HandHeart,
  'udhiya': HandHeart,
  'qurbani': HandHeart,
  'ramadan': MoonStar,
  'hajj': MoonStar,
  'umrah': MoonStar,

  // KSA Gov / Admin
  'absher': ShieldCheck,
  'nafath': ShieldCheck,
  'tawakkalna': ShieldCheck,
  'qiwa': FileText,
  'mudad': FileText,
  'muqeem': FileText,
  'musaned': FileText,
  'baladiya': Landmark,
  'sahel': ShieldCheck,
  'ksa': Landmark,
  'gulf': Landmark,
  'egypt': Landmark,
  'registration': FileText,
  'court': Landmark,
  'gosi': ShieldPlus,

  // Delivery / Food apps
  'talabat': Utensils,
  'hungerstation': Utensils,
  'elmenus': Utensils,
  'deliveroo': Utensils,

  // Pets
  'vet': PawPrint,
  'veterinary': PawPrint,

  // Travel
  'hotels': Hotel,
  'resort': Hotel,

  // Business / Work
  'accountant': Calendar,
  'marketing': Megaphone,
  'ads': Megaphone,
  'coworking': Building2,
  'analysis': ChartPie,

  // Misc / Uncategorized
  'other': CircleHelp,
  'uncategorized': CircleHelp,
  'miscellaneous': CircleHelp,
  'general': CircleHelp,
  'unexpected': OctagonAlert,
  'service': Wrench,
  'repairs': Wrench,
};

// ─── Emoji → Lucide fallback ─────────────────────────────────────────────────
// Legacy DB rows (user-created categories, pre-migration-032 rows, seeded
// category_groups from older migrations) still store emoji icons. Instead of
// rendering them as raw text, map each emoji to its closest Lucide icon so the
// UI stays consistent across categories (no mix of emoji + line icons).

const EMOJI_TO_LUCIDE: Record<string, string> = {
  // Finance / money
  '💰': 'wallet',
  '💵': 'banknote',
  '💴': 'banknote',
  '💶': 'banknote',
  '💷': 'banknote',
  '💳': 'credit-card',
  '🏦': 'landmark',
  '🪙': 'coins',
  '💎': 'gem',
  '📈': 'chart-line',
  '📉': 'chart-line',
  '📊': 'chart-pie',
  '👑': 'gem',

  // Home / housing
  '🏠': 'house',
  '🏡': 'house',
  '🛋️': 'sofa',
  '🛏️': 'lamp',
  '🧹': 'spray-can',
  '🧺': 'washing-machine',

  // Bills / utilities
  '⚡': 'zap',
  '💡': 'zap',
  '💧': 'droplets',
  '🔥': 'flame',
  '📡': 'wifi',
  '📶': 'wifi',
  '📱': 'smartphone',
  '📞': 'smartphone',
  '☎️': 'smartphone',
  '📺': 'tv',
  '🧾': 'receipt',
  '🏛️': 'landmark',
  '🔌': 'zap',

  // Food / dining
  '🍽️': 'utensils-crossed',
  '🍴': 'utensils',
  '🍕': 'utensils',
  '🍔': 'utensils',
  '🥗': 'utensils',
  '🥘': 'utensils',
  '🍞': 'croissant',
  '🥐': 'croissant',
  '🥖': 'croissant',
  '🍰': 'ice-cream-cone',
  '🍦': 'ice-cream-cone',
  '🍨': 'ice-cream-cone',
  '🍩': 'ice-cream-cone',
  '🍪': 'ice-cream-cone',
  '🍫': 'ice-cream-cone',
  '🍬': 'ice-cream-cone',
  '🥤': 'cup-soda',
  '🧃': 'cup-soda',
  '🥛': 'cup-soda',
  '☕': 'coffee',
  '🫖': 'coffee',
  '🥩': 'beef',
  '🍗': 'beef',
  '🐟': 'fish',
  '🐠': 'fish',
  '👨‍🍳': 'chef-hat',
  '🛒': 'shopping-cart',

  // Transport
  '🚗': 'car',
  '🚙': 'car',
  '🚕': 'car-taxi-front',
  '🚌': 'bus',
  '🚎': 'bus',
  '🚐': 'bus',
  '🚋': 'train-front',
  '🚆': 'train-front',
  '🚇': 'train-front',
  '🚊': 'train-front',
  '⛽': 'fuel',
  '🛢️': 'fuel',
  '🅿️': 'parking-circle',
  '🛣️': 'parking-circle',
  '🛵': 'bike',
  '🏍️': 'bike',
  '🚲': 'bike',
  '✈️': 'plane',
  '🛫': 'plane-takeoff',
  '🛬': 'plane',
  '🚚': 'truck',
  '🚛': 'truck',

  // Shopping / retail / fashion
  '🛍️': 'shopping-bag',
  '👜': 'shopping-bag',
  '👛': 'shopping-bag',
  '🎒': 'backpack',
  '👔': 'shopping-bag',
  '👕': 'shopping-bag',
  '👗': 'shopping-bag',
  '👟': 'footprints',
  '👠': 'footprints',
  '👞': 'footprints',
  '🥿': 'footprints',
  '⌚': 'watch',
  '💍': 'gem',
  '💻': 'laptop',
  '🖥️': 'monitor',
  '📦': 'package',

  // Health / wellness
  '❤️': 'heart',
  '💗': 'heart',
  '🫀': 'heart-pulse',
  '🏥': 'hospital',
  '⚕️': 'stethoscope',
  '🩺': 'stethoscope',
  '💊': 'pill',
  '🧪': 'flask-conical',
  '😁': 'smile-plus',
  '🦷': 'smile-plus',
  '💆': 'sparkles',
  '💇': 'scissors',
  '✂️': 'scissors',
  '💅': 'sparkles',
  '🧖': 'sparkles',
  '🧴': 'spray-can',
  '🛁': 'droplets',
  '🚿': 'droplets',

  // Education
  '🎓': 'graduation-cap',
  '🏫': 'school',
  '📚': 'book-open',
  '📖': 'book',
  '📝': 'file-pen-line',
  '🖊️': 'file-pen-line',
  '🗣️': 'globe',

  // Family / kids
  '👨‍👩‍👧‍👦': 'users',
  '👨‍👩‍👧': 'users',
  '👨‍👩‍👦': 'users',
  '👶': 'baby',
  '🧒': 'baby',
  '🧸': 'toy-brick',
  '🎈': 'party-popper',

  // Entertainment / lifestyle
  '🎬': 'clapperboard',
  '🎞️': 'film',
  '🎥': 'film',
  '🎟️': 'ticket',
  '🎫': 'ticket',
  '🎮': 'gamepad-2',
  '🕹️': 'gamepad-2',
  '🎨': 'palette',
  '🎭': 'palette',
  '🎪': 'party-popper',
  '🎉': 'party-popper',
  '🎊': 'party-popper',
  '🏋️': 'dumbbell',
  '⚽': 'dumbbell',
  '🏀': 'dumbbell',
  '🎵': 'music',
  '🎶': 'music',
  '🎧': 'music-4',
  '🎤': 'music-2',

  // Subscriptions / digital
  '🔄': 'smartphone-nfc',
  '☁️': 'cloud',
  '🤖': 'bot',
  '🛡️': 'shield',
  '🔒': 'shield-check',
  '🔐': 'shield-check',

  // Savings / goals
  '🐷': 'piggy-bank',
  '🐖': 'piggy-bank',
  '🎯': 'piggy-bank',
  '🏆': 'award',
  '🎖️': 'award',

  // Travel
  '🏖️': 'plane',
  '🏝️': 'plane',
  '🗺️': 'globe',
  '🌍': 'globe',
  '🌎': 'globe',
  '🌏': 'globe',
  '🏨': 'hotel',
  '🛎️': 'hotel',
  '🧳': 'shopping-bag',
  '🕌': 'moon-star',
  '🌙': 'moon',

  // Religion / charity / social
  '🙏': 'heart-handshake',
  '🤝': 'hand-coins',
  '🎁': 'gift',
  '💐': 'flower-2',

  // Business / work
  '💼': 'briefcase',
  '📎': 'paperclip',
  '📢': 'megaphone',
  '📣': 'megaphone',

  // Pets
  '🐶': 'paw-print',
  '🐱': 'paw-print',
  '🐾': 'paw-print',
  '🦴': 'bone',

  // Misc / uncategorized
  '❓': 'circle-help',
  '❔': 'circle-help',
  '⚠️': 'triangle-alert',
  '❗': 'octagon-alert',
  '📄': 'file-text',
  '📁': 'boxes',
  '📂': 'boxes',

  // Transfers / income-ish
  '↔️': 'arrow-left-right',
  '🔁': 'repeat',
  '🔂': 'repeat',
  '➕': 'plus-circle',
  '🎁‍': 'gift',
};

/** Map any leading emoji codepoint to its Lucide name, if known. */
function resolveEmojiToLucide(raw: string): string | null {
  if (!raw) return null;
  // Exact match first (handles multi-codepoint family emoji like 👨‍👩‍👧‍👦)
  if (EMOJI_TO_LUCIDE[raw]) return EMOJI_TO_LUCIDE[raw];
  // Fall back to first grapheme (strip variation selectors / ZWJ tails)
  const codepoints = Array.from(raw);
  for (let len = Math.min(4, codepoints.length); len > 0; len--) {
    const candidate = codepoints.slice(0, len).join('');
    if (EMOJI_TO_LUCIDE[candidate]) return EMOJI_TO_LUCIDE[candidate];
  }
  return null;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface CategoryIconProps {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function CategoryIcon({
  name,
  size = 20,
  color = '#94A3B8',
  strokeWidth = 1.8,
}: CategoryIconProps): React.ReactElement {
  // Kebab-case lucide name
  if (name && /^[a-z][a-z0-9-]*$/.test(name)) {
    const Icon = ICON_MAP[name] ?? CircleHelp;
    return <Icon size={size} color={color} strokeWidth={strokeWidth} />;
  }

  // Legacy emoji → try to map to a Lucide icon for consistency
  const lucideName = resolveEmojiToLucide(name);
  if (lucideName) {
    const Icon = ICON_MAP[lucideName] ?? CircleHelp;
    return <Icon size={size} color={color} strokeWidth={strokeWidth} />;
  }

  // Unknown → safe fallback icon (not raw emoji text)
  return <CircleHelp size={size} color={color} strokeWidth={strokeWidth} />;
}
