import { create } from 'zustand';

interface PrivacyStore {
  hidden: boolean;
  toggle: () => void;
}

export const usePrivacyStore = create<PrivacyStore>((set) => ({
  hidden: false,
  toggle: (): void => set((s) => ({ hidden: !s.hidden })),
}));

/** Returns "••••" when privacy mode is on, otherwise the formatted string. */
export function maskIfHidden(text: string, hidden: boolean): string {
  return hidden ? '••••' : text;
}
