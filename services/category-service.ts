import { supabase } from '../lib/supabase';
import type { Category, CategoryGroup, GroupedCategories, TransactionType } from '../types/index';
import {
  CATEGORY_TAXONOMY,
  CATEGORY_TAXONOMY_BY_KEY,
  SUBCATEGORY_TAXONOMY_BY_KEY,
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

// ─── Taxonomy → Emoji icon map for DB storage ───────────────────────

const GROUP_EMOJI: Record<string, string> = {
  income: '💰', bills_utilities: '🧾', housing_home: '🏠',
  food_dining: '🍽️', transport: '🚗', shopping: '🛍️',
  health_medical: '🏥', education: '🎓', family_children: '👨‍👩‍👧‍👦',
  entertainment_lifestyle: '🎬', subscriptions_digital: '🔄',
  savings_goals: '🏦', investments: '📈', debt_obligations: '💳',
  travel: '✈️', religion_charity_social: '🕌',
  business_work_expenses: '💼', luxury_status: '👑',
  pets: '🐾', miscellaneous: '📦', transfers: '↔️',
};

const SUB_EMOJI: Record<string, string> = {
  // Income
  salary: '💰', bonus: '🎁', freelance: '💻', business_profit: '🏢',
  rental_income: '🏠', investment_income: '📈', family_support_in: '🤝',
  gift_received: '🎀', refund_rebate: '🔄', other_income: '💵',
  // Bills
  electricity: '⚡', water: '💧', gas: '🔥', internet: '🌐',
  mobile: '📱', landline: '☎️', tv_satellite: '📡', building_fees: '🏢',
  // Housing
  rent: '🏠', mortgage: '🏦', home_maintenance: '🔧', furniture: '🛋️',
  home_appliances: '🏠', cleaning_supplies: '🧹', home_decor: '🖼️',
  security_services: '🔒',
  // Food & Dining
  groceries: '🛒', bakery: '🍞', meat_seafood: '🥩', restaurants: '🍽️',
  cafes_coffee: '☕', food_delivery: '🛵', snacks_sweets: '🍰',
  water_beverages: '🥤',
  // Transport
  fuel: '⛽', uber_taxi: '🚕', public_transport: '🚌', parking: '🅿️',
  tolls: '🛣️', car_maintenance: '🔧', car_insurance: '🛡️',
  registration_licensing: '📋',
  // Shopping
  fashion: '👕', shoes: '👟', bags_accessories: '👜', jewelry: '💎',
  watches: '⌚', electronics: '📱', general_shopping: '📦', gifts: '🎁',
  // Health
  doctor_visits: '🩺', medicines: '💊', lab_tests: '🧪', hospital: '🏥',
  dental: '🦷', vision: '👓', therapy_fitness: '🏋️', health_insurance: '🛡️',
  // Education
  school_fees: '🎓', university: '🏫', courses_training: '💻',
  books_supplies: '📖', tutoring: '👨‍🏫', exam_fees: '📝',
  school_transport: '🚌', language_learning: '🗣️',
  // Family
  childcare: '👶', baby_supplies: '🍼', kids_clothing: '👗',
  allowances: '💵', family_support_out: '🤝', school_needs: '🎒',
  kids_activities: '🎪', maternity: '❤️',
  // Entertainment
  cinema_events: '🎬', gaming: '🎮', hobbies: '🎨',
  beauty_grooming: '💇', sports_clubs: '🏋️', social_outings: '🎉',
  smoking_shisha: '💨', personal_care: '💆',
  // Subscriptions
  netflix: '📺', shahid_vip: '📺', disney_plus: '🎬', spotify: '🎵',
  youtube_premium: '▶️', anghami: '🎶', icloud_storage: '☁️',
  adobe: '🎨', microsoft: '💻', chatgpt_ai_tools: '🤖',
  vpn_security: '🔐', other_digital: '🌐',
  // Savings
  emergency_fund: '🆘', general_savings: '🏦', home_goal: '🏠',
  car_goal: '🚗', wedding_goal: '💍', education_goal: '🎓',
  travel_goal: '✈️', hajj_umrah_goal: '🕋',
  // Investments
  stocks: '📈', etfs_funds: '📊', crypto: '₿', gold_silver: '🪙',
  real_estate_investment: '🏗️', private_business: '🏢',
  retirement: '🏖️', investment_fees: '📄',
  // Debt
  credit_card_payment: '💳', personal_loan: '🏦', mortgage_payment: '🏠',
  car_loan: '🚗', installments_bnpl: '🛒', taxes_fees: '🏛️',
  legal_support: '⚖️', alimony_support: '🤝',
  // Travel
  flights: '✈️', hotels: '🏨', visa_fees: '🛂', travel_transport: '🚐',
  travel_food: '🍜', travel_shopping: '🎒', travel_insurance: '🛡️',
  hajj_umrah_trip: '🕋',
  // Religion / Charity
  zakat: '🤲', sadaqah: '💚', mosque_community: '🕌',
  eid_social_giving: '🌙', family_occasions: '🎊', funeral_support: '🌸',
  religious_courses: '📕', qurbani: '🐑',
  // Business
  office_supplies: '📎', software_tools: '💿', business_travel: '✈️',
  marketing_ads: '📣', shipping_logistics: '📮',
  professional_services: '🤝', coworking_office_rent: '🏢',
  internet_phone_work: '📱',
  // Luxury
  designer_fashion: '✨', luxury_bags: '👜', watches_premium: '⌚',
  fine_dining: '🍷', premium_travel: '✈️', vip_events: '⭐',
  collectibles: '💎', luxury_home: '🏠',
  // Pets
  pet_food: '🦴', vet: '🩺', pet_supplies: '📦', grooming: '✂️',
  boarding: '🏠', pet_toys: '🧸',
  // Miscellaneous
  cash_withdrawal: '💵', bank_fees: '🏛️', fines_penalties: '⚠️',
  unexpected_expense: '⚡', uncategorized: '❓', fees_commissions: '🧾',
  loss_damage: '🛡️', other_misc: '📦',
  // Transfers
  between_accounts: '🔄', cash_to_bank: '🏦', bank_to_cash: '💵',
  wallet_top_up: '📱', savings_transfer: '🏦', investment_transfer: '📈',
};

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

function buildDefaultGroups(): DefaultGroup[] {
  let sortOrder = 0;
  return CATEGORY_TAXONOMY
    .filter((cat) => cat.type === 'income' || cat.type === 'expense' || cat.type === 'savings')
    .map((cat) => {
      sortOrder += 1;
      return {
        name: cat.label,
        icon: GROUP_EMOJI[cat.key] ?? '📁',
        color: cat.color,
        type: (cat.type === 'savings' ? 'expense' : cat.type) as 'expense' | 'income',
        sortOrder,
        taxonomyKey: cat.key,
        categories: cat.subcategories.map((sub) => ({
          name: sub.label,
          icon: SUB_EMOJI[sub.key] ?? '📝',
          color: cat.color,
          taxonomyKey: sub.key,
        })),
      };
    });
}

/**
 * Seeds default category groups and categories for a new user.
 * Source of truth: constants/category-taxonomy.ts
 * Safe to call multiple times — skips if user already has categories.
 */
export async function seedDefaultCategories(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return;

  const userId = session.user.id;

  const existing = await fetchCategories();
  if (existing.length > 0) return;

  const groups = buildDefaultGroups();

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
