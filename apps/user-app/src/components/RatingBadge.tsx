/**
 * RatingBadge – star icon, rating value, review count.
 * Polish: typography hierarchy (meta for count).
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { typography } from '../constants/typography';

export interface RatingBadgeProps {
  rating: number;
  reviewCount: number;
}

export const RatingBadge: React.FC<RatingBadgeProps> = ({ rating, reviewCount }) => {
  return (
    <View style={styles.container}>
      <MaterialIcons name="star" size={14} color={colors.ratingStar} style={styles.star} />
      <Text style={styles.rating}>{rating.toFixed(1)}</Text>
      <Text style={styles.reviews}>({reviewCount} reviews)</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  star: {
    marginTop: 1,
  },
  rating: {
    ...typography.meta,
    fontWeight: '500',
    color: colors.textTertiary,
  },
  reviews: {
    ...typography.meta,
    color: colors.textMuted,
  },
});

export default RatingBadge;
