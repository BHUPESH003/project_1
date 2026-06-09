import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useColors } from '@/theme';
import { spacing, radius } from '@/theme/spacing';
import { fontSize, fontWeight } from '@/theme/typography';
import type { Seller } from '@/api/types';
import { Skeleton } from '@/components/ui/Skeleton';
import { useFavoriteToggle } from '@/api/hooks/useSellers';

interface SellerCardProps {
  seller: Seller;
  onPress: (seller: Seller) => void;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function SellerCardComponent({ seller, onPress, style }: SellerCardProps) {
  const colors = useColors();
  const scale = useSharedValue(1);
  const favoriteToggle = useFavoriteToggle();

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function onPressIn() {
    scale.value = withSpring(0.98, { damping: 20, stiffness: 300 });
  }
  function onPressOut() {
    scale.value = withSpring(1, { damping: 20, stiffness: 300 });
  }

  function handleFavorite() {
    favoriteToggle.mutate({
      sellerId: seller.id,
      currentlyFavorited: seller.isFavorited ?? false,
    });
  }

  const ratingStr = typeof seller.rating === 'number' ? seller.rating.toFixed(1) : '—';
  const distStr = seller.distance != null
    ? seller.distance < 1
      ? `${Math.round(seller.distance * 1000)}m`
      : `${seller.distance.toFixed(1)}km`
    : null;
  const prepStr = seller.prepTime ? `~${seller.prepTime}m` : null;

  return (
    <AnimatedPressable
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        animStyle,
        style,
      ]}
      onPress={() => onPress(seller)}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      {/* Thumbnail */}
      <View style={[styles.imageWrap, { backgroundColor: colors.surface2 }]}>
        {seller.imageUrl ? (
          <Image
            source={{ uri: seller.imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.imageFallback, { backgroundColor: colors.primarySoft }]}>
            <Text style={styles.imageFallbackIcon}>🏪</Text>
          </View>
        )}
        {!seller.isVerified && (
          <View style={styles.unverifiedPill}>
            <Text style={[styles.unverifiedText, { color: colors.warning }]}>
              Unverified
            </Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text
            style={[styles.name, { color: colors.text }]}
            numberOfLines={1}
          >
            {seller.name}
          </Text>
          <Pressable onPress={handleFavorite} hitSlop={10} style={styles.heartBtn}>
            <Text
              style={[
                styles.heart,
                { color: seller.isFavorited ? colors.danger : colors.text3 },
              ]}
            >
              {seller.isFavorited ? '♥' : '♡'}
            </Text>
          </Pressable>
        </View>

        {seller.isVerified && (
          <View style={styles.statusRow}>
            <View
              style={[
                styles.onlineDot,
                {
                  backgroundColor: seller.isOnline
                    ? colors.success
                    : colors.text3,
                },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                {
                  color: seller.isOnline ? colors.success : colors.text3,
                },
              ]}
            >
              {seller.isOnline ? 'Open' : 'Closed'}
            </Text>
          </View>
        )}

        <View style={styles.metaRow}>
          <Text style={[styles.meta, { color: colors.text2 }]}>
            ★ {ratingStr}
          </Text>
          {distStr && (
            <Text style={[styles.metaSep, { color: colors.text3 }]}>·</Text>
          )}
          {distStr && (
            <Text style={[styles.meta, { color: colors.text2 }]}>{distStr}</Text>
          )}
          {prepStr && (
            <Text style={[styles.metaSep, { color: colors.text3 }]}>·</Text>
          )}
          {prepStr && (
            <Text style={[styles.meta, { color: colors.text2 }]}>{prepStr}</Text>
          )}
        </View>

        {seller.startingPrice ? (
          <Text style={[styles.price, { color: colors.primary }]}>
            From {seller.startingPrice}
          </Text>
        ) : null}

        {seller.categories.length > 0 && (
          <View style={styles.tags}>
            {seller.categories.slice(0, 2).map((cat, i) => (
              <View
                key={i}
                style={[
                  styles.tag,
                  { backgroundColor: colors.surface2, borderColor: colors.borderFaint },
                ]}
              >
                <Text style={[styles.tagText, { color: colors.text2 }]}>
                  {cat}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
}

export const SellerCard = React.memo(SellerCardComponent);

export function SellerCardSkeleton() {
  const colors = useColors();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <Skeleton width={80} height={80} borderRadius={radius.md} />
      <View style={[styles.info, { gap: spacing.sm }]}>
        <Skeleton width="60%" height={16} />
        <Skeleton width="35%" height={12} />
        <Skeleton width="50%" height={12} />
        <Skeleton width="45%" height={12} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
  },
  imageWrap: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  imageFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageFallbackIcon: { fontSize: 28 },
  unverifiedPill: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  unverifiedText: { fontSize: 9, fontWeight: '600' },
  info: { flex: 1, gap: 3 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    flex: 1,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  heartBtn: { paddingLeft: spacing.xs },
  heart: { fontSize: 18 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  onlineDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: fontSize.caption, fontWeight: fontWeight.medium },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  meta: { fontSize: fontSize.caption },
  metaSep: { fontSize: fontSize.caption },
  price: { fontSize: fontSize.caption, fontWeight: fontWeight.semibold },
  tags: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginTop: 2 },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
    borderWidth: 1,
  },
  tagText: { fontSize: fontSize.micro },
});
