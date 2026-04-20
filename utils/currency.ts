/**
 * Centralized currency formatting utility.
 * All monetary amounts in the app MUST go through formatAmount().
 *
 * The active currency/locale values live in the reactive Zustand store
 * (store/settings-store.ts) so that components re-render automatically
 * when the user changes their currency in Settings.
 */

import { getActiveCurrency as _getStoreCurrency, getActiveLocale as _getStoreLocale } from '../store/settings-store';
import { useLanguageStore } from '../store/language-store';

const DEFAULT_CURRENCY = 'SAR';
const DEFAULT_LOCALE = 'en-SA';

// Convert Western (0-9) digits to Arabic-Indic (٠-٩).
// Used everywhere user-facing numbers are formatted while language === 'ar'.
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
function toArabicDigits(s: string): string {
  return s.replace(/\d/g, (d) => AR_DIGITS[parseInt(d, 10)]);
}
function arabicizeIfNeeded(s: string): string {
  return useLanguageStore.getState().language === 'ar' ? toArabicDigits(s) : s;
}

/** Module-level mirror of the store values for non-React callers (services, formatters). */
let _activeCurrency = DEFAULT_CURRENCY;
let _activeLocale = DEFAULT_LOCALE;

/** Call once when the user profile loads (or updates). */
export function setActiveCurrency(currency: string, locale: string): void {
  _activeCurrency = currency;
  _activeLocale = locale;
}

/** Returns the user's currently active currency code (e.g. 'EGP', 'SAR'). */
export function getActiveCurrency(): string {
  return _activeCurrency;
}

/** Returns the user's currently active locale (e.g. 'en-SA', 'en-EG'). */
export function getActiveLocaleValue(): string {
  return _activeLocale;
}

interface FormatAmountOptions {
  currency?: string;
  locale?: string;
  showSign?: boolean;
  compact?: boolean;
  /** When true, render as an integer with no decimal digits. */
  integer?: boolean;
}

export function formatAmount(
  amount: number,
  options: FormatAmountOptions = {},
): string {
  const {
    currency = _activeCurrency,
    locale = _activeLocale,
    showSign = false,
    compact = false,
    integer = false,
  } = options;

  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: integer ? 0 : 2,
    maximumFractionDigits: integer ? 0 : 2,
    ...(compact && { notation: 'compact' }),
    ...(showSign && { signDisplay: 'always' }),
  });

  // Strip the currency symbol text (e.g. "ر.س", "ج.م", "SAR") so the UI
  // layer can render the SVG currency icon instead.
  // Hermes doesn't support formatToParts, so we use string replacement.
  const formatted = formatter.format(amount);
  const symbol = _getCurrencySymbolForStrip(currency);
  const stripped = formatted
    .replace(symbol, '')
    .replace(currency, '')
    .replace(/^\s+|\s+$/g, '')
    .trim();
  return arabicizeIfNeeded(stripped);
}

export function formatAmountShort(amount: number, currency?: string): string {
  return formatAmount(amount, { currency, compact: true });
}

/**
 * Format a number to max 4 visible digits for dashboard display.
 * Examples:
 *   2456    → "2,456"
 *   2465.78 → "2,465"
 *   24567   → "24.57k"
 *   245678  → "245.7k"
 *   2456789 → "2.46M"
 */
export function formatCompactNumber(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs < 10000) {
    // 4 digits or fewer integer part → show integer only, with commas
    return sign + Math.floor(abs).toLocaleString('en-US');
  }
  if (abs < 1_000_000) {
    // Show as k with 2 decimal places
    const k = abs / 1000;
    return sign + k.toFixed(2) + 'k';
  }
  if (abs < 1_000_000_000) {
    const m = abs / 1_000_000;
    return sign + m.toFixed(2) + 'M';
  }
  const b = abs / 1_000_000_000;
  return sign + b.toFixed(2) + 'B';
}

/**
 * Locale-aware compact number.
 * Arabic mode: Arabic-Indic digits + Arabic unit words (ألف / مليون / مليار).
 * English mode: delegates to formatCompactNumber (k / M / B).
 */
export function formatCompactNumberLocale(value: number, language: string): string {
  if (language !== 'ar') return formatCompactNumber(value);

  const abs = Math.abs(value);
  // Arabic typography: negative sign goes AFTER the number (e.g. ٥٠٠-)
  const sign = value < 0 ? '-' : '';
  const ar = (n: number | string): string =>
    String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d, 10)]);

  if (abs < 10_000) {
    return ar(Math.floor(abs).toLocaleString('en-US')) + sign;
  }
  if (abs < 1_000_000) {
    return ar((abs / 1_000).toFixed(2)) + ' ألف' + sign;
  }
  if (abs < 1_000_000_000) {
    return ar((abs / 1_000_000).toFixed(2)) + ' مليون' + sign;
  }
  return ar((abs / 1_000_000_000).toFixed(2)) + ' مليار' + sign;
}

/**
 * Like formatCompactNumber but plain number only (no currency symbol).
 * The UI layer renders the SVG currency icon separately.
 */
export function formatCompactAmount(value: number): string {
  return arabicizeIfNeeded(formatCompactNumber(value));
}

// Currency symbol map for platforms where Intl.NumberFormat doesn't support
// currencyDisplay properly (e.g. React Native / Hermes without ICU data).
const CURRENCY_SYMBOLS: Record<string, string> = {
  SAR: 'ر.س',
  EGP: 'ج.م',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'د.إ',
  KWD: 'د.ك',
  QAR: 'ر.ق',
  BHD: 'د.ب',
  OMR: 'ر.ع',
  JOD: 'د.ا',
};

function getCurrencySymbol(): string {
  return CURRENCY_SYMBOLS[_activeCurrency] ?? _activeCurrency;
}

/** Returns the symbol string to strip from Intl-formatted output. */
function _getCurrencySymbolForStrip(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? currency;
}

export function formatPercentage(value: number): string {
  return arabicizeIfNeeded(`${value.toFixed(1)}%`);
}
