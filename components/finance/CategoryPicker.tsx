import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Check, ChevronLeft, Plus } from 'lucide-react-native';

import { impactLight } from '../../utils/haptics';
import { useTranslateCategory } from '../../lib/i18n';

import { useGroupedCategoriesByType, useCategoriesByType } from '../../hooks/useCategories';
import { useThemeColors } from '../../hooks/useThemeColors';
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
  return (
    <View className="flex-row flex-wrap gap-2">
      {categories.map((category) => {
        const isSelected = category.id === selectedId;
        return (
          <Pressable
            key={category.id}
            onPress={() => { impactLight(); onSelect(category); }}
            className="flex-row items-center rounded-xl px-3 py-2"
            style={{
              backgroundColor: isSelected ? category.color + '18' : colors.surface,
              borderWidth: 1.5,
              borderColor: isSelected ? category.color : colors.borderLight,
            }}
          >
            <Text style={{ fontSize: 18, marginRight: 6 }}>{category.icon}</Text>
            <Text
              style={{
                fontSize: 14,
                fontWeight: isSelected ? '600' : '500',
                color: isSelected ? category.color : colors.textPrimary,
              }}
            >
              {tc(category.name)}
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
  return (
    <View className="flex-row flex-wrap gap-2">
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
            <Text style={{ fontSize: 24 }}>{g.group.icon}</Text>
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
              {tc(g.group.name)}
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
            New Group
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
  return (
    <View>
      {/* Back header */}
      <Pressable
        className="flex-row items-center mb-3"
        onPress={() => { impactLight(); onBack(); }}
      >
        <ChevronLeft size={18} color={group.group.color} strokeWidth={2.5} />
        <Text style={{ fontSize: 22, marginLeft: 4, marginRight: 6 }}>{group.group.icon}</Text>
        <Text
          style={{
            fontSize: 16,
            fontWeight: '700',
            color: group.group.color,
            flex: 1,
          }}
        >
          {tc(group.group.name)}
        </Text>
      </Pressable>

      {/* Subcategory chips */}
      <View className="flex-row flex-wrap gap-2">
        {group.categories.map((category) => {
          const isSelected = category.id === selectedId;
          return (
            <Pressable
              key={category.id}
              onPress={() => { impactLight(); onSelect(category); }}
              className="flex-row items-center rounded-xl px-3 py-2.5"
              style={{
                backgroundColor: isSelected ? group.group.color + '18' : colors.surfaceSecondary,
                borderWidth: 1.5,
                borderColor: isSelected ? group.group.color : 'transparent',
              }}
            >
              <Text style={{ fontSize: 17, marginRight: 6 }}>{category.icon}</Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: isSelected ? '600' : '500',
                  color: isSelected ? group.group.color : colors.textPrimary,
                }}
              >
                {tc(category.name)}
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
}: {
  grouped: GroupedCategories[];
  selectedId: string | null;
  onSelect: (category: Category) => void;
  onRequestCreateGroup?: () => void;
}): React.ReactElement {
  // Find which group currently holds the selected category
  const selectedGroup = useMemo((): GroupedCategories | null => {
    if (!selectedId) return null;
    return grouped.find((g) => g.categories.some((c) => c.id === selectedId)) ?? null;
  }, [grouped, selectedId]);

  const [activeGroup, setActiveGroup] = useState<GroupedCategories | null>(selectedGroup);

  const handleSelectGroup = useCallback((g: GroupedCategories): void => {
    setActiveGroup(g);
  }, []);

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
            No categories available. Create one first.
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
          No categories available. Create one first.
        </Text>
      </View>
    );
  }

  return <DrillDownPicker grouped={grouped} selectedId={selectedId} onSelect={onSelect} onRequestCreateGroup={onRequestCreateGroup} />;
}
