/**
 * ServiceCard – presentational card for a service/category.
 * Polish: spacing scale, elevation, typography hierarchy.
 */
import React from 'react';
import { View, Text, Image, StyleSheet, ImageSourcePropType } from 'react-native';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { typography } from '../constants/typography';
import { elevation } from '../constants/elevation';

export type ServiceCardAvailability = 'available' | 'soon';

export interface ServiceCardProps {
  imageSource: ImageSourcePropType;
  title: string;
  subtitle: string;
  availability: ServiceCardAvailability;
  iconPlaceholder?: React.ReactNode;
}

const BADGE_AVAILABLE = 'Available';
const BADGE_SOON = 'Soon';

export const ServiceCard: React.FC<ServiceCardProps> = ({
  imageSource,
  title,
  subtitle,
  availability,
  iconPlaceholder,
}) => {
  const isAvailable = availability === 'available';
  const badgeLabel = isAvailable ? BADGE_AVAILABLE : BADGE_SOON;

  return (
    <View style={[styles.card, !isAvailable && styles.cardDisabled, isAvailable && elevation.card]}>
      <View style={styles.imageContainer}>
        <Image source={imageSource} style={styles.image} resizeMode="cover" />
        <View style={[styles.badge, isAvailable ? styles.badgeAvailable : styles.badgeSoon]}>
          {isAvailable && <View style={styles.badgeDot} />}
          <Text style={[styles.badgeText, isAvailable ? styles.badgeTextAvailable : styles.badgeTextSoon]}>
            {badgeLabel}
          </Text>
        </View>
      </View>
      <View style={styles.footer}>
        <View>
          <Text style={[styles.title, !isAvailable && styles.titleDisabled]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.subtitle, !isAvailable && styles.subtitleDisabled]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        {iconPlaceholder != null && <View style={styles.iconSlot}>{iconPlaceholder}</View>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    backgroundColor: colors.cardDark,
    padding: spacing.sm,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cardDisabled: {
    backgroundColor: colors.cardDisabled,
    opacity: 0.72,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: spacing.xs,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: 9999,
  },
  badgeAvailable: {
    backgroundColor: colors.successBg,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  badgeSoon: {
    backgroundColor: colors.soonBadgeBg,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  badgeText: {
    ...typography.overline,
    textTransform: 'uppercase',
  },
  badgeTextAvailable: {
    color: colors.successLight,
  },
  badgeTextSoon: {
    color: colors.textMuted,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxs,
    paddingBottom: spacing.xxs,
  },
  title: {
    ...typography.primary,
    color: colors.textPrimary,
  },
  titleDisabled: {
    color: colors.textTertiary,
    fontWeight: '600',
  },
  subtitle: {
    ...typography.meta,
    color: colors.textSecondary,
    marginTop: 2,
  },
  subtitleDisabled: {
    color: colors.textDisabled,
  },
  iconSlot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ServiceCard;
