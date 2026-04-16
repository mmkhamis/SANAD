/**
 * Locale-aware date & number formatting.
 *
 * Arabic mode uses Saudi-friendly month names and Hindi-Arabic numerals.
 * English mode passes through with standard formatters.
 */
import { format } from 'date-fns';
import { getLanguage } from '../store/language-store';
import { t } from '../lib/i18n';

// ─── Arabic month names (Saudi convention) ──────────────────────────

const AR_MONTHS: string[] = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

const AR_MONTHS_SHORT: string[] = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

// ─── Arabic day abbreviations ───────────────────────────────────────

const AR_DAYS_SHORT: string[] = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Convert Western digits to Hindi-Arabic digits for display in Arabic mode.
 */
export function toArabicDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d, 10)]);
}

/**
 * Format a month name from a Date or month index (0-based).
 * Returns localized month name.
 */
export function formatMonthName(dateOrIndex: Date | number): string {
  const idx = typeof dateOrIndex === 'number' ? dateOrIndex : dateOrIndex.getMonth();
  if (getLanguage() === 'ar') {
    return AR_MONTHS[idx] ?? '';
  }
  if (typeof dateOrIndex === 'number') {
    const d = new Date(2000, dateOrIndex, 1);
    return format(d, 'MMMM');
  }
  return format(dateOrIndex, 'MMMM');
}

/**
 * Format "Month Year" — e.g. "أبريل ٢٠٢٦" or "April 2026".
 */
export function formatMonthYear(date: Date): string {
  if (getLanguage() === 'ar') {
    const m = AR_MONTHS[date.getMonth()];
    const y = toArabicDigits(date.getFullYear());
    return `${m} ${y}`;
  }
  return format(date, 'MMMM yyyy');
}

/**
 * Format a short date — e.g. "١٥ أبريل" or "Apr 15".
 */
export function formatShortDate(date: Date): string {
  if (getLanguage() === 'ar') {
    const d = toArabicDigits(date.getDate());
    const m = AR_MONTHS[date.getMonth()];
    return `${d} ${m}`;
  }
  return format(date, 'MMM d');
}

/**
 * Format a full date — e.g. "١٥ أبريل ٢٠٢٦" or "April 15, 2026".
 */
export function formatFullDate(date: Date): string {
  if (getLanguage() === 'ar') {
    const d = toArabicDigits(date.getDate());
    const m = AR_MONTHS[date.getMonth()];
    const y = toArabicDigits(date.getFullYear());
    return `${d} ${m} ${y}`;
  }
  return format(date, 'MMMM d, yyyy');
}

/**
 * Format a day-month — e.g. "١٥/٤" or "4/15".
 */
export function formatDayMonth(date: Date): string {
  if (getLanguage() === 'ar') {
    const d = toArabicDigits(date.getDate());
    const m = toArabicDigits(date.getMonth() + 1);
    return `${d}/${m}`;
  }
  return format(date, 'M/d');
}

/**
 * Localize a number for display — uses Arabic digits in AR mode.
 */
export function localizeNumber(n: number | string): string {
  if (getLanguage() === 'ar') {
    return toArabicDigits(n);
  }
  return String(n);
}

/**
 * Localize a percentage — e.g. "٥٪" or "5%".
 */
export function localizePercent(n: number): string {
  if (getLanguage() === 'ar') {
    return `${toArabicDigits(Math.round(n))}٪`;
  }
  return `${Math.round(n)}%`;
}

/**
 * Get localized day labels for calendar grids.
 * MENA week starts Saturday.
 */
export function getDayLabels(): string[] {
  if (getLanguage() === 'ar') {
    return [
      t('DAY_SA'), t('DAY_SU'), t('DAY_MO'), t('DAY_TU'),
      t('DAY_WE'), t('DAY_TH'), t('DAY_FR'),
    ];
  }
  return ['Sa', 'Su', 'Mo', 'Tu', 'We', 'Th', 'Fr'];
}

/**
 * Style to flip directional icons (ArrowLeft, ChevronRight) for RTL.
 * Usage: <ArrowLeft style={getRtlFlip()} />
 */
export function getRtlFlip(): { transform: { scaleX: number }[] } | undefined {
  return getLanguage() === 'ar' ? { transform: [{ scaleX: -1 }] } : undefined;
}

/**
 * Format a relative time string — e.g. "منذ ٣ أيام" or "3 days ago".
 * Lightweight alternative to date-fns formatDistanceToNow for Arabic.
 */
export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);
  const isAr = getLanguage() === 'ar';

  if (diffMin < 1) return isAr ? 'الحين' : 'just now';
  if (diffMin < 60) return isAr ? `منذ ${toArabicDigits(diffMin)} دقيقة` : `${diffMin}m ago`;
  if (diffHr < 24) return isAr ? `منذ ${toArabicDigits(diffHr)} ساعة` : `${diffHr}h ago`;
  if (diffDay < 7) return isAr ? `منذ ${toArabicDigits(diffDay)} يوم` : `${diffDay}d ago`;
  return formatShortDate(date);
}

/**
 * Format "MMM yyyy" localized — e.g. "أبريل ٢٠٢٥" or "Apr 2025".
 */
export function formatShortMonthYear(date: Date): string {
  if (getLanguage() === 'ar') {
    const m = AR_MONTHS[date.getMonth()];
    const y = toArabicDigits(date.getFullYear());
    return `${m} ${y}`;
  }
  return format(date, 'MMM yyyy');
}

/**
 * Format "EEEE, MMM d, yyyy" localized — e.g. "الخميس، ١٥ أبريل ٢٠٢٥".
 */
export function formatLongDate(date: Date): string {
  if (getLanguage() === 'ar') {
    const dayName = AR_DAYS_SHORT[date.getDay()];
    const d = toArabicDigits(date.getDate());
    const m = AR_MONTHS[date.getMonth()];
    const y = toArabicDigits(date.getFullYear());
    return `${dayName}، ${d} ${m} ${y}`;
  }
  return format(date, 'EEEE, MMM d, yyyy');
}
