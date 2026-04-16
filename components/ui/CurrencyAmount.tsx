import React from 'react';
import { View, Text, type TextStyle } from 'react-native';

import { CurrencyIcon, hasCurrencyIcon } from './CurrencyIcon';
import { useSettingsStore } from '../../store/settings-store';
import { useLanguageStore } from '../../store/language-store';
import { formatCompactNumber } from '../../utils/currency';

interface CurrencyAmountProps {
  value: number;
  color: string;
  fontSize?: number;
  fontWeight?: TextStyle['fontWeight'];
  iconSize?: number;
  /** If true, prefix with +/- sign */
  showSign?: boolean;
}

/**
 * Renders a compact amount with an SVG currency icon instead of text like "EGP".
 * Falls back to the Intl symbol text when no SVG icon exists.
 */
export const CurrencyAmount = React.memo(function CurrencyAmount({
  value,
  color,
  fontSize = 15,
  fontWeight = '600',
  iconSize,
  showSign = false,
}: CurrencyAmountProps): React.ReactElement {
  const currency = useSettingsStore((s) => s.activeCurrency);
  const language = useLanguageStore((s) => s.language);
  const hasIcon = hasCurrencyIcon(currency);
  const resolvedIconSize = iconSize ?? Math.round(fontSize * 0.65);
  const sign = showSign ? (value >= 0 ? '+' : '-') : (value < 0 ? '-' : '');
  const displayNumber = formatCompactNumber(Math.abs(value));
  const iconColor = '#9CA3AF';

  if (hasIcon) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        {sign ? (
          <Text style={{ fontSize, fontWeight, color }}>{sign}</Text>
        ) : null}
        <Text style={{ fontSize, fontWeight, color }}>{displayNumber}</Text>
        <CurrencyIcon currency={currency} size={resolvedIconSize} color={iconColor} />
      </View>
    );
  }

  // Fallback: use text symbol from Intl
  const symbol = getTextSymbol(currency, language);
  return (
    <Text style={{ fontSize, fontWeight, color }}>
      {sign}{symbol} {displayNumber}
    </Text>
  );
});

function getTextSymbol(currency: string, language: string): string {
  try {
    const locale = language === 'ar' ? 'ar-SA' : 'en';
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(0);
    return parts.find((p) => p.type === 'currency')?.value ?? currency;
  } catch {
    return currency;
  }
}
