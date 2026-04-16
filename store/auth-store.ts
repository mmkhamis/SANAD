import { create } from 'zustand';

import type { UserProfile } from '../types/index';
import { setActiveCurrency } from '../utils/currency';
import { useSettingsStore } from './settings-store';

// ─── Store Shape ─────────────────────────────────────────────────────

interface AuthStore {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;

  // Actions
  setUser: (user: UserProfile) => void;
  updateUser: (partial: Partial<UserProfile>) => void;
  setLoading: (loading: boolean) => void;
  clearUser: () => void;
  updateOnboardingStatus: (completed: boolean) => void;
}

// ─── Store ───────────────────────────────────────────────────────────

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // starts true — we check session on app launch
  hasCompletedOnboarding: false,

  setUser: (user: UserProfile): void => {
    setActiveCurrency(user.currency, user.locale);
    useSettingsStore.getState().setCurrency(user.currency, user.locale);
    set({
      user,
      isAuthenticated: true,
      isLoading: false,
      hasCompletedOnboarding: user.onboarding_completed,
    });
  },

  updateUser: (partial: Partial<UserProfile>): void => {
    set((state) => {
      if (!state.user) return state;
      const merged = { ...state.user, ...partial };
      // If currency or locale changed, update the active settings
      if (partial.currency || partial.locale) {
        const currency = partial.currency ?? state.user.currency;
        const locale = partial.locale ?? state.user.locale;
        setActiveCurrency(currency, locale);
        useSettingsStore.getState().setCurrency(currency, locale);
      }
      return {
        ...state,
        user: merged,
        hasCompletedOnboarding: partial.onboarding_completed ?? state.hasCompletedOnboarding,
      };
    });
  },

  setLoading: (loading: boolean): void => {
    set({ isLoading: loading });
  },

  clearUser: (): void => {
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      hasCompletedOnboarding: false,
    });
  },

  updateOnboardingStatus: (completed: boolean): void => {
    set((state) => ({
      hasCompletedOnboarding: completed,
      user: state.user ? { ...state.user, onboarding_completed: completed } : null,
    }));
  },
}));
