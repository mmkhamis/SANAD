import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Eye, EyeOff } from 'lucide-react-native';

import { GlassCard } from './GlassCard';
import { CurrencyAmount } from './CurrencyAmount';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useRTL } from '../../hooks/useRTL';
import { TYPOGRAPHY } from '../../constants/typography';

interface HeroBalanceCardProps {
  balance: number;
  hidden: boolean;
  onToggleHide?: () => void;
  subtitle?: string;
  rightChip?: React.ReactNode;
}

/**
 * Premium hero balance card with decorative concentric rings overlay.
 * Uses the existing CurrencyAmount (Saudi Arabic sign/currency rule ✓).
 */
export const HeroBalanceCard = React.memo(function HeroBalanceCard({
  balance,
  hidden,
  onToggleHide,
  subtitle,
  rightChip,
}: HeroBalanceCardProps): React.ReactElement {
  const colors = useThemeColors();
  const { rowDir, textAlign } = useRTL();

  return (
    <GlassCard hero noPadding metallic={false} style={{ overflow: 'hidden' }}>
      {/* Decorative rings — positioned top-right */}
      <View pointerEvents="none" style={{ position: 'absolute', top: -60, right: -60, opacity: 0.9 }}>
        <Svg width={220} height={220}>
          <Circle cx={110} cy={110} r={92} stroke="rgba(255,255,255,0.08)" strokeWidth={0.6} fill="none" />
          <Circle cx={110} cy={110} r={70} stroke="rgba(255,255,255,0.06)" strokeWidth={0.6} fill="none" />
          <Circle cx={110} cy={110} r={48} stroke="rgba(255,255,255,0.05)" strokeWidth={0.6} fill="none" />
        </Svg>
      </View>

      <View style={{ padding: 20 }}>
        <View style={{ flexDirection: rowDir, justifyContent: 'space-between', alignItems: 'center' }}>
          {subtitle ? (
            <Text style={{ ...TYPOGRAPHY.caption, color: colors.textTertiary, textAlign }}>
              {subtitle}
            </Text>
          ) : <View />}
          {rightChip ? <View>{rightChip}</View> : null}
        </View>

        <View style={{ marginTop: 12, flexDirection: rowDir, alignItems: 'center', gap: 12 }}>
          {hidden ? (
            <Text style={{ fontSize: 34, fontWeight: '700', color: colors.textPrimary, letterSpacing: 2 }}>
              • • • •
            </Text>
          ) : (
            <CurrencyAmount
              value={balance}
              color={colors.textPrimary}
              fontSize={34}
              fontWeight="700"
              iconSize={22}
            />
          )}
          {onToggleHide ? (
            <Pressable
              onPress={onToggleHide}
              hitSlop={8}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              accessibilityLabel={hidden ? 'Show balance' : 'Hide balance'}
            >
              {hidden ? (
                <EyeOff size={20} color={colors.textTertiary} strokeWidth={1.8} />
              ) : (
                <Eye size={20} color={colors.textTertiary} strokeWidth={1.8} />
              )}
            </Pressable>
          ) : null}
        </View>
      </View>
    </GlassCard>
  );
});
