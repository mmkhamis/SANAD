/**
 * Stock watchlist favorites store.
 *
 * Lightweight in-memory store (matches the pattern used by privacy /
 * dev-plan / settings stores in this repo). Persists for the lifetime of
 * the app session. Swap to a persisted store later when MMKV/AsyncStorage
 * is wired up.
 */

import { create } from 'zustand';

interface StockFavoritesStore {
  /** Ordered list of favorite symbols (newest first). */
  favorites: string[];
  isFavorite: (symbol: string) => boolean;
  toggle: (symbol: string) => void;
  /** Move a favorite up or down inside the favorites list. */
  reorder: (from: number, to: number) => void;
}

export const useStockFavoritesStore = create<StockFavoritesStore>((set, get) => ({
  favorites: [],
  isFavorite: (symbol) => get().favorites.includes(symbol),
  toggle: (symbol) =>
    set((state) => ({
      favorites: state.favorites.includes(symbol)
        ? state.favorites.filter((s) => s !== symbol)
        : [symbol, ...state.favorites],
    })),
  reorder: (from, to) =>
    set((state) => {
      if (from === to || from < 0 || to < 0) return state;
      const next = state.favorites.slice();
      if (from >= next.length || to >= next.length) return state;
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { favorites: next };
    }),
}));
