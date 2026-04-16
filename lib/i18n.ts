/**
 * Minimal i18n — returns the right string set based on the active language.
 *
 * Usage:
 *   const t = useT();
 *   <Text>{t('DASHBOARD_TITLE')}</Text>
 */
import { useLanguageStore } from '../store/language-store';
import { STRINGS } from '../constants/strings';
import { STRINGS_AR } from '../constants/strings.ar';
import { CATEGORY_NAMES_AR } from '../constants/category-names.ar';

type StringKey = keyof typeof STRINGS;

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
 * Translate a category name to the active language.
 * Returns the original name if no translation exists.
 */
export function translateCategory(name: string): string {
  const language = useLanguageStore.getState().language;
  if (language === 'ar') {
    return CATEGORY_NAMES_AR[name] ?? name;
  }
  return name;
}

/**
 * Hook version of translateCategory.
 */
export function useTranslateCategory(): (name: string) => string {
  const language = useLanguageStore((s) => s.language);
  return (name: string): string => {
    if (language === 'ar') {
      return CATEGORY_NAMES_AR[name] ?? name;
    }
    return name;
  };
}
