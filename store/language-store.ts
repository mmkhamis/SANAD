import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const LANG_KEY = 'app_language';

export type Language = 'ar' | 'en';

interface LanguageStore {
  language: Language;
  isRTL: boolean;
  setLanguage: (lang: Language) => void;
}

// Synchronous read at startup from last-known value set in setLanguage.
// SecureStore is async, so we read the cached value synchronously via getItemAsync
// on first render in useEffect. Default to 'ar' until loaded.
let _cachedLang: Language = 'ar';
try {
  // SecureStore.getItem is sync on iOS (Expo SDK 54+)
  const stored = SecureStore.getItem(LANG_KEY);
  if (stored === 'en' || stored === 'ar') _cachedLang = stored;
} catch {
  // Fallback — async read handled below
}

export const useLanguageStore = create<LanguageStore>((set) => ({
  language: _cachedLang,
  isRTL: _cachedLang === 'ar',
  setLanguage: (language: Language): void => {
    const isRTL = language === 'ar';
    SecureStore.setItemAsync(LANG_KEY, language).catch(() => {});
    // Layout stays LTR; Arabic text direction is handled per-component
    // via writingDirection style. No global RTL flip.
    set({ language, isRTL });
  },
}));

/** Non-hook access for utilities */
export function getLanguage(): Language {
  return useLanguageStore.getState().language;
}

export function isArabic(): boolean {
  return useLanguageStore.getState().language === 'ar';
}
