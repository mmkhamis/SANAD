/**
 * Dev-only plan override.
 *
 * In development builds (`__DEV__`) this lets us simulate any plan
 * without touching the real subscription row in Supabase. Production
 * builds ignore this store completely (the consuming hook short-circuits
 * when `__DEV__` is false).
 */

import { create } from 'zustand';
import type { UserPlan } from '../types/index';

interface DevPlanStore {
  /** When set, overrides the resolved entitlement plan in dev builds. */
  override: UserPlan | null;
  setOverride: (plan: UserPlan | null) => void;
}

export const useDevPlanStore = create<DevPlanStore>((set) => ({
  override: null,
  setOverride: (plan) => set({ override: plan }),
}));
