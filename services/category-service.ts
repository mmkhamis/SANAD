import { supabase } from '../lib/supabase';
import type { Category, CategoryGroup, GroupedCategories, TransactionType } from '../types/index';
import {
  CATEGORY_TAXONOMY,
  CATEGORY_TAXONOMY_BY_KEY,
  SUBCATEGORY_TAXONOMY_BY_KEY,
  isSubcategoryVisibleForCountry,
  type CategoryTaxonomyCategory,
  type FlattenedTaxonomySubcategory,
} from '../constants/category-taxonomy';

// ─── Fetch all category groups for the current user ──────────────────

export async function fetchCategoryGroups(): Promise<CategoryGroup[]> {
  const { data, error } = await supabase
    .from('category_groups')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return (data as CategoryGroup[]) ?? [];
}

// ─── Fetch all categories for the current user ──────────────────────

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('is_default', { ascending: false })
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return (data as Category[]) ?? [];
}

// ─── Fetch categories filtered by transaction type ───────────────────

export async function fetchCategoriesByType(
  type: TransactionType,
): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('type', type)
    .order('is_default', { ascending: false })
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return (data as Category[]) ?? [];
}

// ─── Fetch grouped categories by type ────────────────────────────────

export async function fetchGroupedCategoriesByType(
  type: TransactionType,
): Promise<GroupedCategories[]> {
  const [groups, categories] = await Promise.all([
    fetchCategoryGroups(),
    fetchCategoriesByType(type),
  ]);

  const typeGroups = groups.filter((g) => g.type === type);
  const grouped: GroupedCategories[] = [];

  for (const group of typeGroups) {
    const cats = categories.filter((c) => c.group_id === group.id);
    if (cats.length > 0) {
      grouped.push({ group, categories: cats });
    }
  }

  // Ungrouped categories
  const ungrouped = categories.filter((c) => !c.group_id);
  if (ungrouped.length > 0) {
    grouped.push({
      group: {
        id: '__ungrouped__',
        user_id: '',
        name: 'Other',
        icon: '📦',
        color: '#94A3B8',
        type,
        sort_order: 999,
        is_default: false,
        taxonomy_key: null,
        created_at: '',
      },
      categories: ungrouped,
    });
  }

  return grouped;
}

// ─── Create a new category group ─────────────────────────────────────

export interface CreateCategoryGroupInput {
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
}

export interface CreateGroupWithCategoriesInput {
  group: CreateCategoryGroupInput;
  categories: Array<{ name: string; icon: string; color: string }>;
}

export async function createCategoryGroup(
  input: CreateCategoryGroupInput,
): Promise<CategoryGroup> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('No authenticated session');

  const { data, error } = await supabase
    .from('category_groups')
    .insert({
      user_id: session.user.id,
      name: input.name,
      icon: input.icon,
      color: input.color,
      type: input.type,
      sort_order: 100,
      is_default: false,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as CategoryGroup;
}

export async function createGroupWithCategories(
  input: CreateGroupWithCategoriesInput,
): Promise<{ group: CategoryGroup; categories: Category[] }> {
  const group = await createCategoryGroup(input.group);

  const categories: Category[] = [];
  if (input.categories.length > 0) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) throw new Error('No authenticated session');

    const rows = input.categories.map((c) => ({
      user_id: session.user.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      type: input.group.type,
      group_id: group.id,
    }));

    const { data, error } = await supabase
      .from('categories')
      .insert(rows)
      .select();

    if (error) throw new Error(error.message);
    categories.push(...((data as Category[]) ?? []));
  }

  return { group, categories };
}

// ─── Create a new category ───────────────────────────────────────────

export interface CreateCategoryInput {
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  budget_limit?: number | null;
  group_id?: string | null;
}

export async function createCategory(
  input: CreateCategoryInput,
): Promise<Category> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) {
    throw new Error('No authenticated session');
  }

  const { data, error } = await supabase
    .from('categories')
    .insert({
      user_id: session.user.id,
      name: input.name,
      icon: input.icon,
      color: input.color,
      type: input.type,
      budget_limit: input.budget_limit ?? null,
      group_id: input.group_id ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Category;
}

// ─── Update a category ──────────────────────────────────────────────

export async function updateCategory(
  id: string,
  input: Partial<CreateCategoryInput>,
): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Category;
}

// ─── Delete a category ──────────────────────────────────────────────

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
}

// ─── Taxonomy lookup helpers ─────────────────────────────────────────

export function getTaxonomyCategory(key: string): CategoryTaxonomyCategory | undefined {
  return CATEGORY_TAXONOMY_BY_KEY[key];
}

export function getTaxonomySubcategory(key: string): FlattenedTaxonomySubcategory | undefined {
  return SUBCATEGORY_TAXONOMY_BY_KEY[key];
}

export function getCategoryTaxonomyMeta(category: Category): CategoryTaxonomyCategory | undefined {
  if (!category.taxonomy_key) return undefined;
  // Try as subcategory first to get the parent category
  const sub = SUBCATEGORY_TAXONOMY_BY_KEY[category.taxonomy_key];
  if (sub) return CATEGORY_TAXONOMY_BY_KEY[sub.parentKey];
  return undefined;
}

export function getGroupTaxonomyMeta(group: CategoryGroup): CategoryTaxonomyCategory | undefined {
  if (!group.taxonomy_key) return undefined;
  return CATEGORY_TAXONOMY_BY_KEY[group.taxonomy_key];
}

// ─── Fetch category by taxonomy key ──────────────────────────────────

export async function fetchCategoryByTaxonomyKey(
  taxonomyKey: string,
): Promise<Category | null> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('taxonomy_key', taxonomyKey)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as Category | null;
}

// ─── Default seed data derived from taxonomy ─────────────────────────

interface DefaultGroup {
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income';
  sortOrder: number;
  taxonomyKey: string;
  categories: { name: string; icon: string; color: string; taxonomyKey: string }[];
}

function buildDefaultGroups(countryCode: string | null = null): DefaultGroup[] {
  let sortOrder = 0;
  return CATEGORY_TAXONOMY
    .filter((cat) => cat.type === 'income' || cat.type === 'expense' || cat.type === 'savings')
    .map((cat) => {
      const filteredSubs = cat.subcategories.filter((sub) =>
        isSubcategoryVisibleForCountry(sub, countryCode),
      );
      sortOrder += 1;
      return {
        name: cat.label,
        icon: cat.icon ?? 'circle',
        color: cat.color,
        type: (cat.type === 'savings' ? 'expense' : cat.type) as 'expense' | 'income',
        sortOrder,
        taxonomyKey: cat.key,
        categories: filteredSubs.map((sub) => ({
          name: sub.label,
          icon: sub.icon ?? cat.icon ?? 'circle',
          color: cat.color,
          taxonomyKey: sub.key,
        })),
      };
    })
    .filter((g) => g.categories.length > 0);
}

/**
 * Seeds default category groups and categories for a new user.
 * Source of truth: constants/category-taxonomy.ts
 * Safe to call multiple times — skips if user already has categories.
 * @param countryCode ISO country code (e.g. 'SA', 'EG') to filter region-specific categories
 */
export async function seedDefaultCategories(countryCode: string | null = null): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return;

  const userId = session.user.id;

  const existing = await fetchCategories();
  if (existing.length > 0) return;

  const groups = buildDefaultGroups(countryCode);

  for (const group of groups) {
    const { data: groupRow, error: gErr } = await supabase
      .from('category_groups')
      .insert({
        user_id: userId,
        name: group.name,
        icon: group.icon,
        color: group.color,
        type: group.type,
        sort_order: group.sortOrder,
        is_default: true,
        taxonomy_key: group.taxonomyKey,
      })
      .select('id')
      .single();

    if (gErr) throw new Error(gErr.message);

    const catRows = group.categories.map((c) => ({
      user_id: userId,
      name: c.name,
      icon: c.icon,
      color: c.color,
      type: group.type,
      is_default: true,
      group_id: groupRow.id,
      taxonomy_key: c.taxonomyKey,
    }));

    const { error: cErr } = await supabase.from('categories').insert(catRows);
    if (cErr) throw new Error(cErr.message);
  }
}
