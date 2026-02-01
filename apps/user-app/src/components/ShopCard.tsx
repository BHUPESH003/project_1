/**
 * ShopCard – presentational card for a shop/venue.
 * Polish: elevation for selected vs unselected, spacing scale, typography.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { typography } from '../constants/typography';
import { elevation } from '../constants/elevation';
import { RatingBadge } from './RatingBadge';

export interface ShopCardProps {
  shopName: string;
  rating: number;
  reviewCount: number;
  pricePerUnit: string;
  distance: string;
  eta: string;
  badge?: string;
  selected: boolean;
}

export const ShopCard: React.FC<ShopCardProps> = ({
  shopName,
  rating,
  reviewCount,
  pricePerUnit,
  distance,
  eta,
  badge,
  selected,
}) => {
  return (
    <View
      style={[
        styles.card,
        selected && styles.cardSelected,
        selected ? elevation.cardSelected : elevation.card,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.nameRow}>
            <View style={styles.shopNameWrap}>
              <Text style={styles.shopName} numberOfLines={1}>
                {shopName}
              </Text>
            </View>
            {badge != null && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            )}
          </View>
          <RatingBadge rating={rating} reviewCount={reviewCount} />
        </View>
        <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
          {selected && <View style={styles.radioInner} />}
        </View>
      </View>
      <View style={styles.grid}>
        <View style={styles.cell}>
          <Text style={styles.cellLabel}>Price</Text>
          <View style={styles.cellValue}>
            <Text style={styles.priceValue}>{pricePerUnit}</Text>
            <Text style={styles.priceUnit}>/page</Text>
          </View>
        </View>
        <View style={[styles.cell, styles.cellBorder]}>
          <Text style={styles.cellLabel}>Distance</Text>
          <Text style={styles.cellValueText}>{distance}</Text>
        </View>
        <View style={[styles.cell, styles.cellBorder]}>
          <Text style={styles.cellLabel}>Time</Text>
          <Text style={styles.cellValueText}>{eta}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    backgroundColor: colors.surfaceDark,
    borderWidth: 1,
    borderColor: colors.borderDark,
    padding: spacing.md,
    gap: spacing.md,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surfaceDark,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    gap: spacing.xxs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xxs,
    minWidth: 0,
  },
  shopNameWrap: {
    flex: 1,
    minWidth: 0,
  },
  shopName: {
    ...typography.primary,
    color: colors.textPrimary,
  },
  badge: {
    backgroundColor: colors.successBadgeBg,
    paddingHorizontal: spacing.xs - 2,
    paddingVertical: 2,
    borderRadius: spacing.xxs,
  },
  badgeText: {
    ...typography.overline,
    color: colors.successLight,
    textTransform: 'uppercase',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.radioBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  grid: {
    flexDirection: 'row',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    gap: spacing.xs,
  },
  cell: {
    flex: 1,
    gap: spacing.xxs,
  },
  cellBorder: {
    borderLeftWidth: 1,
    borderLeftColor: colors.divider,
    paddingLeft: spacing.sm,
  },
  cellLabel: {
    ...typography.overline,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  cellValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  priceValue: {
    ...typography.secondary,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  priceUnit: {
    ...typography.meta,
    fontWeight: '400',
    color: colors.textMuted,
  },
  cellValueText: {
    ...typography.secondary,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});

export default ShopCard;
