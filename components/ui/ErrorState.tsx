import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { AlertCircle } from 'lucide-react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import { STRINGS } from '../../constants/strings';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps): React.ReactElement {
  const colors = useThemeColors();
  return (
    <View
      className="flex-1 items-center justify-center px-6"
      style={{ backgroundColor: colors.background }}
    >
      <AlertCircle size={48} color={colors.expense} strokeWidth={1.5} />
      <Text
        className="mt-4 text-center"
        style={{
          fontSize: 16,
          fontWeight: '600',
          color: colors.textPrimary,
        }}
      >
        {STRINGS.ERROR_GENERIC}
      </Text>
      {message ? (
        <Text
          className="mt-2 text-center"
          style={{ fontSize: 14, color: colors.textSecondary }}
        >
          {message}
        </Text>
      ) : null}
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          className="mt-5 rounded-xl px-6 py-3"
          style={{ backgroundColor: colors.primary }}
        >
          <Text style={{ color: colors.textInverse, fontWeight: '600' }}>
            {STRINGS.RETRY}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
