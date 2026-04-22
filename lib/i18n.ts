/**
 * Minimal i18n — returns the right string set based on the active language.
 *
 * Usage:
 *   const t = useT();
 *   <Text>{t('DASHBOARD_TITLE')}</Text>
 *
 * Category translation is dialect-aware:
 *   - Egypt (country EG or currency EGP)  → Egyptian Arabic labels
 *   - Gulf countries (SA, AE, KW, QA, BH, OM)  → Gulf Arabic labels
 * Dialect is selected by country_code first, then falls back to currency.
 * No call-site changes needed; translateCategory / useTranslateCategory
 * pick the right dialect automatically.
 */
import { useLanguageStore } from '../store/language-store';
import { useSettingsStore } from '../store/settings-store';
import { STRINGS } from '../constants/strings';
import { STRINGS_AR } from '../constants/strings.ar';
import { CATEGORY_NAMES_AR } from '../constants/category-names.ar';
import { CATEGORY_NAMES_AR_EG } from '../constants/category-names.ar.eg';

type StringKey = keyof typeof STRINGS;

// Merged map for Egypt: Gulf baseline + Egyptian overrides.
// Built once at module load — O(1) lookups at runtime.
const CATEGORY_NAMES_AR_EG_MERGED: Record<string, string> = {
  ...CATEGORY_NAMES_AR,
  ...CATEGORY_NAMES_AR_EG,
};

/** Returns true if the user is an Egyptian dialect user (by country or currency). */
function isEgyptianDialect(): boolean {
  const { countryCode, activeCurrency } = useSettingsStore.getState();
  return countryCode === 'EG' || activeCurrency === 'EGP';
}

/** Returns the Arabic category map for the user's dialect. */
function getCategoryMap(): Record<string, string> {
  return isEgyptianDialect()
    ? CATEGORY_NAMES_AR_EG_MERGED
    : CATEGORY_NAMES_AR;
}

/**
 * Case-insensitive lookup in a category translation map.
 * Tries exact match first, then lowercase comparison.
 * Handles DB data that may have been seeded with different casing.
 */
function lookupCategory(map: Record<string, string>, name: string | null | undefined): string | undefined {
  if (!name) return undefined;
  if (map[name]) return map[name];
  const lower = name.toLowerCase();
  const key = Object.keys(map).find((k) => k.toLowerCase() === lower);
  return key ? map[key] : undefined;
}

// ─── UI string helpers ────────────────────────────────────────────────────────

/**
 * Hook: returns a translation function for the active language.
 * Falls back to English for any key not yet translated.
 */
export function useT(): (key: StringKey) => string {
  const language = useLanguageStore((s) => s.language);
  return (key: StringKey): string => {
    if (language === 'ar') {
      return (STRINGS_AR as Record<string, string>)[key] ?? STRINGS[key];
    }
    return STRINGS[key];
  };
}

/**
 * Non-hook version — for use in utilities and services.
 */
export function t(key: StringKey): string {
  const language = useLanguageStore.getState().language;
  if (language === 'ar') {
    return (STRINGS_AR as Record<string, string>)[key] ?? STRINGS[key];
  }
  return STRINGS[key];
}

/**
 * Non-hook template formatter: replaces `{var}` tokens in the catalog string
 * with the given values. Example:
 *   tFormat('TRASH_DELETE_CONFIRM_TEMPLATE', { label: txn.description })
 */
export function tFormat(key: StringKey, vars: Record<string, string | number>): string {
  const template = t(key);
  return template.replace(/\{(\w+)\}/g, (_, name) => {
    const v = vars[name];
    return v === undefined || v === null ? '' : String(v);
  });
}

// ─── Category name translation (dialect-aware) ────────────────────────────────

/**
 * Non-hook: translate a category name to the active language + dialect.
 * Gulf currencies → Gulf Arabic. EGP → Egyptian Arabic.
 * Returns null in Arabic mode when no translation exists (so callers can show UNCATEGORIZED).
 */
export function translateCategory(name: string | null | undefined): string | null {
  if (!name) return null;
  const language = useLanguageStore.getState().language;
  if (language === 'ar') {
    return lookupCategory(getCategoryMap(), name) ?? null;
  }
  return name;
}

/**
 * Hook: reactive version of translateCategory.
 * Re-renders automatically when language, currency, or country changes.
 */
export function useTranslateCategory(): (name: string | null | undefined) => string | null {
  const language = useLanguageStore((s) => s.language);
  const countryCode = useSettingsStore((s) => s.countryCode);
  const currency = useSettingsStore((s) => s.activeCurrency);

  return (name: string | null | undefined): string | null => {
    if (!name) return null;
    if (language === 'ar') {
      const isEgypt = countryCode === 'EG' || currency === 'EGP';
      const map = isEgypt ? CATEGORY_NAMES_AR_EG_MERGED : CATEGORY_NAMES_AR;
      return lookupCategory(map, name) ?? null;
    }
    return name;
  };
}
