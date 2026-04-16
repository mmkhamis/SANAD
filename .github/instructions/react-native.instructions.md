---
applyTo: "**/*.ts,**/*.tsx"
---

# React Native + TypeScript Instructions

## TypeScript
- Use strict TypeScript
- Avoid `any`
- Avoid non-null assertions unless necessary
- Add explicit return types for exported functions and components
- Reuse existing types from `types/index.ts` whenever possible

## Imports
- Do not use barrel imports
- Import directly from the real file path
- Prefer project aliases only if they already work in the workspace

## React Native UI
- Use NativeWind className-based styling
- Prefer shared constants from `constants/colors.ts`, `constants/typography.ts`, `constants/strings.ts`, and `constants/layout.ts`
- Do not use React Native `Image`; use `expo-image`
- Do not use `FlatList`; use `FlashList`

## Data flow
- Do not fetch directly inside screens with raw `useEffect`
- All server data should come from:
  1. services
  2. TanStack Query hooks
  3. UI consumption
- Do not call Supabase directly from components or screens

## Finance-specific rules
- All amounts must be formatted through `utils/currency.ts`
- Sensitive financial data must not use AsyncStorage
- Use expo-secure-store for sensitive storage
- Use react-native-mmkv only for non-sensitive cache
- Use color semantics correctly:
  - positive/income -> green
  - negative/expense -> red
  - neutral/info -> neutral colors from constants

## UX requirements
- Every data-driven screen must support loading, error, and empty states
- Use haptics for important confirmations and taps
- Prefer performant rendering and avoid unnecessary re-renders
- Use Reanimated for animations that should stay on the native thread