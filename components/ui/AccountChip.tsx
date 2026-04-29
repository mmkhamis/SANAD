import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';

import { COLORS } from '../../constants/colors';
import { useThemeColors } from '../../hooks/useThemeColors';
import { CurrencyAmount } from './CurrencyAmount';

interface AccountChipProps {
  bankName: string;
  amount: number;
  color: string;
  /** Optional logo URL — shows logo instead of initial letter */
  logo?: string | null;
  /** Called when the chip is tapped */
  onPress?: () => void;
}

/**
 * Small pill chip showing a bank/account with its balance.
 * Matches Claude Design:
 *
 * pill: borderRadius 999, padding 5/10/5/6, rgba(255,255,255,0.04), stroke border
 * - dot: 18×18, borderRadius 6, bank color, initial letter OR logo
 * - bank name: fg-2, 11.5px
 * - amount: num class, weight 600
 * - currency icon: 10px
 */
export const AccountChip = React.memo(function AccountChip({
  bankName,
  amount,
  color,
  logo,
  onPress,
}: AccountChipProps): React.ReactElement {
  const colors = useThemeColors();
  const [imgError, setImgError] = useState(false);
  const showLogo = !!logo && !imgError;
  const chipStyle = {
    flexDirection: 'row' as const,
    flexWrap: 'nowrap' as const,
    alignItems: 'center' as const,
    alignSelf: 'flex-start' as const,
    flexShrink: 0,
    gap: 7,
    paddingVertical: 5,
    paddingLeft: 6,
    paddingRight: 10,
    borderRadius: 9999,
    backgroundColor: colors.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
    borderWidth: 1,
    borderColor: colors.isDark ? COLORS.claude.stroke : 'rgba(0,0,0,0.06)',
  };

  const content = (
    <>
      {/* Bank logo or initial dot */}
      {showLogo ? (
        <Image
          source={{ uri: logo }}
          style={{ width: 18, height: 18, borderRadius: 6 }}
          contentFit="cover"
          cachePolicy="memory-disk"
          onError={() => setImgError(true)}
        />
      ) : (
        <View
          style={{
            width: 18,
            height: 18,
            borderRadius: 6,
            backgroundColor: color,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              fontSize: 9,
              fontWeight: '800',
              color: '#FFFFFF',
            }}
          >
            {bankName.slice(0, 1)}
          </Text>
        </View>
      )}

      {/* Bank name */}
      <Text
        style={{
          fontSize: 11.5,
          color: colors.isDark ? COLORS.claude.fg2 : colors.textSecondary,
          flexShrink: 0,
        }}
        numberOfLines={1}
      >
        {bankName}
      </Text>

      {/* Amount */}
      <View style={{ flexShrink: 0 }}>
        <CurrencyAmount
          value={amount}
          color={colors.isDark ? COLORS.claude.fg : colors.textPrimary}
          fontSize={11.5}
          fontWeight="600"
          iconSize={10}
        />
      </View>
    </>
  );

  if (!onPress) {
    return (
      <View style={chipStyle}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      style={chipStyle}
    >
      {content}
    </Pressable>
  );
});
