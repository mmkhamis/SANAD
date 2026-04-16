import { create } from 'zustand';
import { Appearance } from 'react-native';

type ThemeMode = 'light' | 'dark' | 'system';

// 'default' = original violet/navy, 'saudi' = premium forest green
export type ColorScheme = 'default' | 'saudi';

interface ThemeStore {
  mode: ThemeMode;
  colorScheme: ColorScheme;
  setMode: (mode: ThemeMode) => void;
  setColorScheme: (scheme: ColorScheme) => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  mode: 'dark',
  colorScheme: 'saudi',
  setMode: (mode: ThemeMode): void => set({ mode }),
  setColorScheme: (colorScheme: ColorScheme): void => set({ colorScheme }),
}));

/** Resolves the effective theme based on store mode + system preference. */
export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
  }
  return mode;
}
