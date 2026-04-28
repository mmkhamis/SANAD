import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '../lib/supabase';
import type { TransactionType } from '../types/index';
import { normalizeMerchant } from '../utils/merchant';

const RULES_STORAGE_PREFIX = 'merchant_category_rules_v1';
const SETTINGS_STORAGE_PREFIX = 'merchant_categorization_settings_v1';
const DEFAULT_CATEGORIZE_BY_MERCHANT = true;

export interface MerchantCategoryRule {
  merchant_key: string;
  merchant_name: string;
  type: TransactionType;
  category_id: string;
  category_name: string;
  category_icon: string;
  category_color: string;
  updated_at: string;
}

export interface UpsertMerchantCategoryRuleInput {
  merchant: string;
  type: TransactionType;
  category_id: string;
  category_name: string;
  category_icon: string;
  category_color: string;
}

function removeDiacritics(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u064B-\u065F\u0670]/g, '');
}

export function normalizeMerchantKey(merchant: string): string {
  const canonical = normalizeMerchant(merchant) ?? merchant;
  return removeDiacritics(canonical)
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function getScopedStorageKey(prefix: string): Promise<string> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? 'anon';
    return `${prefix}:${userId}`;
  } catch {
    return `${prefix}:anon`;
  }
}

async function readRules(): Promise<MerchantCategoryRule[]> {
  const storageKey = await getScopedStorageKey(RULES_STORAGE_PREFIX);
  try {
    const raw = await AsyncStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as MerchantCategoryRule[];
  } catch {
    return [];
  }
}

async function writeRules(rules: MerchantCategoryRule[]): Promise<void> {
  const storageKey = await getScopedStorageKey(RULES_STORAGE_PREFIX);
  await AsyncStorage.setItem(storageKey, JSON.stringify(rules));
}

export async function fetchMerchantCategoryRules(): Promise<MerchantCategoryRule[]> {
  return readRules();
}

export async function upsertMerchantCategoryRule(
  input: UpsertMerchantCategoryRuleInput,
): Promise<MerchantCategoryRule> {
  const merchantName = input.merchant.trim();
  if (!merchantName) {
    throw new Error('Merchant name is required');
  }

  const merchantKey = normalizeMerchantKey(merchantName);
  if (!merchantKey) {
    throw new Error('Merchant key is empty');
  }

  const nextRule: MerchantCategoryRule = {
    merchant_key: merchantKey,
    merchant_name: normalizeMerchant(merchantName) ?? merchantName,
    type: input.type,
    category_id: input.category_id,
    category_name: input.category_name,
    category_icon: input.category_icon,
    category_color: input.category_color,
    updated_at: new Date().toISOString(),
  };

  const rules = await readRules();
  const existingIndex = rules.findIndex(
    (rule) => rule.type === nextRule.type && rule.merchant_key === nextRule.merchant_key,
  );

  if (existingIndex >= 0) {
    rules[existingIndex] = nextRule;
  } else {
    rules.unshift(nextRule);
  }

  await writeRules(rules);
  return nextRule;
}

export function findMerchantCategoryRuleInList(
  rules: MerchantCategoryRule[] | undefined,
  merchant: string | null | undefined,
  type: TransactionType,
): MerchantCategoryRule | null {
  if (!merchant?.trim() || !rules?.length) return null;
  const key = normalizeMerchantKey(merchant);
  if (!key) return null;
  return rules.find((rule) => rule.type === type && rule.merchant_key === key) ?? null;
}

export async function findMerchantCategoryRule(
  merchant: string | null | undefined,
  type: TransactionType,
): Promise<MerchantCategoryRule | null> {
  if (!merchant?.trim()) return null;
  const rules = await readRules();
  return findMerchantCategoryRuleInList(rules, merchant, type);
}

interface MerchantCategorizationSettings {
  enabled: boolean;
  updated_at: string;
}

async function readSettings(): Promise<MerchantCategorizationSettings> {
  const storageKey = await getScopedStorageKey(SETTINGS_STORAGE_PREFIX);
  try {
    const raw = await AsyncStorage.getItem(storageKey);
    if (!raw) {
      return {
        enabled: DEFAULT_CATEGORIZE_BY_MERCHANT,
        updated_at: new Date(0).toISOString(),
      };
    }
    const parsed = JSON.parse(raw) as Partial<MerchantCategorizationSettings>;
    return {
      enabled: parsed.enabled ?? DEFAULT_CATEGORIZE_BY_MERCHANT,
      updated_at: parsed.updated_at ?? new Date(0).toISOString(),
    };
  } catch {
    return {
      enabled: DEFAULT_CATEGORIZE_BY_MERCHANT,
      updated_at: new Date(0).toISOString(),
    };
  }
}

export async function getMerchantCategorizationEnabled(): Promise<boolean> {
  const settings = await readSettings();
  return settings.enabled;
}

export async function setMerchantCategorizationEnabled(enabled: boolean): Promise<boolean> {
  const storageKey = await getScopedStorageKey(SETTINGS_STORAGE_PREFIX);
  const payload: MerchantCategorizationSettings = {
    enabled,
    updated_at: new Date().toISOString(),
  };
  await AsyncStorage.setItem(storageKey, JSON.stringify(payload));
  return enabled;
}
