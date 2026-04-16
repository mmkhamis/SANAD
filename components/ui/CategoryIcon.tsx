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
import { Text } from 'react-native';
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
};

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
  // Legacy emoji or unknown → render as text
  if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) {
    return (
      <Text style={{ fontSize: size * 0.85, lineHeight: size }}>
        {name || '📁'}
      </Text>
    );
  }

  const Icon = ICON_MAP[name] ?? CircleHelp;
  return <Icon size={size} color={color} strokeWidth={strokeWidth} />;
}
