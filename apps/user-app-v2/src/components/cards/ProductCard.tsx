import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { useColors } from '@/theme';
import { spacing, radius } from '@/theme/spacing';
import { fontSize, fontWeight } from '@/theme/typography';
import type { Product } from '@/api/types';
import { useCartStore } from '@/stores/cartStore';
import { showToast } from '@/stores/toastStore';

interface ProductCardProps {
  product: Product;
  sellerId: string;
  sellerName: string;
  onPrintingPress?: () => void;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ProductCardComponent({ product, sellerId, sellerName, onPrintingPress, style }: ProductCardProps) {
  const colors = useColors();
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const getItemByProduct = useCartStore((s) => s.getItemByProduct);
  const cartItem = getItemByProduct(product.id, sellerId);
  const qty = cartItem?.quantity ?? 0;

  const addScale = useSharedValue(1);
  const addAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: addScale.value }],
  }));

  function bounce(sv: SharedValue<number>) {
    sv.value = withSpring(0.92, { damping: 15, stiffness: 350 });
    setTimeout(() => {
      sv.value = withSpring(1, { damping: 15, stiffness: 250 });
    }, 100);
  }

  async function handleAdd() {
    if (product.isPrinting) {
      if (onPrintingPress) {
        onPrintingPress();
      } else {
        showToast({ type: 'info', message: 'Upload & configure to add this item' });
      }
      return;
    }
    bounce(addScale);
    await addItem({
      productId: product.id,
      sellerId,
      sellerName,
      productName: product.name,
      price: product.price,
    });
  }

  async function handleIncrement() {
    if (!cartItem) return;
    bounce(addScale);
    await updateQuantity(cartItem.id, qty + 1);
  }

  async function handleDecrement() {
    if (!cartItem) return;
    await updateQuantity(cartItem.id, qty - 1);
  }

  const discountPct =
    product.mrp && product.mrp > product.price
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
      : null;

  return (
    <View
      style={[
        styles.card,
        { borderBottomColor: colors.borderFaint },
        style,
      ]}
    >
      {/* Badges row */}
      {(product.isBestSeller || product.isPopular) && (
        <View style={styles.badgeRow}>
          {product.isBestSeller && (
            <View style={[styles.badge, { backgroundColor: colors.accentSoft }]}>
              <Text style={[styles.badgeText, { color: colors.accent }]}>
                Best seller
              </Text>
            </View>
          )}
          {product.isPopular && !product.isBestSeller && (
            <View style={[styles.badge, { backgroundColor: colors.primarySoft }]}>
              <Text style={[styles.badgeText, { color: colors.primary }]}>
                Popular
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.row}>
        {/* Text info */}
        <View style={styles.textBlock}>
          <Text
            style={[styles.name, { color: colors.text }]}
            numberOfLines={2}
          >
            {product.name}
          </Text>
          {product.description ? (
            <Text
              style={[styles.desc, { color: colors.text2 }]}
              numberOfLines={2}
            >
              {product.description}
            </Text>
          ) : null}

          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: colors.text }]}>
              ₹{product.price}
            </Text>
            {product.mrp && product.mrp > product.price ? (
              <Text style={[styles.mrp, { color: colors.text3 }]}>
                ₹{product.mrp}
              </Text>
            ) : null}
            {discountPct ? (
              <View style={[styles.discountBadge, { backgroundColor: colors.successSoft }]}>
                <Text style={[styles.discountText, { color: colors.success }]}>
                  {discountPct}% off
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Add / Stepper */}
        <View style={styles.addArea}>
          {qty === 0 ? (
            <Animated.View style={addAnimStyle}>
              <Pressable
                style={[
                  styles.addBtn,
                  {
                    borderColor: colors.primary,
                    backgroundColor: colors.surface,
                  },
                  !product.inStock && styles.addBtnDisabled,
                ]}
                onPress={handleAdd}
                disabled={!product.inStock}
              >
                <Text style={[styles.addBtnText, { color: colors.primary }]}>
                  {product.isPrinting ? 'Configure' : product.inStock ? '+ Add' : 'N/A'}
                </Text>
              </Pressable>
            </Animated.View>
          ) : (
            <Animated.View style={[styles.stepper, { borderColor: colors.primary }, addAnimStyle]}>
              <Pressable onPress={handleDecrement} style={styles.stepperBtn} hitSlop={4}>
                <Text style={[styles.stepperSymbol, { color: colors.primary }]}>−</Text>
              </Pressable>
              <Text style={[styles.stepperQty, { color: colors.text }]}>{qty}</Text>
              <Pressable onPress={handleIncrement} style={styles.stepperBtn} hitSlop={4}>
                <Text style={[styles.stepperSymbol, { color: colors.primary }]}>+</Text>
              </Pressable>
            </Animated.View>
          )}
        </View>
      </View>
    </View>
  );
}

export const ProductCard = React.memo(ProductCardComponent);

const styles = StyleSheet.create({
  card: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
  },
  badgeRow: { flexDirection: 'row', gap: 6 },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  badgeText: { fontSize: fontSize.micro, fontWeight: fontWeight.semibold },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  textBlock: { flex: 1, gap: 4 },
  name: { fontSize: fontSize.body, fontWeight: fontWeight.semibold },
  desc: { fontSize: fontSize.caption, lineHeight: 18 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  price: { fontSize: fontSize.body, fontWeight: fontWeight.bold },
  mrp: {
    fontSize: fontSize.caption,
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  discountText: { fontSize: fontSize.micro, fontWeight: fontWeight.semibold },
  addArea: { paddingTop: 2 },
  addBtn: {
    borderWidth: 1.5,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 64,
  },
  addBtnDisabled: { opacity: 0.45 },
  addBtnText: { fontSize: fontSize.subhead, fontWeight: fontWeight.bold },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.sm,
    overflow: 'hidden',
    minWidth: 80,
  },
  stepperBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  stepperSymbol: { fontSize: fontSize.bodyLg, fontWeight: fontWeight.bold },
  stepperQty: {
    fontSize: fontSize.subhead,
    fontWeight: fontWeight.bold,
    minWidth: 20,
    textAlign: 'center',
  },
});
