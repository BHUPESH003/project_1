import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  type ListRenderItemInfo,
} from 'react-native';
import { useColors } from '@/theme';
import { spacing, radius } from '@/theme/spacing';
import { fontSize, fontWeight } from '@/theme/typography';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCategories } from '@/api/hooks/useCategories';
import type { Category } from '@/api/types';

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'all', name: 'All', slug: 'all', isActive: true, isComingSoon: false },
  { id: 'printing', name: 'Printing', slug: 'printing', isActive: true, isComingSoon: false },
  { id: 'stationery', name: 'Stationery', slug: 'stationery', isActive: false, isComingSoon: true },
  { id: 'gifts', name: 'Gifts', slug: 'gifts', isActive: false, isComingSoon: true },
  { id: 'repairs', name: 'Repairs', slug: 'repairs', isActive: false, isComingSoon: true },
];

interface CategoryScrollerProps {
  selectedCategoryId?: string;
  onCategorySelect: (id: string | undefined) => void;
}

export function CategoryScroller({ selectedCategoryId, onCategorySelect }: CategoryScrollerProps) {
  const colors = useColors();
  const { data: apiCategories, isLoading } = useCategories();
  const categories = apiCategories && apiCategories.length > 0 ? apiCategories : DEFAULT_CATEGORIES;

  function handleSelect(cat: Category) {
    if (cat.isComingSoon) return;
    const id = cat.id === 'all' ? undefined : cat.id;
    onCategorySelect(id);
  }

  const renderItem = ({ item }: ListRenderItemInfo<Category>) => {
    const isSelected = selectedCategoryId === item.id || (item.id === 'all' && !selectedCategoryId);
    const isComingSoon = item.isComingSoon;

    return (
      <Pressable
        onPress={() => handleSelect(item)}
        style={[
          styles.pill,
          {
            backgroundColor: isSelected ? colors.primary : colors.surface,
            borderColor: isSelected ? colors.primary : colors.border,
            opacity: isComingSoon ? 0.55 : 1,
          },
        ]}
      >
        <Text
          style={[
            styles.pillText,
            { color: isSelected ? colors.textOnPrimary : colors.text2 },
          ]}
        >
          {item.name}
        </Text>
        {isComingSoon && (
          <View style={[styles.soonBadge, { backgroundColor: colors.warningSoft }]}>
            <Text style={[styles.soonText, { color: colors.warning }]}>Soon</Text>
          </View>
        )}
      </Pressable>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.skeletonRow}>
        {[80, 90, 75, 85].map((w, i) => (
          <Skeleton key={i} width={w} height={36} borderRadius={radius.full} />
        ))}
      </View>
    );
  }

  return (
    <FlatList
      data={categories}
      renderItem={renderItem}
      keyExtractor={(c) => c.id}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.xl, gap: spacing.sm },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  pillText: { fontSize: fontSize.subhead, fontWeight: fontWeight.medium },
  soonBadge: {
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  soonText: { fontSize: 9, fontWeight: fontWeight.bold },
  skeletonRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
});
