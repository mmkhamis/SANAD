import React from 'react';
import { View, Text } from 'react-native';
import { Inbox } from 'lucide-react-native';

import { useThemeColors } from '../../hooks/useThemeColors';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, icon }: EmptyStateProps): React.ReactElement {
  const colors = useThemeColors();
  return (
    <View className="items-center justify-center py-10 px-6">
      {icon ?? <Inbox size={48} color={colors.textTertiary} strokeWidth={1.5} />}
      <Text
        className="mt-4 text-center"
        style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary }}
      >
        {title}
      </Text>
      <Text
        className="mt-2 text-center"
        style={{ fontSize: 14, color: colors.textSecondary }}
      >
        {description}
      </Text>
    </View>
  );
}
