import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Check, ChevronLeft, Plus } from 'lucide-react-native';
import { CategoryIcon } from '../ui/CategoryIcon';

import { impactLight } from '../../utils/haptics';
import { useTranslateCategory, useT } from '../../lib/i18n';
import { useRTL } from '../../hooks/useRTL';

import { useGroupedCategoriesByType, useCategoriesByType } from '../../hooks/useCategories';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useSubscription } from '../../hooks/useSubscription';
import { getLevel } from '../../lib/plan';
import type { Category, GroupedCategories, TransactionType } from '../../types/index';

// ─── Props ───────────────────────────────────────────────────────────

interface CategoryPickerProps {
  type: TransactionType;
  selectedId: string | null;
  onSelect: (category: Category) => void;
  /** Optional pre-fetched categories. When provided, skips internal fetch. */
  categories?: Category[];
  /** When true, shows flat list instead of grouped. Useful for legacy flows. */
  flat?: boolean;
  /** Called when the user taps "+ New Group" tile. Parent handles the sheet. */
  onRequestCreateGroup?: () => void;
}

// ─── Flat Category Picker (backward-compatible) ──────────────────────

function FlatCategoryList({
  categories,
  selectedId,
  onSelect,
}: {
  categories: Category[];
  selectedId: string | null;
  onSelect: (category: Category) => void;
}): React.ReactElement {
  const colors = useThemeColors();
  const tc = useTranslateCategory();
  const { rowDir } = useRTL();
  return (
    <View style={{ flexDirection: rowDir, flexWrap: 'wrap', gap: 8 }}>
      {categories.map((category) => {
        const isSelected = category.id === selectedId;
        return (
          <Pressable
            key={category.id}
            onPress={() => { impactLight(); onSelect(category); }}
            style={{
              flexDirection: rowDir,
              alignItems: 'center',
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 8,
              backgroundColor: isSelected ? category.color + '18' : colors.surface,
              borderWidth: 1.5,
              borderColor: isSelected ? category.color : colors.borderLight,
            }}
          >
            <View style={{ marginEnd: 6 }}><CategoryIcon name={category.icon} size={18} color={isSelected ? category.color : colors.textSecondary} /></View>
            <Text
              style={{
                fontSize: 14,
                fontWeight: isSelected ? '600' : '500',
                color: isSelected ? category.color : colors.textPrimary,
              }}
            >
              {tc(category.name) ?? category.name}
            </Text>
            {isSelected ? (
              <View className="ml-2">
                <Check size={14} color={category.color} strokeWidth={3} />
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Group Grid (Step 1: pick a parent category) ─────────────────────

function GroupGrid({
  groups,
  selectedGroupId,
  onSelectGroup,
  onRequestCreateGroup,
}: {
  groups: GroupedCategories[];
  selectedGroupId: string | null;
  onSelectGroup: (group: GroupedCategories) => void;
  onRequestCreateGroup?: () => void;
}): React.ReactElement {
  const colors = useThemeColors();
  const tc = useTranslateCategory();
  const t = useT();
  const { rowDir } = useRTL();
  return (
    <View style={{ flexDirection: rowDir, flexWrap: 'wrap', gap: 8 }}>
      {groups.map((g) => {
        const isActive = g.group.id === selectedGroupId;
        return (
          <Pressable
            key={g.group.id}
            onPress={() => { impactLight(); onSelectGroup(g); }}
            style={{
              width: '31%',
              alignItems: 'center',
              paddingVertical: 12,
              paddingHorizontal: 4,
              borderRadius: 14,
              backgroundColor: isActive ? g.group.color + '15' : colors.surfaceSecondary,
              borderWidth: 1.5,
              borderColor: isActive ? g.group.color : 'transparent',
            }}
          >
            <CategoryIcon name={g.group.icon} size={24} color={isActive ? g.group.color : colors.textSecondary} />
            <Text
              numberOfLines={1}
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: isActive ? g.group.color : colors.textPrimary,
                marginTop: 4,
                textAlign: 'center',
              }}
            >
              {tc(g.group.name) ?? g.group.name}
            </Text>
          </Pressable>
        );
      })}
      {/* + New Group tile */}
      {onRequestCreateGroup ? (
        <Pressable
          onPress={() => { impactLight(); onRequestCreateGroup(); }}
          style={{
            width: '31%',
            alignItems: 'center',
            paddingVertical: 12,
            paddingHorizontal: 4,
            borderRadius: 14,
            backgroundColor: colors.surfaceSecondary,
            borderWidth: 1.5,
            borderColor: 'transparent',
            borderStyle: 'dashed',
          }}
        >
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.primary + '12',
            }}
          >
            <Plus size={16} color={colors.primary} strokeWidth={2.5} />
          </View>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: colors.primary,
              marginTop: 4,
              textAlign: 'center',
            }}
          >
            {t('NEW_GROUP' as any)}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ─── Subcategory List (Step 2: pick a subcategory) ───────────────────

function SubcategoryList({
  group,
  selectedId,
  onSelect,
  onBack,
}: {
  group: GroupedCategories;
  selectedId: string | null;
  onSelect: (category: Category) => void;
  onBack: () => void;
}): React.ReactElement {
  const colors = useThemeColors();
  const tc = useTranslateCategory();
  const { rowDir, isRTL } = useRTL();
  return (
    <View>
      {/* Back header */}
      <Pressable
        style={{ flexDirection: rowDir, alignItems: 'center', marginBottom: 12 }}
        onPress={() => { impactLight(); onBack(); }}
      >
        <ChevronLeft size={18} color={group.group.color} strokeWidth={2.5} style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined} />
        <View style={{ marginHorizontal: 4 }}><CategoryIcon name={group.group.icon} size={22} color={group.group.color} /></View>
        <Text
          style={{
            fontSize: 16,
            fontWeight: '700',
            color: group.group.color,
            flex: 1,
          }}
        >
          {tc(group.group.name) ?? group.group.name}
        </Text>
      </Pressable>

      {/* Subcategory chips */}
      <View style={{ flexDirection: rowDir, flexWrap: 'wrap', gap: 8 }}>
        {group.categories.map((category) => {
          const isSelected = category.id === selectedId;
          return (
            <Pressable
              key={category.id}
              onPress={() => { impactLight(); onSelect(category); }}
              style={{
                flexDirection: rowDir,
                alignItems: 'center',
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                backgroundColor: isSelected ? group.group.color + '18' : colors.surfaceSecondary,
                borderWidth: 1.5,
                borderColor: isSelected ? group.group.color : 'transparent',
              }}
            >
              <View style={{ marginEnd: 6 }}><CategoryIcon name={category.icon} size={17} color={isSelected ? group.group.color : colors.textSecondary} /></View>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: isSelected ? '600' : '500',
                  color: isSelected ? group.group.color : colors.textPrimary,
                }}
              >
                {tc(category.name) ?? category.name}
              </Text>
              {isSelected ? (
                <View className="ml-1.5">
                  <Check size={14} color={group.group.color} strokeWidth={3} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── Drill-Down Grouped Picker ───────────────────────────────────────

function DrillDownPicker({
  grouped,
  selectedId,
  onSelect,
  onRequestCreateGroup,
  showSubcategories = true,
}: {
  grouped: GroupedCategories[];
  selectedId: string | null;
  onSelect: (category: Category) => void;
  onRequestCreateGroup?: () => void;
  showSubcategories?: boolean;
}): React.ReactElement {
  // Find which group currently holds the selected category
  const selectedGroup = useMemo((): GroupedCategories | null => {
    if (!selectedId) return null;
    return grouped.find((g) => g.categories.some((c) => c.id === selectedId)) ?? null;
  }, [grouped, selectedId]);

  const [activeGroup, setActiveGroup] = useState<GroupedCategories | null>(
    showSubcategories ? selectedGroup : null,
  );

  const handleSelectGroup = useCallback((g: GroupedCategories): void => {
    if (showSubcategories) {
      // Pro/Max: drill into subcategories
      setActiveGroup(g);
    } else {
      // Free: auto-select the first subcategory in this group
      if (g.categories.length > 0) {
        impactLight();
        onSelect(g.categories[0]);
      }
    }
  }, [showSubcategories, onSelect]);

  const handleBack = useCallback((): void => {
    setActiveGroup(null);
  }, []);

  const handleSelect = useCallback((category: Category): void => {
    onSelect(category);
  }, [onSelect]);

  if (activeGroup) {
    return (
      <SubcategoryList
        group={activeGroup}
        selectedId={selectedId}
        onSelect={handleSelect}
        onBack={handleBack}
      />
    );
  }

  return (
    <GroupGrid
      groups={grouped}
      selectedGroupId={selectedGroup?.group.id ?? null}
      onSelectGroup={handleSelectGroup}
      onRequestCreateGroup={onRequestCreateGroup}
    />
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export function CategoryPicker({
  type,
  selectedId,
  onSelect,
  categories: externalCategories,
  flat = false,
  onRequestCreateGroup,
}: CategoryPickerProps): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const { entitlement } = useSubscription();
  const plan = entitlement.effectivePlan;
  const catLevel = getLevel(plan, 'categoriesLevel');
  // free = 'all' (groups only, auto-select first subcategory)
  // pro = 'all' (full drill-down into subcategories)
  // max = 'all_plus_custom' (full drill-down + create custom)
  // For free users: show groups, tap selects the first subcategory directly
  // For pro+: show groups → drill into subcategories
  const showSubcategories = plan !== 'free';
  const canCreateCustom = catLevel === 'all_plus_custom';

  const { data: grouped, isLoading: groupedLoading } = useGroupedCategoriesByType(type);
  const { data: fetchedCategories, isLoading: flatLoading } = useCategoriesByType(type);

  // Flat mode: external categories or fetched
  if (flat || externalCategories) {
    const typeFiltered = externalCategories
      ? externalCategories.filter((c) => c.type === type)
      : fetchedCategories;
    const categories = (typeFiltered && typeFiltered.length > 0)
      ? typeFiltered
      : externalCategories ?? fetchedCategories;

    if (!externalCategories && flatLoading) {
      return (
        <View className="items-center justify-center py-8">
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      );
    }
    if (!categories || categories.length === 0) {
      return (
        <View className="items-center justify-center py-8 px-4">
          <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center' }}>
            {t('NO_CATEGORIES_AVAILABLE' as any)}
          </Text>
        </View>
      );
    }
    return <FlatCategoryList categories={categories} selectedId={selectedId} onSelect={onSelect} />;
  }

  // Grouped drill-down mode
  if (groupedLoading) {
    return (
      <View className="items-center justify-center py-8">
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (!grouped || grouped.length === 0) {
    return (
      <View className="items-center justify-center py-8 px-4">
        <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center' }}>
          {t('NO_CATEGORIES_AVAILABLE' as any)}
        </Text>
      </View>
    );
  }

  return (
    <DrillDownPicker
      grouped={grouped}
      selectedId={selectedId}
      onSelect={onSelect}
      onRequestCreateGroup={canCreateCustom ? onRequestCreateGroup : undefined}
      showSubcategories={showSubcategories}
    />
  );
}
