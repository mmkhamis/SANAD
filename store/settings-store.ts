/**
 * Reactive currency store.
 *
 * The currency utility module uses plain module variables which React
 * cannot observe. This store mirrors those values in Zustand so any
 * component that reads the active currency will automatically re-render
 * when the user changes their currency in Settings.
 */

import { create } from 'zustand';

interface SettingsStore {
  activeCurrency: string;
  activeLocale: string;
  setCurrency: (currency: string, locale: string) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  activeCurrency: 'SAR',
  activeLocale: 'en-SA',
  setCurrency: (currency, locale) => set({ activeCurrency: currency, activeLocale: locale }),
}));

/** Non-React hook to read the current currency (for services, formatters, etc.) */
export function getActiveCurrency(): string {
  return useSettingsStore.getState().activeCurrency;
}

export function getActiveLocale(): string {
  return useSettingsStore.getState().activeLocale;
}

/** Call once when the user profile loads (or updates). */
export function setActiveCurrency(currency: string, locale: string): void {
  useSettingsStore.getState().setCurrency(currency, locale);
}
