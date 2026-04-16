/**
 * Zustand store for InsightCard UI state.
 *
 * Tracks dismissed insights, expanded state, and animation triggers
 * so that animations run purely on the UI thread without re-fetching.
 */

import { create } from 'zustand';

export interface InsightState {
  /** Insight IDs the user has explicitly dismissed */
  dismissedIds: string[];
  /** Whether the most recent insight should play its entrance animation */
  highlightNewId: string | null;
  /** Expanded insight ID (for detail view) */
  expandedId: string | null;

  /** Mark an insight as dismissed */
  dismiss: (id: string) => void;
  /** Restore a previously dismissed insight */
  restore: (id: string) => void;
  /** Trigger the "new insight" entrance animation */
  highlightNew: (id: string | null) => void;
  /** Toggle expanded state */
  toggleExpanded: (id: string | null) => void;
  /** Reset all UI state */
  reset: () => void;
}

export const useInsightStore = create<InsightState>((set) => ({
  dismissedIds: [],
  highlightNewId: null,
  expandedId: null,

  dismiss: (id) =>
    set((state) => ({
      dismissedIds: state.dismissedIds.includes(id)
        ? state.dismissedIds
        : [...state.dismissedIds, id],
    })),

  restore: (id) =>
    set((state) => ({
      dismissedIds: state.dismissedIds.filter((d) => d !== id),
    })),

  highlightNew: (id) => set({ highlightNewId: id }),

  toggleExpanded: (id) =>
    set((state) => ({
      expandedId: state.expandedId === id ? null : id,
    })),

  reset: () => set({ dismissedIds: [], highlightNewId: null, expandedId: null }),
}));
