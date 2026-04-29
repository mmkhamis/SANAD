import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Check, Camera, AlertCircle } from 'lucide-react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useRTL } from '../../hooks/useRTL';
import { useT } from '../../lib/i18n';
import { impactLight, notifySuccess, notifyError } from '../../utils/haptics';
import { useAccounts, useCreateAccount } from '../../hooks/useAccounts';
import { findBankPreset } from '../../constants/bank-presets';
import type { ExtractedAccount } from '../../services/wallet-scan-service';
import type { CreateAccountInput } from '../../services/account-service';
import type { Account } from '../../types/index';

interface ScanWalletSheetProps {
  accounts: ExtractedAccount[];
  onDone: () => void;
}

/** Check if a scanned account already exists */
function isDuplicate(scanned: ExtractedAccount, existing: Account[]): Account | null {
  for (const ex of existing) {
    // Match by last4 (card or account)
    if (scanned.last4) {
      if (ex.card_last4 === scanned.last4 || ex.account_last4 === scanned.last4) {
        return ex;
      }
    }
    if (scanned.card_last4 && ex.card_last4 === scanned.card_last4) return ex;
    if (scanned.account_last4 && ex.account_last4 === scanned.account_last4) return ex;
  }
  return null;
}

export function ScanWalletSheet({ accounts: initial, onDone }: ScanWalletSheetProps): React.ReactElement {
  const colors = useThemeColors();
  const { isRTL, rowDir, textAlign } = useRTL();
  const t = useT();
  const { mutateAsync: addAccount } = useCreateAccount();
  const { data: existingAccounts } = useAccounts();

  // Mark duplicates and auto-deselect them
  const enriched = useMemo(() => {
    const existing = existingAccounts ?? [];
    return initial.map((a) => {
      const dup = isDuplicate(a, existing);
      const preset = findBankPreset(a.bank_name);
      return { ...a, duplicate: dup, preset, selected: !dup };
    });
  }, [initial, existingAccounts]);

  const [accounts, setAccounts] = useState(enriched);
  const [saving, setSaving] = useState(false);

  const toggleAccount = useCallback((idx: number) => {
    setAccounts((prev) => prev.map((a, i) => i === idx ? { ...a, selected: !a.selected } : a));
  }, []);

  const updateBalance = useCallback((idx: number, val: string) => {
    const num = parseFloat(val.replace(/,/g, ''));
    setAccounts((prev) =>
      prev.map((a, i) => i === idx ? { ...a, balance: isNaN(num) ? null : num } : a),
    );
  }, []);

  const handleSaveAll = useCallback(async () => {
    const selected = accounts.filter((a) => a.selected && !a.duplicate);
    if (selected.length === 0) return;

    setSaving(true);
    let created = 0;
    for (const a of selected) {
      try {
        // Build a name that always carries the bank identity so findBankPreset
        // (used by Accounts list, transaction rows, etc.) can resolve the logo.
        const bank = a.bank_name?.trim() ?? '';
        const card = a.card_name?.trim() ?? '';
        const cardHasBank =
          bank.length > 0 &&
          card.toLowerCase().includes(bank.toLowerCase());
        const composedName = !card
          ? `${bank} Account`
          : cardHasBank
            ? card
            : `${bank} ${card}`;

        const input: CreateAccountInput = {
          name: composedName,
          type: a.type,
          opening_balance: a.balance ?? 0,
          include_in_total: true,
          account_last4: a.account_last4 ?? null,
          card_last4: a.card_last4 ?? a.last4 ?? null,
          iban_last4: null,
        };
        await addAccount(input);
        created++;
      } catch (e) {
        console.warn('[ScanWalletSheet] failed to create account:', a.card_name, e);
      }
    }
    setSaving(false);

    if (created > 0) {
      notifySuccess();
      onDone();
    } else {
      notifyError();
    }
  }, [accounts, addAccount, onDone]);

  const newCount = accounts.filter((a) => a.selected && !a.duplicate).length;

  return (
    <View style={{ padding: 16 }}>
      {/* Header */}
      <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Camera size={20} color={colors.primary} strokeWidth={2} />
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textPrimary, textAlign }}>
          {t('SCAN_WALLET_RESULTS' as any) || 'Detected Accounts'}
        </Text>
      </View>

      <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 16, textAlign }}>
        {t('SCAN_WALLET_SUBTITLE' as any) || 'Toggle accounts to add and optionally set balances.'}
      </Text>

      {/* Account list */}
      <ScrollView style={{ maxHeight: 400 }}>
        {accounts.map((account, idx) => {
          const isDup = !!account.duplicate;
          return (
            <Pressable
              key={idx}
              onPress={() => { if (!isDup) { impactLight(); toggleAccount(idx); } }}
              style={{
                flexDirection: rowDir,
                alignItems: 'center',
                paddingVertical: 12,
                paddingHorizontal: 12,
                borderRadius: 12,
                backgroundColor: isDup
                  ? colors.textTertiary + '10'
                  : account.selected ? colors.primary + '14' : colors.surface,
                borderWidth: 1,
                borderColor: isDup
                  ? colors.textTertiary + '30'
                  : account.selected ? colors.primary + '40' : colors.borderLight,
                marginBottom: 8,
                opacity: isDup ? 0.6 : 1,
              }}
            >
              {/* Toggle */}
              {!isDup && (
                <View style={{
                  width: 22, height: 22, borderRadius: 11,
                  backgroundColor: account.selected ? colors.primary : 'transparent',
                  borderWidth: account.selected ? 0 : 2,
                  borderColor: colors.borderLight,
                  alignItems: 'center', justifyContent: 'center',
                  marginEnd: 10,
                }}>
                  {account.selected && <Check size={14} color="#fff" strokeWidth={3} />}
                </View>
              )}

              {/* Bank logo */}
              <View style={{ marginEnd: 10 }}>
                {account.preset?.logo ? (
                  <Image source={{ uri: account.preset.logo }} style={{ width: 32, height: 32, borderRadius: 8 }} contentFit="cover" cachePolicy="memory-disk" />
                ) : (
                  <View style={{
                    width: 32, height: 32, borderRadius: 8,
                    backgroundColor: account.preset?.color ?? colors.primary + '18',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: account.preset ? '#FFF' : colors.textSecondary }}>
                      {account.bank_name.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              {/* Info */}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textPrimary, textAlign }}>
                  {account.card_name}
                </Text>
                <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    {account.bank_name}
                  </Text>
                  {account.last4 && (
                    <Text style={{ fontSize: 12, color: colors.textTertiary, fontFamily: 'monospace' }}>
                      **** {account.last4}
                    </Text>
                  )}
                </View>
                {isDup && (
                  <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <AlertCircle size={12} color={colors.textTertiary} strokeWidth={2} />
                    <Text style={{ fontSize: 11, color: colors.textTertiary }}>
                      Already exists: {account.duplicate!.name}
                    </Text>
                  </View>
                )}
              </View>

              {/* Balance input */}
              {account.selected && !isDup && (
                <TextInput
                  value={account.balance != null ? String(account.balance) : ''}
                  onChangeText={(val) => updateBalance(idx, val)}
                  placeholder="0.00"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="decimal-pad"
                  style={{
                    width: 90,
                    fontSize: 14,
                    fontWeight: '600',
                    color: colors.textPrimary,
                    textAlign: 'right',
                    paddingVertical: 4,
                    paddingHorizontal: 8,
                    borderRadius: 8,
                    backgroundColor: colors.background,
                    borderWidth: 1,
                    borderColor: colors.borderLight,
                  }}
                  onPressIn={(e) => e.stopPropagation()}
                />
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Save button */}
      <Pressable
        onPress={handleSaveAll}
        disabled={saving || newCount === 0}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingVertical: 14,
          borderRadius: 12,
          backgroundColor: newCount > 0 ? colors.primary : colors.surface,
          marginTop: 16,
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={{ fontSize: 15, fontWeight: '600', color: newCount > 0 ? '#fff' : colors.textTertiary }}>
            {newCount > 0
              ? `${t('ADD' as any) || 'Add'} ${newCount} ${t('ACCOUNTS' as any) || 'Account(s)'}`
              : t('NO_NEW_ACCOUNTS' as any) || 'All accounts already exist'}
          </Text>
        )}
      </Pressable>
    </View>
  );
}
