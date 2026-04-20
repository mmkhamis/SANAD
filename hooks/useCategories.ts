import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '../lib/query-client';
import {
  fetchCategories,
  fetchCategoriesByType,
  fetchGroupedCategoriesByType,
  createCategory,
  createGroupWithCategories,
  deleteCategory,
  type CreateCategoryInput,
  type CreateGroupWithCategoriesInput,
} from '../services/category-service';
import type { Category, CategoryGroup, GroupedCategories, TransactionType } from '../types/index';
import { useAuthStore } from '../store/auth-store';

// ─── Fetch all categories ────────────────────────────────────────────

interface UseCategoriesResult {
  data: Category[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useCategories(): UseCategoriesResult {
  const { data, isLoading, isError, error, refetch } = useQuery<Category[], Error>({
    queryKey: QUERY_KEYS.categories,
    queryFn: fetchCategories,
    staleTime: 15 * 60 * 1000,
    enabled: useAuthStore.getState().isAuthenticated,
  });

  return { data, isLoading, isError, error, refetch };
}

// ─── Fetch categories by type ────────────────────────────────────────

export function useCategoriesByType(type: TransactionType): UseCategoriesResult {
  const { data, isLoading, isError, error, refetch } = useQuery<Category[], Error>({
    queryKey: [...QUERY_KEYS.categories, type],
    queryFn: () => fetchCategoriesByType(type),
    staleTime: 15 * 60 * 1000,
    enabled: useAuthStore.getState().isAuthenticated,
  });

  return { data, isLoading, isError, error, refetch };
}

// ─── Fetch grouped categories by type ────────────────────────────────

interface UseGroupedCategoriesResult {
  data: GroupedCategories[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useGroupedCategoriesByType(type: TransactionType): UseGroupedCategoriesResult {
  const { data, isLoading, isError, error } = useQuery<GroupedCategories[], Error>({
    queryKey: [...QUERY_KEYS.categories, 'grouped', type],
    queryFn: () => fetchGroupedCategoriesByType(type),
    staleTime: 15 * 60 * 1000,
    enabled: useAuthStore.getState().isAuthenticated,
  });

  return { data, isLoading, isError, error };
}

// ─── Create category mutation ────────────────────────────────────────

interface UseCreateCategoryResult {
  mutate: (input: CreateCategoryInput) => void;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
}

export function useCreateCategory(): UseCreateCategoryResult {
  const qc = useQueryClient();

  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.categories });
    },
  });

  return { mutate, isPending, isError, error: error as Error | null };
}

// ─── Delete category mutation ────────────────────────────────────────

interface UseDeleteCategoryResult {
  mutate: (id: string) => void;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
}

export function useDeleteCategory(): UseDeleteCategoryResult {
  const qc = useQueryClient();

  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: deleteCategory,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: QUERY_KEYS.categories });
      const prev = qc.getQueryData(QUERY_KEYS.categories);
      qc.setQueryData(QUERY_KEYS.categories, (old: any) =>
        Array.isArray(old) ? old.filter((c: any) => c.id !== id) : old,
      );
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) qc.setQueryData(QUERY_KEYS.categories, context.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.categories });
    },
  });

  return { mutate, isPending, isError, error: error as Error | null };
}

// ─── Create category group with subcategories mutation ───────────────

interface UseCreateCategoryGroupResult {
  mutateAsync: (input: CreateGroupWithCategoriesInput) => Promise<{ group: CategoryGroup; categories: Category[] }>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
}

export function useCreateCategoryGroup(): UseCreateCategoryGroupResult {
  const qc = useQueryClient();

  const { mutateAsync, isPending, isError, error } = useMutation({
    mutationFn: createGroupWithCategories,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.categories });
    },
  });

  return { mutateAsync, isPending, isError, error: error as Error | null };
}
