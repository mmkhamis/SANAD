import { format, startOfMonth, endOfMonth } from 'date-fns';

import { supabase } from '../lib/supabase';
import { fetchCategories } from './category-service';
import type {
  AgeBand,
  SpendingBenchmark,
  BenchmarkComparison,
  BenchmarkSummary,
} from '../types/index';

// ─── Refresh benchmark data via Postgres function ────────────────────

async function refreshBenchmarks(month: string): Promise<void> {
  const { error } = await supabase.rpc('refresh_spending_benchmarks', {
    target_month: month,
  });
  if (error) {
    console.warn('[benchmarks] refresh failed:', error.message);
  }
}

// ─── Fetch benchmark rows for a cohort + month ──────────────────────
// Benchmarks are pre-computed from anonymized internal Wallet user data.

async function fetchBenchmarkRows(
  month: string,
  ageBand: AgeBand,
  countryCode: string,
  regionName: string,
): Promise<SpendingBenchmark[]> {
  const { data, error } = await supabase
    .from('spending_benchmarks')
    .select('*')
    .eq('month', month)
    .eq('age_band', ageBand)
    .eq('country_code', countryCode)
    .eq('region_name', regionName);

  if (error) throw new Error(error.message);
  return (data as SpendingBenchmark[]) ?? [];
}

// ─── Fetch user spending by category_name for a month ────────────────

async function fetchUserSpendingByName(
  month: string,
): Promise<Map<string, number>> {
  const refDate = new Date(`${month}-01`);
  const start = format(startOfMonth(refDate), 'yyyy-MM-dd');
  const end = format(endOfMonth(refDate), 'yyyy-MM-dd');

  const { data, error } = await supabase
    .from('transactions')
    .select('amount, category_name')
    .is('deleted_at', null)
    .eq('exclude_from_insights', false)
    .eq('type', 'expense')
    .gte('date', start)
    .lte('date', end);

  if (error) throw new Error(error.message);

  const map = new Map<string, number>();
  for (const tx of data ?? []) {
    if (tx.category_name) {
      map.set(tx.category_name, (map.get(tx.category_name) ?? 0) + tx.amount);
    }
  }
  return map;
}

// ─── Generate short insight text ─────────────────────────────────────

function generateInsight(
  categoryName: string,
  diffPercent: number,
): string {
  const absDiff = Math.abs(Math.round(diffPercent));
  if (absDiff <= 5) {
    return `${categoryName} spending is close to your age-and-region benchmark.`;
  }
  if (diffPercent > 0) {
    return `You spent ${absDiff}% above your benchmark in ${categoryName}.`;
  }
  return `${categoryName} is ${absDiff}% below benchmark this month.`;
}

// ─── Main: fetch benchmark summary ───────────────────────────────────

export async function fetchBenchmarkSummary(
  month: string,
): Promise<BenchmarkSummary> {
  // Get current user profile
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) {
    return emptyResult(month);
  }

  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('age_band, country_code, region_name')
    .eq('id', session.user.id)
    .single();

  if (profErr || !profile) {
    return emptyResult(month);
  }

  const { age_band, country_code, region_name } = profile;

  // If user hasn't set demographic data, return early with has_profile=false
  if (!age_band || !country_code || !region_name) {
    return {
      comparisons: [],
      age_band: '25-34',
      country_code: '',
      region_name: '',
      month,
      has_profile: false,
      has_data: false,
    };
  }

  let [benchmarks, userSpending, categories] = await Promise.all([
    fetchBenchmarkRows(month, age_band as AgeBand, country_code, region_name),
    fetchUserSpendingByName(month),
    fetchCategories(),
  ]);

  // Always refresh benchmarks so they reflect latest transactions
  await refreshBenchmarks(month);
  benchmarks = await fetchBenchmarkRows(month, age_band as AgeBand, country_code, region_name);

  if (benchmarks.length === 0) {
    return {
      comparisons: [],
      age_band: age_band as AgeBand,
      country_code,
      region_name,
      month,
      has_profile: true,
      has_data: false,
    };
  }

  // Build a name → category lookup so we can show icon/color
  const categoryByName = new Map(
    categories.map((c) => [c.name, c]),
  );

  const comparisons: BenchmarkComparison[] = [];

  for (const b of benchmarks) {
    const userSpend = userSpending.get(b.category_name) ?? 0;
    const cat = categoryByName.get(b.category_name);

    // Skip benchmarks with very small samples (extra safety)
    if (b.sample_size < 3) continue;

    const diffPercent =
      b.average_spend > 0
        ? ((userSpend - b.average_spend) / b.average_spend) * 100
        : userSpend > 0
        ? 100
        : 0;

    comparisons.push({
      category_name: b.category_name,
      category_icon: cat?.icon ?? '📊',
      category_color: cat?.color ?? '#94A3B8',
      user_spend: Math.round(userSpend),
      benchmark_median: Math.round(b.median_spend),
      benchmark_average: Math.round(b.average_spend),
      sample_size: b.sample_size,
      diff_percent: diffPercent,
      insight: generateInsight(b.category_name, diffPercent),
    });
  }

  // Sort: largest overspend first
  comparisons.sort((a, b) => b.diff_percent - a.diff_percent);

  return {
    comparisons,
    age_band: age_band as AgeBand,
    country_code,
    region_name,
    month,
    has_profile: true,
    has_data: true,
  };
}

function emptyResult(month: string): BenchmarkSummary {
  return {
    comparisons: [],
    age_band: '25-34',
    country_code: '',
    region_name: '',
    month,
    has_profile: false,
    has_data: false,
  };
}
