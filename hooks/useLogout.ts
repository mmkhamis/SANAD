import { useMutation, useQueryClient } from '@tanstack/react-query';

import { logout } from '../services/auth-service';
import { useAuthStore } from '../store/auth-store';
import { clearWidgetData } from '../utils/widget-data';

interface UseLogoutResult {
  mutate: () => void;
  isPending: boolean;
}

export function useLogout(): UseLogoutResult {
  const clearUser = useAuthStore((s) => s.clearUser);
  const qc = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      clearUser();
      qc.clear(); // Wipe all cached data — user is gone
      clearWidgetData().catch(() => {}); // Best-effort widget cleanup
    },
  });

  return { mutate, isPending };
}
