# Wallet App — Copilot Instructions

You are working on a React Native mobile app called **Wallet**.

## Workspace rules
- Use the current workspace as the source of truth.
- Do not scaffold a new project.
- Do not invent a different folder structure.
- Reuse existing files, types, constants, hooks, services, and utilities when they already exist.
- If something is missing, say what is missing before guessing.

## Tech stack
- React Native with Expo SDK
- Expo Router
- TypeScript with strict mode
- Supabase
- TanStack Query
- Zustand
- NativeWind
- React Native Reanimated
- @shopify/flash-list
- expo-image
- expo-secure-store
- react-native-mmkv
- react-native-gifted-charts
- date-fns
- lucide-react-native
- OpenAI API

## Engineering rules
- Strict TypeScript only
- Do not use `any` unless truly unavoidable
- No barrel imports
- No Supabase calls inside screens or components
- All async fetching must go through the services layer and TanStack Query
- Use FlashList, never FlatList
- Use expo-image, never React Native Image
- Use expo-secure-store for sensitive financial data
- Use react-native-mmkv only for non-sensitive cache
- Use formatAmount() from `utils/currency.ts` for all money display
- Add explicit return type annotations for components and exported functions
- Use NativeWind and shared constants instead of inline StyleSheet objects where practical
- Add loading, error, and empty states on all data-driven screens
- Add haptic feedback for important user actions
- Prefer offline-first behavior where practical
- Add screen-level error boundaries

## Feature implementation order
For every new feature, work in this order:
1. services layer
2. hooks layer
3. reusable UI components
4. screen integration

## Output rules
- Output full code for each changed file
- Keep import paths clean and direct
- Do not rewrite unrelated files
- After coding, explain the architecture and the main concepts simply

## Terminal & deployment rules
- When something can be done via the terminal (install, deploy, migrate, etc.), do it directly — do not ask the user to run commands
- Supabase CLI is available via `npx supabase` (not installed globally)
- Project ref: `rpsbxbwddhkalfwptlut`
- Deploy edge functions: `npx supabase functions deploy <function-name>`
- Apply migrations via Supabase Dashboard SQL Editor if CLI migration push is unavailable
- After editing any edge function, deploy it immediately
- After creating a new migration file, tell the user to apply it or apply via CLI if linked