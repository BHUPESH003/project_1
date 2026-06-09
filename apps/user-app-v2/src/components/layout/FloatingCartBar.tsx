import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useColors } from '@/theme';
import { spacing, radius } from '@/theme/spacing';
import { fontSize, fontWeight } from '@/theme/typography';
import { useCartStore } from '@/stores/cartStore';

interface FloatingCartBarProps {
  onPress: () => void;
  bottomOffset?: number;
}

export function FloatingCartBar({ onPress, bottomOffset = 0 }: FloatingCartBarProps) {
  const colors = useColors();
  const totalCount = useCartStore((s) => s.getTotalCount());
  const items = useCartStore((s) => s.items);

  const translateY = useSharedValue(80);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    if (totalCount > 0) {
      translateY.value = withSpring(0, { damping: 15, stiffness: 200 });
    } else {
      translateY.value = withSpring(80, { damping: 15, stiffness: 200 });
    }
  }, [totalCount, translateY]);

  if (totalCount === 0) return null;

  // Get the first seller name for display
  const firstSeller = items[0]?.sellerName ?? '';
  const sellerCount = new Set(items.map((it) => it.sellerId)).size;
  const sellerLabel =
    sellerCount > 1
      ? `${sellerCount} shops`
      : firstSeller || 'Cart';

  const total = items.reduce((sum, it) => sum + it.price * it.quantity, 0);

  return (
    <Animated.View
      style={[
        styles.wrap,
        { bottom: bottomOffset + spacing.lg },
        animStyle,
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        style={[styles.bar, { backgroundColor: colors.surfaceInverse }]}
        onPress={onPress}
        android_ripple={{ color: 'rgba(255,255,255,0.12)' }}
      >
        <View style={styles.left}>
          <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.countText}>{totalCount}</Text>
          </View>
          <Text style={[styles.sellerText, { color: colors.bg }]}>
            {sellerLabel}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={[styles.totalText, { color: colors.bg }]}>
            ₹{total}
          </Text>
          <Text style={[styles.viewCart, { color: colors.primary }]}>
            View cart →
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  countBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    color: '#fff',
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
  },
  sellerText: { fontSize: fontSize.body, fontWeight: fontWeight.semibold },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  totalText: { fontSize: fontSize.body, fontWeight: fontWeight.bold },
  viewCart: { fontSize: fontSize.subhead, fontWeight: fontWeight.semibold },
});
