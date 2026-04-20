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
    // Faithful SVG from egyptian-pound-svgrepo-com.svg — three-path coin
    // design (outer ring + Arabic "ج" + inner ring). viewBox 0 0 470 470.
    case 'EGP':
      return (
        <Svg width={size} height={size} viewBox="0 0 470 470" fill="none">
          <Path
            d="M401.17,68.83C356.784,24.444,297.771,0,235,0C172.229,0,113.215,24.444,68.83,68.83C24.444,113.216,0,172.229,0,235s24.444,121.784,68.83,166.17C113.215,445.556,172.229,470,235,470c62.771,0,121.784-24.444,166.17-68.83S470,297.771,470,235S445.556,113.216,401.17,68.83z M235,455c-121.309,0-220-98.691-220-220S113.691,15,235,15s220,98.691,220,220S356.309,455,235,455z"
            fill={color}
          />
          <Path
            d="M269.067,260.577c-4.143,0-7.5,3.357-7.5,7.5V362c0,4.143,3.357,7.5,7.5,7.5c30.325,0,54.996-24.671,54.996-54.996v-14.253c0-24.657,16.378-46.923,39.827-54.146c2.209-0.681,3.98-2.342,4.803-4.503c0.821-2.16,0.601-4.579-0.599-6.555l-70.078-115.516c-0.61-0.2-13.554-4.387-33.294-6.719c-1.08-7.828-5.761-11.447-9.769-13.115C246.169,94.5,240.744,94.5,235,94.5c-5.744,0-11.168,0-15.878,1.96c-4.008,1.667-8.689,5.287-9.769,13.115c-19.741,2.333-32.685,6.519-33.294,6.719l-70.079,115.516c-1.199,1.976-1.42,4.395-0.598,6.555c0.821,2.161,2.593,3.822,4.802,4.503c23.45,7.224,39.828,29.489,39.828,54.146v14.253c0,30.325,24.671,54.996,54.996,54.996c4.142,0,7.5-3.357,7.5-7.5v-93.923c0-4.143-3.358-7.5-7.5-7.5s-7.5,3.357-7.5,7.5v85.718c-18.481-3.521-32.496-19.8-32.496-39.291v-14.253c0-27.976-16.692-53.522-41.563-65.081l53.716-88.543c2.338,23.013,6.227,57.527,9.989,73.833c3.881,16.83,18.994,33.79,44.422,36.602l0,56.829c0,4.142,3.358,7.5,7.5,7.5c4.142,0,7.5-3.358,7.5-7.5l0.001-56.829c25.427-2.812,40.539-19.772,44.422-36.602c3.761-16.306,7.65-50.82,9.988-73.833l53.715,88.544c-24.871,11.558-41.563,37.104-41.563,65.08v14.253c0,19.491-14.015,35.771-32.496,39.291v-85.718C276.567,263.935,273.21,260.577,269.067,260.577z M213.623,124.19l2.207,4.615v9.026c0,4.143,3.358,7.5,7.5,7.5s7.5-3.357,7.5-7.5v-10.728c0-1.12-0.251-2.226-0.734-3.236l-5.881-12.295c0.094-0.65,0.23-0.981,0.289-1.062c1.09-1.011,6.978-1.011,10.495-1.011s9.405,0,10.486,1.001c0.064,0.086,0.203,0.42,0.298,1.071l-5.881,12.295c-0.483,1.011-0.734,2.116-0.734,3.236v10.728c0,4.143,3.357,7.5,7.5,7.5s7.5-3.357,7.5-7.5v-9.026l2.207-4.615c11.956,1.271,21.517,3.341,27.185,4.772c-0.537,5.7-1.423,14.831-2.529,25.242h-92.064c-1.106-10.411-1.993-19.541-2.53-25.241C192.108,127.531,201.669,125.461,213.623,124.19z M272.306,217.088c-2.392,10.371-11.607,22.276-29.805,24.866v-2.215c0-4.142-3.358-7.5-7.5-7.5c-4.142,0-7.5,3.358-7.5,7.5v2.215c-18.199-2.59-27.414-14.494-29.806-24.866c-2.421-10.498-4.964-29.6-7.069-47.884h88.75C277.271,187.487,274.728,206.588,272.306,217.088z"
            fill={color}
          />
          <Path
            d="M235,54c-45.617,0-89.191,17.025-122.695,47.939C78.999,132.671,58.534,174.372,54.68,219.36c-0.354,4.127,2.706,7.759,6.833,8.112c4.135,0.354,7.76-2.706,8.113-6.833C76.909,135.608,149.55,69,235,69c91.533,0,166,74.468,166,166s-74.467,166-166,166c-85.45,0-158.091-66.608-165.375-151.64c-0.354-4.128-3.987-7.196-8.113-6.833c-4.127,0.354-7.186,3.985-6.833,8.112c3.854,44.988,24.318,86.689,57.625,117.421C145.809,398.975,189.383,416,235,416c99.804,0,181-81.196,181-181S334.804,54,235,54z"
            fill={color}
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
