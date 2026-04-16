import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface CurrencyIconProps {
  currency: string;
  size?: number;
  color?: string;
}

/**
 * Renders an SVG currency symbol for supported currencies.
 * Falls back to null for unsupported currencies (caller should show text).
 * The `color` prop is applied to all strokes/fills so it works in both
 * light and dark mode — callers pass the appropriate theme color.
 */
export const CurrencyIcon = React.memo(function CurrencyIcon({
  currency,
  size = 16,
  color = '#FFFFFF',
}: CurrencyIconProps): React.ReactElement | null {
  const code = currency.toUpperCase();

  switch (code) {
    // ─── Egyptian Pound (جنيه مصري) ─────────────────────────────────
    // From "Egp design" folder — Egyptian pound symbol (ج) coin design
    case 'EGP':
      return (
        <Svg width={size} height={size} viewBox="0 0 1000 1000" fill="none">
          {/* Outer circle border */}
          <Path
            d="M500 50C251.5 50 50 251.5 50 500s201.5 450 450 450 450-201.5 450-450S748.5 50 500 50zm0 840C285 890 110 715 110 500S285 110 500 110s390 175 390 390-175 390-390 390z"
            fill={color}
          />
          {/* Arabic ج (jeem) — Egyptian pound symbol */}
          <Path
            d="M350 350c0-40 30-70 70-70s70 30 70 70v30c0 40-30 70-70 70s-70-30-70-70"
            stroke={color}
            strokeWidth="50"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Dot below ج */}
          <Path
            d="M420 600c0 27.6-22.4 50-50 50s-50-22.4-50-50 22.4-50 50-50 50 22.4 50 50z"
            fill={color}
          />
          {/* Tail stroke */}
          <Path
            d="M490 420h200c30 0 50-20 50-50s-20-50-50-50"
            stroke={color}
            strokeWidth="50"
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      );

    // ─── Saudi Riyal (ر.س) — official symbol (2022) ─────────────
    // The official Saudi Riyal symbol is a stylised Arabic ر.س
    // Based on the actual SVG design from the Saudi Central Bank.
    case 'SAR':
      return (
        <Svg width={size} height={size} viewBox="0 0 1124 1256" fill="none">
          {/* Main ر.س stylized glyph — based on official Saudi Riyal symbol */}
          <Path
            d="M699.62 1113.02c-20.06 44.48-33.32 92.75-38.4 143.37l424.51-90.24c20.06-44.47 33.31-92.75 38.4-143.37l-424.51 90.24Z"
            fill={color}
          />
          <Path
            d="M1085.73 895.8c20.06-44.47 33.32-92.75 38.4-143.37l-330.68 70.33v-135.2l292.27-62.11c20.06-44.47 33.32-92.75 38.4-143.37l-330.68 70.27V66.13c-50.67 28.45-95.67 66.32-132.25 110.99v403.35l-132.25 28.11V0c-50.67 28.44-95.67 66.32-132.25 110.99v525.69l-295.91 62.88c-20.06 44.47-33.33 92.75-38.42 143.37l334.33-71.05v170.26l-358.3 76.14c-20.06 44.47-33.32 92.75-38.4 143.37l375.04-79.7c30.53-6.35 56.77-24.4 73.83-49.24l68.78-101.97v-.02c7.14-10.55 11.3-23.27 11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"
            fill={color}
          />
        </Svg>
      );

    // ─── US Dollar ────────────────────────────────────────────
    case 'USD':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    // ─── Euro ─────────────────────────────────────────────────
    case 'EUR':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M17.5 5.5C15.5 3.5 12 3 9.5 5S6.5 11 6.5 12s.5 5 3 7 6 .5 8-1.5"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path d="M4 10h10M4 14h10" stroke={color} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      );

    // ─── British Pound ────────────────────────────────────────
    case 'GBP':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M18 20H6l2-8H6M10 12h6M14 4c0 0-4 0-4 4v8"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    // ─── UAE Dirham ───────────────────────────────────────────
    case 'AED':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M5 7v10M9 5v12M14 7c0-1.7 1.3-3 3-3s3 1.3 3 3v2c0 1.7-1.3 3-3 3s-3-1.3-3-3V7z"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path d="M3 19h18" stroke={color} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      );

    // ─── Kuwaiti Dinar ────────────────────────────────────────
    case 'KWD':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M7 5v14M12 5v14M17 5l-3 7 3 7"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    default:
      return null;
  }
});

/** Check if a currency code has a dedicated SVG icon. */
export function hasCurrencyIcon(currency: string): boolean {
  return ['EGP', 'SAR', 'USD', 'EUR', 'GBP', 'AED', 'KWD'].includes(currency.toUpperCase());
}
