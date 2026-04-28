import { supabase } from '../lib/supabase';
import type { AccountType } from '../types/index';

export interface ExtractedAccount {
  bank_name: string;
  card_name: string;
  last4: string | null;
  card_last4: string | null;
  account_last4: string | null;
  type: AccountType;
  balance: number | null;
  currency: string | null;
  selected: boolean; // UI toggle state
}

export async function scanWalletScreenshot(
  base64: string,
): Promise<ExtractedAccount[]> {
  const { data, error } = await supabase.functions.invoke('scan-wallet', {
    body: { image_base64: base64 },
  });

  if (error) throw new Error(error.message);
  if (!data?.ok) throw new Error(data?.error ?? 'Scan failed');

  return (data.accounts ?? []).map((a: Record<string, unknown>) => ({
    bank_name: (a.bank_name as string) ?? 'Unknown Bank',
    card_name: (a.card_name as string) ?? 'Account',
    last4: (a.last4 as string | null) ?? null,
    card_last4: (a.card_last4 as string | null) ?? null,
    account_last4: (a.account_last4 as string | null) ?? null,
    type: normalizeType((a.type as string) ?? 'bank'),
    balance: typeof a.balance === 'number' ? a.balance : null,
    currency: (a.currency as string | null) ?? null,
    selected: true,
  }));
}

function normalizeType(raw: string): AccountType {
  if (raw === 'credit_card') return 'credit_card';
  if (raw === 'savings') return 'savings';
  return 'bank';
}
