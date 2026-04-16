import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useGoals } from './useGoals';
import { syncBudgetToWidget } from '../utils/widget-data';

/**
 * Syncs budget/goals data to the iOS widget whenever it changes.
 *
 * Drop this hook into any always-mounted screen (e.g. the tabs layout)
 * so the widget stays up-to-date while the app is open.
 */
export function useWidgetSync(): void {
  const { data } = useGoals();

  useEffect(() => {
    if (Platform.OS !== 'ios' || !data) return;

    syncBudgetToWidget(data).catch((err) => {
      // Non-critical — widget will show stale data
      console.warn('[WidgetSync] Failed to sync budget data:', err);
    });
  }, [data]);
}
