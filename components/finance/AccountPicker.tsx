import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Check } from 'lucide-react-native';

import { impactLight } from '../../utils/haptics';
import { useAccounts } from '../../hooks/useAccounts';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useT } from '../../lib/i18n';
import type { Account } from '../../types/index';

// ─── Helpers ─────────────────────────────────────────────────────────

const ACCOUNT_ICON: Record<string, string> = {
  cash: '💵',
  bank: '🏦',
  savings: '🐖',
  credit_card: '💳',
};

// ─── Props ───────────────────────────────────────────────────────────

interface AccountPickerProps {
  selectedId: string | null;
  onSelect: (account: Account) => void;
}

// ─── Component ───────────────────────────────────────────────────────

export function AccountPicker({
  selectedId,
  onSelect,
}: AccountPickerProps): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const { data: accounts, isLoading } = useAccounts();

  if (isLoading) {
    return (
      <View className="items-center justify-center py-4">
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (!accounts || accounts.length === 0) {
    return (
      <View className="items-center justify-center py-4 px-4">
        <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center' }}>
          {t('NO_ACCOUNTS_YET')}
        </Text>
      </View>
    );
  }

  const handleSelect = (account: Account): void => {
    impactLight();
    onSelect(account);
  };

  return (
    <View className="flex-row flex-wrap gap-2">
      {accounts.map((account) => {
        const isSelected = account.id === selectedId;
        const icon = ACCOUNT_ICON[account.type] ?? '💰';

        return (
          <Pressable
            key={account.id}
            onPress={() => handleSelect(account)}
            className="flex-row items-center rounded-xl px-3 py-2"
            style={{
              backgroundColor: isSelected ? colors.primary + '18' : colors.surface,
              borderWidth: 1.5,
              borderColor: isSelected ? colors.primary : colors.borderLight,
            }}
          >
            <Text style={{ fontSize: 18, marginRight: 6 }}>{icon}</Text>
            <Text
              style={{
                fontSize: 14,
                fontWeight: isSelected ? '600' : '500',
                color: isSelected ? colors.primary : colors.textPrimary,
              }}
            >
              {account.name}
            </Text>
            {isSelected ? (
              <View className="ml-2">
                <Check size={14} color={colors.primary} strokeWidth={3} />
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
