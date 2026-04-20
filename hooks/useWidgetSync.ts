import { useEffect } from 'react';
import { Platform } from 'react-native';
import { format } from 'date-fns';

import { useGoals } from './useGoals';
import { useCommitmentsDue } from './useCommitments';
import { useCharity } from './useCharity';
import {
  syncBudgetToWidget,
  syncCommitmentsToWidget,
  syncCharityToWidget,
} from '../utils/widget-data';

/**
 * Syncs budget, upcoming payments, and charity data to iOS widgets
 * whenever the underlying data changes.
 *
 * Drop this hook into an always-mounted screen (e.g. the tabs layout).
 */
export function useWidgetSync(): void {
  const currentMonth = format(new Date(), 'yyyy-MM');

  const { data: goalsSummary } = useGoals();
  const { data: commitmentsSummary } = useCommitmentsDue(currentMonth);
  const { data: charitySummary } = useCharity(currentMonth);

  // Budget
  useEffect(() => {
    if (Platform.OS !== 'ios' || !goalsSummary) return;
    syncBudgetToWidget(goalsSummary).catch((err) => {
      console.warn('[WidgetSync] budget:', err);
    });
  }, [goalsSummary]);

  // Upcoming payments
  useEffect(() => {
    if (Platform.OS !== 'ios' || !commitmentsSummary) return;
    syncCommitmentsToWidget(commitmentsSummary).catch((err) => {
      console.warn('[WidgetSync] commitments:', err);
    });
  }, [commitmentsSummary]);

  // Charity
  useEffect(() => {
    if (Platform.OS !== 'ios' || !charitySummary) return;
    syncCharityToWidget(charitySummary).catch((err) => {
      console.warn('[WidgetSync] charity:', err);
    });
  }, [charitySummary]);
}
