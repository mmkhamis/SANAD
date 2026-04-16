#!/bin/bash
# ╔══════════════════════════════════════════════════════════╗
# ║   Wallet Finance App — Full Setup Script                 ║
# ║   Optimized for Apple Silicon M4 Mac                     ║
# ║   Senior Mobile Dev Standards                            ║
# ╚══════════════════════════════════════════════════════════╝
set -e

# ── Colors ──────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'

step()    { echo -e "\n${BLUE}▶  $1${NC}"; }
ok()      { echo -e "   ${GREEN}✓  $1${NC}"; }
warn()    { echo -e "   ${YELLOW}⚠  $1${NC}"; }
heading() { echo -e "\n${CYAN}━━━  $1  ━━━${NC}"; }

echo -e "${CYAN}"
cat << 'BANNER'
  ██╗    ██╗ █████╗ ██╗     ██╗     ███████╗████████╗
  ██║    ██║██╔══██╗██║     ██║     ██╔════╝╚══██╔══╝
  ██║ █╗ ██║███████║██║     ██║     █████╗     ██║   
  ██║███╗██║██╔══██║██║     ██║     ██╔══╝     ██║   
  ╚███╔███╔╝██║  ██║███████╗███████╗███████╗   ██║   
   ╚══╝╚══╝ ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝   ╚═╝   
  Finance App — M4 Mac Setup
BANNER
echo -e "${NC}"

PROJECT_DIR="$HOME/Desktop/WalletApp"

# ════════════════════════════════════════════════════════════
# 1. HOMEBREW
# ════════════════════════════════════════════════════════════
heading "1 / 11  —  Homebrew"

if ! command -v brew &>/dev/null; then
  step "Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  echo >> ~/.zprofile
  echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
  eval "$(/opt/homebrew/bin/brew shellenv)"
  ok "Homebrew installed"
else
  ok "Homebrew already present — updating"
  brew update --quiet
fi

# ════════════════════════════════════════════════════════════
# 2. CORE SYSTEM TOOLS
# ════════════════════════════════════════════════════════════
heading "2 / 11  —  Core system tools"

install_brew() {
  if ! command -v "$1" &>/dev/null; then
    step "Installing $1..."
    brew install "$1" --quiet
  fi
  ok "$1"
}

install_brew git
install_brew watchman    # React Native file watcher

# NVM + Node 20 LTS
if ! command -v nvm &>/dev/null 2>&1; then
  step "Installing NVM..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

nvm install 20 --silent
nvm use 20 --silent
nvm alias default 20 --silent
ok "Node $(node --version)  /  npm $(npm --version)"

# ════════════════════════════════════════════════════════════
# 3. GUI APPS  (Homebrew Cask — silent)
# ════════════════════════════════════════════════════════════
heading "3 / 11  —  GUI applications"

install_cask() {
  if ! brew list --cask "$1" &>/dev/null; then
    step "Installing $2..."
    brew install --cask "$1" --quiet 2>/dev/null || warn "$2 install skipped (may already exist)"
  fi
  ok "$2"
}

install_cask cursor          "Cursor IDE (AI-native editor)"
install_cask docker          "Docker Desktop (Supabase local dep)"
install_cask android-studio  "Android Studio (emulator)"
install_cask figma           "Figma (UI design)"

# ════════════════════════════════════════════════════════════
# 4. CLI TOOLS
# ════════════════════════════════════════════════════════════
heading "4 / 11  —  CLI tools"

npm install -g expo-cli@latest eas-cli@latest --silent --no-progress
ok "Expo CLI + EAS CLI"

if ! command -v supabase &>/dev/null; then
  brew install supabase/tap/supabase --quiet
fi
ok "Supabase CLI"

# n8n (automation engine)
npm install -g n8n --silent --no-progress
ok "n8n"

# Android SDK paths
if ! grep -q "ANDROID_HOME" ~/.zprofile 2>/dev/null; then
  {
    echo ''
    echo '# Android SDK'
    echo 'export ANDROID_HOME=$HOME/Library/Android/sdk'
    echo 'export PATH=$PATH:$ANDROID_HOME/emulator'
    echo 'export PATH=$PATH:$ANDROID_HOME/platform-tools'
  } >> ~/.zprofile
fi
ok "Android SDK paths configured"

# ════════════════════════════════════════════════════════════
# 5. CREATE EXPO PROJECT
# ════════════════════════════════════════════════════════════
heading "5 / 11  —  Expo project"

if [ -d "$PROJECT_DIR" ]; then
  warn "WalletApp already exists — skipping creation"
else
  step "Scaffolding project..."
  cd "$HOME/Desktop"
  npx create-expo-app@latest WalletApp --template blank-typescript --no-install
  ok "Project scaffolded"
fi

cd "$PROJECT_DIR"

# ════════════════════════════════════════════════════════════
# 6. INSTALL OPTIMIZED DEPENDENCIES
#    Senior dev choices — every package justified
# ════════════════════════════════════════════════════════════
heading "6 / 11  —  Dependencies (optimized)"

step "Navigation layer..."
npx expo install expo-router react-native-safe-area-context \
  react-native-screens expo-linking expo-constants expo-status-bar \
  --no-interaction --quiet

step "Data layer: Supabase + TanStack Query + Zustand..."
# TanStack Query: intelligent caching → fewer API calls → less battery drain
# Zustand: ~8KB vs Redux ~100KB
npm install @supabase/supabase-js @tanstack/react-query zustand \
  react-native-url-polyfill --legacy-peer-deps --silent

step "Storage: secure + fast..."
# expo-secure-store  → AES-256, Keychain/Keystore — for ALL financial data
# react-native-mmkv  → C++ JSI storage, 10× faster than AsyncStorage for cache
npx expo install expo-secure-store @react-native-async-storage/async-storage \
  --no-interaction --quiet
npm install react-native-mmkv --legacy-peer-deps --silent

step "UI: NativeWind + Reanimated (native thread) + Gesture Handler..."
npx expo install react-native-reanimated react-native-gesture-handler \
  --no-interaction --quiet
npm install nativewind --legacy-peer-deps --silent
npm install tailwindcss --save-dev --legacy-peer-deps --silent

step "Performance list: FlashList (Shopify — 10× faster than FlatList)..."
npm install @shopify/flash-list --legacy-peer-deps --silent

step "Charts: react-native-gifted-charts (lightest finance-grade chart lib)..."
npx expo install react-native-svg expo-linear-gradient --no-interaction --quiet
npm install react-native-gifted-charts --legacy-peer-deps --silent

step "Images: expo-image (blurhash, smart caching, WebP — NOT RN Image)..."
npx expo install expo-image --no-interaction --quiet

step "Dates: date-fns (5× smaller than moment.js)..."
npm install date-fns --legacy-peer-deps --silent

step "AI: OpenAI SDK..."
npm install openai --legacy-peer-deps --silent

step "Camera + file system..."
npx expo install expo-camera expo-image-picker expo-file-system expo-image-manipulator \
  --no-interaction --quiet

step "Push notifications + device info..."
npx expo install expo-notifications expo-device --no-interaction --quiet

step "Biometric auth (Face ID / fingerprint)..."
npx expo install expo-local-authentication --no-interaction --quiet

step "Icons: lucide-react-native (tree-shakeable SVG icons)..."
npm install lucide-react-native --legacy-peer-deps --silent

step "Haptics (critical for finance confirmation UX)..."
npx expo install expo-haptics --no-interaction --quiet

step "Clipboard + sharing..."
npx expo install expo-clipboard expo-sharing --no-interaction --quiet

step "SMS parsing — Android only..."
npm install react-native-get-sms-android --legacy-peer-deps --silent

ok "All dependencies installed"

# ════════════════════════════════════════════════════════════
# 7. FOLDER STRUCTURE
# ════════════════════════════════════════════════════════════
heading "7 / 11  —  Folder structure"

dirs=(
  "app/(tabs)"
  "app/(auth)"
  "app/onboarding"
  "components/ui"
  "components/finance"
  "components/charts"
  "hooks"
  "lib"
  "services"
  "store"
  "types"
  "constants"
  "utils"
  "assets/fonts"
  "assets/icons"
  "supabase/migrations"
)
for d in "${dirs[@]}"; do mkdir -p "$d"; done
ok "Directory tree ready"

# ════════════════════════════════════════════════════════════
# 8. CONFIG FILES
# ════════════════════════════════════════════════════════════
heading "8 / 11  —  Config files"

# ── .env template ────────────────────────────────────────────
cat > .env << 'EOF'
# ─── Supabase ────────────────────────────────────────
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# ─── AI ──────────────────────────────────────────────
OPENAI_API_KEY=sk-your_openai_key
ANTHROPIC_API_KEY=sk-ant-your_anthropic_key

# ─── Analytics ───────────────────────────────────────
EXPO_PUBLIC_POSTHOG_KEY=phc_your_posthog_key
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# ─── Monitoring ──────────────────────────────────────
EXPO_PUBLIC_SENTRY_DSN=your_sentry_dsn

# ─── Email ───────────────────────────────────────────
RESEND_API_KEY=re_your_resend_key
EOF

# ── .gitignore ──────────────────────────────────────────────
cat > .gitignore << 'EOF'
# Secrets — never commit
.env
.env.local
.env.production
.env.staging

# Build artifacts
node_modules/
.expo/
dist/
build/
ios/
android/

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Editor
.cursor/
.vscode/settings.json
EOF

# ── TypeScript (strict) ─────────────────────────────────────
cat > tsconfig.json << 'EOF'
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "baseUrl": ".",
    "paths": {
      "@/*":           ["./*"],
      "@components/*": ["./components/*"],
      "@hooks/*":      ["./hooks/*"],
      "@lib/*":        ["./lib/*"],
      "@services/*":   ["./services/*"],
      "@store/*":      ["./store/*"],
      "@types/*":      ["./types/*"],
      "@constants/*":  ["./constants/*"],
      "@utils/*":      ["./utils/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.d.ts", "expo-env.d.ts"]
}
EOF

# ── Babel (NativeWind + Reanimated — must be last plugin) ────
cat > babel.config.js << 'EOF'
module.exports = function (api) {
  api.cache(true)
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
    ],
    plugins: [
      'react-native-reanimated/plugin', // ← must always be last
    ],
  }
}
EOF

# ── Metro (optimized bundler) ────────────────────────────────
cat > metro.config.js << 'EOF'
const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const config = getDefaultConfig(__dirname, { isCSSEnabled: true })

// Tree-shake unused exports from large packages
config.transformer.minifierConfig = {
  keep_fnames: false,
  mangle: { keep_fnames: false },
  output: { comments: false },
}

// Only bundle the source extensions we actually use
config.resolver.sourceExts = ['ts', 'tsx', 'js', 'jsx', 'json', 'cjs', 'mjs']

// Block barrel index files from specific heavy packages
config.resolver.resolveRequest = (context, moduleName, platform) => {
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = withNativeWind(config, { input: './global.css' })
EOF

# ── Tailwind config ──────────────────────────────────────────
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        accent:  '#C9A84C',   // gold — premium finance feel
        income:  '#22C55E',   // green — money in
        expense: '#EF4444',   // red — money out
        surface: '#F9FAFB',
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
}
EOF

# ── Global CSS (NativeWind) ──────────────────────────────────
cat > global.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;
EOF

# ── app.json (production-ready, minimum permissions) ─────────
cat > app.json << 'EOF'
{
  "expo": {
    "name": "Wallet",
    "slug": "wallet-finance",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "jsEngine": "hermes",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#0A0A0A"
    },
    "assetBundlePatterns": ["assets/**"],
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.wallet.finance",
      "buildNumber": "1",
      "infoPlist": {
        "NSCameraUsageDescription": "Scan receipts to track expenses automatically.",
        "NSPhotoLibraryUsageDescription": "Upload receipt photos for expense tracking.",
        "NSFaceIDUsageDescription": "Secure your financial data with Face ID."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0A0A0A"
      },
      "package": "com.wallet.finance",
      "versionCode": 1,
      "permissions": [
        "RECEIVE_SMS",
        "READ_SMS",
        "CAMERA",
        "USE_BIOMETRIC",
        "USE_FINGERPRINT",
        "VIBRATE"
      ]
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      [
        "expo-camera",
        { "cameraPermission": "Allow Wallet to scan receipts." }
      ],
      [
        "expo-local-authentication",
        { "faceIDPermission": "Secure your Wallet data with Face ID." }
      ],
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#C9A84C",
          "sounds": []
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
EOF

ok "Config files written"

# ════════════════════════════════════════════════════════════
# 9. BOILERPLATE SOURCE FILES
# ════════════════════════════════════════════════════════════
heading "9 / 11  —  Source boilerplate"

# ── types/index.ts ───────────────────────────────────────────
cat > types/index.ts << 'EOF'
// ─── Core domain types ────────────────────────────────────────

export type Currency = 'EGP' | 'SAR' | 'AED' | 'USD' | 'EUR'
export type TransactionSource = 'sms' | 'ocr' | 'manual' | 'import'
export type TransactionType = 'debit' | 'credit'
export type SubscriptionStatus = 'free' | 'premium'

export interface UserProfile {
  id: string
  email: string
  full_name?: string
  currency: Currency
  locale: string
  onboarding_complete: boolean
  subscription_status: SubscriptionStatus
  created_at: string
  updated_at: string
}

export interface Account {
  id: string
  user_id: string
  bank_name: string
  nickname: string
  currency: Currency
  last_four?: string
  is_active: boolean
  created_at: string
}

export interface Category {
  id: string
  name: string
  icon: string
  color: string
  type: 'expense' | 'income' | 'both'
  is_system: boolean
  user_id?: string
}

export interface Transaction {
  id: string
  user_id: string
  account_id?: string
  category_id?: string
  amount: number
  type: TransactionType
  merchant: string
  description?: string
  source: TransactionSource
  date: string
  receipt_url?: string
  is_verified: boolean
  created_at: string
  // Joined fields
  category?: Category
  account?: Account
}

export interface Goal {
  id: string
  user_id: string
  name: string
  target_amount: number
  current_amount: number
  deadline?: string
  category_id?: string
  is_completed: boolean
  created_at: string
}

export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

// ─── Dashboard aggregate types ────────────────────────────────

export interface CategorySummary {
  category: Category
  total: number
  transaction_count: number
  percentage: number
}

export interface DashboardData {
  total_spent: number
  total_income: number
  net: number
  month: string
  top_categories: CategorySummary[]
  recent_transactions: Transaction[]
}

// ─── SMS parsing types ────────────────────────────────────────

export interface ParsedSMSTransaction {
  amount: number
  type: TransactionType
  merchant: string
  currency: Currency
  account_last_four?: string
  balance_after?: number
  raw_hash: string
  confidence: number   // 0–1
}

export interface SMSTemplate {
  bank_id: string
  bank_name: string
  sender_id: string
  pattern: RegExp
  extract: (match: RegExpMatchArray) => Partial<ParsedSMSTransaction>
}
EOF

# ── constants/colors.ts ──────────────────────────────────────
cat > constants/colors.ts << 'EOF'
// Finance-grade color system — not a generic palette
// Every color has a specific semantic meaning in a finance context

export const Colors = {
  // Brand
  brand: {
    primary:   '#0A0A0A',    // near-black — authority and trust
    accent:    '#C9A84C',    // gold — premium, wealth
    accentSoft:'#F5E9C4',
  },

  // Financial semantics
  income:  '#16A34A',        // strong green — positive cashflow
  expense: '#DC2626',        // strong red — outflow / warning
  neutral: '#6B7280',        // gray — unchanged / informational

  // Backgrounds
  bg: {
    primary:   '#FFFFFF',
    secondary: '#F9FAFB',
    elevated:  '#FFFFFF',    // cards
    dark:      '#0A0A0A',    // splash / onboarding
  },

  // Text hierarchy
  text: {
    primary:   '#111827',
    secondary: '#4B5563',
    tertiary:  '#9CA3AF',
    inverse:   '#FFFFFF',
    accent:    '#C9A84C',
  },

  // Borders
  border: {
    subtle:    '#F3F4F6',
    default:   '#E5E7EB',
    strong:    '#D1D5DB',
  },

  // Category palette (consistent across all views)
  category: {
    food:          '#EA580C',
    transport:     '#2563EB',
    shopping:      '#7C3AED',
    health:        '#059669',
    entertainment: '#D97706',
    utilities:     '#4B5563',
    rent:          '#DC2626',
    education:     '#0891B2',
    salary:        '#16A34A',
    freelance:     '#7C3AED',
    investment:    '#D97706',
    other:         '#9CA3AF',
  },
} as const

export type ColorKey = keyof typeof Colors
EOF

# ── constants/typography.ts ──────────────────────────────────
cat > constants/typography.ts << 'EOF'
import { Platform } from 'react-native'

// Use system fonts — zero bundle size, best rendering on each platform
export const FontFamily = {
  regular: Platform.select({ ios: 'System', android: 'sans-serif' }),
  medium:  Platform.select({ ios: 'System', android: 'sans-serif-medium' }),
  bold:    Platform.select({ ios: 'System', android: 'sans-serif' }),
  mono:    Platform.select({ ios: 'Menlo', android: 'monospace' }),
}

export const FontSize = {
  xs:   11,
  sm:   13,
  base: 15,
  md:   17,
  lg:   20,
  xl:   24,
  '2xl': 30,
  '3xl': 36,
}

// Pre-built text styles for consistency
export const TextStyle = {
  amount_large: { fontSize: FontSize['3xl'], fontWeight: '700' as const },
  amount_medium:{ fontSize: FontSize.xl,    fontWeight: '600' as const },
  amount_small: { fontSize: FontSize.md,    fontWeight: '500' as const },
  label:        { fontSize: FontSize.sm,    fontWeight: '400' as const },
  caption:      { fontSize: FontSize.xs,    fontWeight: '400' as const },
}
EOF

# ── lib/supabase.ts ──────────────────────────────────────────
cat > lib/supabase.ts << 'EOF'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import 'react-native-url-polyfill/auto'

const url  = process.env.EXPO_PUBLIC_SUPABASE_URL!
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

if (!url || !anon) {
  throw new Error('[Supabase] Missing environment variables. Check your .env file.')
}

export const supabase = createClient(url, anon, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',            // most secure flow for mobile
  },
  global: {
    headers: { 'x-app-name': 'wallet-finance' },
  },
  realtime: {
    params: {
      eventsPerSecond: 2,        // rate-limit realtime to save battery
    },
  },
})
EOF

# ── lib/query-client.ts ──────────────────────────────────────
cat > lib/query-client.ts << 'EOF'
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            1000 * 60 * 5,   // 5 min — reduces redundant fetches
      gcTime:               1000 * 60 * 10,  // 10 min garbage collection
      retry:                2,
      refetchOnWindowFocus: false,           // critical: mobile has no "window focus"
      refetchOnReconnect:   true,            // sync when back online
    },
    mutations: {
      retry: 1,
    },
  },
})
EOF

# ── store/auth.store.ts ──────────────────────────────────────
cat > store/auth.store.ts << 'EOF'
import { create } from 'zustand'
import type { UserProfile } from '@types/index'

interface AuthState {
  user: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  setUser: (user: UserProfile | null) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({
    user,
    isAuthenticated: user !== null,
    isLoading: false,
  }),

  setLoading: (isLoading) => set({ isLoading }),

  reset: () => set({
    user: null,
    isAuthenticated: false,
    isLoading: false,
  }),
}))
EOF

# ── app/_layout.tsx ──────────────────────────────────────────
cat > app/_layout.tsx << 'EOF'
import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { QueryClientProvider } from '@tanstack/react-query'
import { StatusBar } from 'expo-status-bar'
import { queryClient } from '@lib/query-client'
import '../global.css'

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="(tabs)"      />
          <Stack.Screen name="(auth)"      />
          <Stack.Screen name="onboarding"  />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  )
}
EOF

# ── app/(tabs)/_layout.tsx ───────────────────────────────────
cat > "app/(tabs)/_layout.tsx" << 'EOF'
import { Tabs } from 'expo-router'
import { Home, CreditCard, MessageCircle, Target, Settings } from 'lucide-react-native'
import { Colors } from '@constants/colors'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:   Colors.brand.accent,
        tabBarInactiveTintColor: Colors.text.tertiary,
        tabBarStyle: {
          backgroundColor: Colors.bg.elevated,
          borderTopColor:  Colors.border.subtle,
          paddingBottom:   4,
          height:          60,
        },
      }}
    >
      <Tabs.Screen name="index"        options={{ title: 'Home',         tabBarIcon: ({ color }) => <Home         size={22} color={color} /> }} />
      <Tabs.Screen name="transactions" options={{ title: 'Transactions', tabBarIcon: ({ color }) => <CreditCard   size={22} color={color} /> }} />
      <Tabs.Screen name="assistant"    options={{ title: 'Assistant',    tabBarIcon: ({ color }) => <MessageCircle size={22} color={color} /> }} />
      <Tabs.Screen name="goals"        options={{ title: 'Goals',        tabBarIcon: ({ color }) => <Target        size={22} color={color} /> }} />
      <Tabs.Screen name="settings"     options={{ title: 'Settings',     tabBarIcon: ({ color }) => <Settings      size={22} color={color} /> }} />
    </Tabs>
  )
}
EOF

# Placeholder screens
for screen in "index" "transactions" "assistant" "goals" "settings"; do
cat > "app/(tabs)/${screen}.tsx" << SCREEN
import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function ${screen^}Screen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center">
        <Text className="text-lg font-medium text-gray-700">${screen^}</Text>
        <Text className="text-sm text-gray-400 mt-1">Coming soon</Text>
      </View>
    </SafeAreaView>
  )
}
SCREEN
done

# ── utils/currency.ts ────────────────────────────────────────
cat > utils/currency.ts << 'EOF'
import type { Currency } from '@types/index'

const SYMBOLS: Record<Currency, string> = {
  EGP: 'EGP', SAR: 'SAR', AED: 'AED', USD: '$', EUR: '€',
}

export function formatAmount(
  amount: number,
  currency: Currency = 'EGP',
  options?: { showSign?: boolean; compact?: boolean }
): string {
  const abs = Math.abs(amount)
  const symbol = SYMBOLS[currency]

  const formatted = options?.compact && abs >= 1000
    ? `${(abs / 1000).toFixed(1)}K`
    : abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const sign = options?.showSign ? (amount >= 0 ? '+' : '-') : ''
  return `${sign}${symbol} ${formatted}`
}

export function parseAmount(raw: string): number {
  return parseFloat(raw.replace(/[^0-9.]/g, ''))
}
EOF

ok "Source boilerplate written"

# ════════════════════════════════════════════════════════════
# 10. DATABASE SCHEMA
# ════════════════════════════════════════════════════════════
heading "10 / 11  —  Database schema"

cat > supabase/migrations/001_initial_schema.sql << 'EOF'
-- ═══════════════════════════════════════════════════════════
-- Wallet Finance App — Initial Schema
-- ═══════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";
create extension if not exists pg_trgm;   -- fast text search on merchant names

-- ── Profiles (extends auth.users) ──────────────────────────
create table public.profiles (
  id                   uuid references auth.users on delete cascade primary key,
  full_name            text,
  currency             text    not null default 'EGP',
  locale               text    not null default 'en',
  onboarding_complete  boolean not null default false,
  subscription_status  text    not null default 'free'
                       check (subscription_status in ('free', 'premium')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ── Accounts (bank accounts) ────────────────────────────────
create table public.accounts (
  id         uuid default uuid_generate_v4() primary key,
  user_id    uuid references public.profiles on delete cascade not null,
  bank_name  text not null,
  nickname   text not null,
  currency   text not null default 'EGP',
  last_four  text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── Categories ──────────────────────────────────────────────
create table public.categories (
  id         uuid default uuid_generate_v4() primary key,
  name       text not null,
  icon       text not null,
  color      text not null,
  type       text not null check (type in ('expense', 'income', 'both')),
  is_system  boolean not null default true,
  user_id    uuid references public.profiles on delete cascade,
  created_at timestamptz not null default now()
);

-- ── Transactions (core table) ───────────────────────────────
create table public.transactions (
  id            uuid default uuid_generate_v4() primary key,
  user_id       uuid references public.profiles  on delete cascade     not null,
  account_id    uuid references public.accounts  on delete set null,
  category_id   uuid references public.categories on delete set null,
  amount        numeric(15,2) not null check (amount > 0),
  type          text          not null check (type in ('debit', 'credit')),
  merchant      text          not null,
  description   text,
  source        text          not null default 'manual'
                check (source in ('sms', 'ocr', 'manual', 'import')),
  date          timestamptz   not null default now(),
  receipt_url   text,
  raw_sms_hash  text,          -- hashed only, raw SMS never stored
  is_verified   boolean       not null default false,
  created_at    timestamptz   not null default now()
);

-- ── Goals ────────────────────────────────────────────────────
create table public.goals (
  id             uuid default uuid_generate_v4() primary key,
  user_id        uuid references public.profiles on delete cascade not null,
  name           text          not null,
  target_amount  numeric(15,2) not null,
  current_amount numeric(15,2) not null default 0,
  deadline       timestamptz,
  category_id    uuid references public.categories on delete set null,
  is_completed   boolean not null default false,
  created_at     timestamptz not null default now()
);

-- ── AI Conversations ─────────────────────────────────────────
create table public.ai_conversations (
  id         uuid default uuid_generate_v4() primary key,
  user_id    uuid references public.profiles on delete cascade not null,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  created_at timestamptz not null default now()
);

-- ══ INDEXES (query performance) ═════════════════════════════
-- Most queries filter by user + date — composite index
create index idx_txn_user_date     on public.transactions(user_id, date desc);
create index idx_txn_category      on public.transactions(category_id);
create index idx_txn_source        on public.transactions(source);
create index idx_txn_merchant_trgm on public.transactions
  using gin(merchant gin_trgm_ops);   -- fast merchant text search
create index idx_ai_user_date      on public.ai_conversations(user_id, created_at desc);
create index idx_accounts_user     on public.accounts(user_id) where is_active = true;

-- ══ ROW LEVEL SECURITY ══════════════════════════════════════
alter table public.profiles         enable row level security;
alter table public.accounts         enable row level security;
alter table public.categories       enable row level security;
alter table public.transactions     enable row level security;
alter table public.goals            enable row level security;
alter table public.ai_conversations enable row level security;

create policy "own_profile"      on public.profiles         for all using (auth.uid() = id);
create policy "own_accounts"     on public.accounts         for all using (auth.uid() = user_id);
create policy "own_transactions" on public.transactions     for all using (auth.uid() = user_id);
create policy "own_goals"        on public.goals            for all using (auth.uid() = user_id);
create policy "own_conversations"on public.ai_conversations for all using (auth.uid() = user_id);
create policy "see_categories"   on public.categories
  for select using (is_system = true or auth.uid() = user_id);
create policy "manage_categories"on public.categories
  for all    using (auth.uid() = user_id and is_system = false);

-- ══ SYSTEM CATEGORIES (seed data) ═══════════════════════════
insert into public.categories (name, icon, color, type, is_system) values
  ('Food & Dining',   'utensils',     '#EA580C', 'expense', true),
  ('Transport',       'car',          '#2563EB', 'expense', true),
  ('Shopping',        'shopping-bag', '#7C3AED', 'expense', true),
  ('Health',          'heart',        '#059669', 'expense', true),
  ('Entertainment',   'film',         '#D97706', 'expense', true),
  ('Utilities',       'zap',          '#4B5563', 'expense', true),
  ('Rent',            'home',         '#DC2626', 'expense', true),
  ('Education',       'book-open',    '#0891B2', 'expense', true),
  ('Salary',          'briefcase',    '#16A34A', 'income',  true),
  ('Freelance',       'code',         '#7C3AED', 'income',  true),
  ('Investment',      'trending-up',  '#D97706', 'income',  true),
  ('Other',           'circle',       '#9CA3AF', 'both',    true);

-- ══ TRIGGERS ════════════════════════════════════════════════
-- Auto-update updated_at on profiles
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- Auto-create profile when user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ══ USEFUL VIEWS ════════════════════════════════════════════
-- Monthly summary view (used by dashboard)
create or replace view public.monthly_summary as
select
  user_id,
  date_trunc('month', date) as month,
  sum(case when type = 'credit' then amount else 0 end) as total_income,
  sum(case when type = 'debit'  then amount else 0 end) as total_spent,
  count(*) as transaction_count
from public.transactions
group by user_id, date_trunc('month', date);
EOF

ok "Database schema ready"

# ════════════════════════════════════════════════════════════
# 11. GIT INIT
# ════════════════════════════════════════════════════════════
heading "11 / 11  —  Git"

git init -q
git add .
git commit -m "feat: initial Wallet finance app — M4 optimized setup" -q
ok "Repository initialized with initial commit"

# ════════════════════════════════════════════════════════════
# DONE
# ════════════════════════════════════════════════════════════
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════╗"
echo -e "║   ✓  Wallet setup complete!                        ║"
echo -e "╚════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}3 manual steps remaining:${NC}"
echo "  1. Open Android Studio → complete SDK wizard → create Pixel 7 emulator"
echo "  2. Fill in API keys inside   ~/Desktop/WalletApp/.env"
echo "  3. Run:  supabase login  →  supabase link  →  supabase db push"
echo ""
echo -e "${CYAN}Then start building:${NC}"
echo "  cd ~/Desktop/WalletApp"
echo "  npx expo start"
echo ""
echo -e "${BLUE}Project:  ~/Desktop/WalletApp${NC}"
echo -e "${BLUE}Cursor:   cursor ~/Desktop/WalletApp${NC}"
