import React, { useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCartStore, type CartItem, type SellerGroup } from '@/stores/cartStore';
import { useColors } from '@/theme';
import { spacing, radius } from '@/theme/spacing';
import { fontSize, fontWeight } from '@/theme/typography';
import type { HomeStackParamList } from '@/navigation/HomeStack';

type Props = NativeStackScreenProps<HomeStackParamList, 'Cart'>;

export function CartScreen({ navigation }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const cartItems = useCartStore((s) => s.items);
  const totalPrice = useCartStore((s) => s.getTotalPrice());
  const totalCount = useCartStore((s) => s.getTotalCount());
  const groups = useMemo(() => {
    const map = new Map<string, SellerGroup>();
    for (const item of cartItems) {
      const existing = map.get(item.sellerId);
      if (existing) {
        existing.items.push(item);
        existing.total += item.price * item.quantity;
        existing.count += item.quantity;
      } else {
        map.set(item.sellerId, {
          sellerId: item.sellerId,
          sellerName: item.sellerName,
          items: [item],
          total: item.price * item.quantity,
          count: item.quantity,
        });
      }
    }
    return Array.from(map.values());
  }, [cartItems]);

  if (totalCount === 0) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg }]}>
        <Header onBack={() => navigation.goBack()} colors={colors} insets={insets} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Your cart is empty</Text>
          <Text style={[styles.emptySubtitle, { color: colors.text2 }]}>
            Add items from a shop to get started
          </Text>
          <Pressable
            style={[styles.exploreBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={[styles.exploreBtnText, { color: colors.textOnPrimary }]}>
              Explore shops
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <Header onBack={() => navigation.goBack()} colors={colors} insets={insets} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {groups.map((group) => (
          <SellerGroupSection
            key={group.sellerId}
            group={group}
            navigation={navigation}
            colors={colors}
          />
        ))}

        {/* Order summary */}
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>Order summary</Text>
          {groups.map((g) => (
            <View key={g.sellerId} style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.text2 }]} numberOfLines={1}>
                {g.sellerName}
              </Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>₹{g.total}</Text>
            </View>
          ))}
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryTotal, { color: colors.text }]}>Total</Text>
            <Text style={[styles.summaryTotalValue, { color: colors.primary }]}>₹{totalPrice}</Text>
          </View>
          <Text style={[styles.deliveryNote, { color: colors.text3 }]}>
            * Delivery charges paid directly to delivery partner
          </Text>
        </View>
      </ScrollView>

      {/* Checkout bar */}
      <View
        style={[
          styles.checkoutBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom || spacing.lg,
          },
        ]}
      >
        <View style={styles.checkoutBarInner}>
          <View>
            <Text style={[styles.checkoutCount, { color: colors.text2 }]}>
              {totalCount} item{totalCount !== 1 ? 's' : ''}
            </Text>
            <Text style={[styles.checkoutTotal, { color: colors.text }]}>₹{totalPrice}</Text>
          </View>
          <Pressable
            style={[styles.checkoutBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Checkout')}
          >
            <Text style={[styles.checkoutBtnText, { color: colors.textOnPrimary }]}>
              Proceed to checkout →
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── Seller group section ─────────────────────────────────────────────────────

function SellerGroupSection({
  group,
  navigation,
  colors,
}: {
  group: SellerGroup;
  navigation: Props['navigation'];
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.sellerGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Seller header */}
      <View style={[styles.sellerHeader, { borderBottomColor: colors.borderFaint }]}>
        <View style={[styles.sellerAvatar, { backgroundColor: colors.primarySoft }]}>
          <Text style={[styles.sellerAvatarText, { color: colors.primary }]}>
            {group.sellerName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.sellerName, { color: colors.text }]}>{group.sellerName}</Text>
        <Text style={[styles.sellerItemCount, { color: colors.text3 }]}>
          {group.count} item{group.count !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Items */}
      {group.items.map((item) => (
        <CartItemRow
          key={item.id}
          item={item}
          navigation={navigation}
          colors={colors}
        />
      ))}
    </View>
  );
}

// ─── Cart item row with swipe-to-delete ───────────────────────────────────────

function CartItemRow({
  item,
  navigation,
  colors,
}: {
  item: CartItem;
  navigation: Props['navigation'];
  colors: ReturnType<typeof useColors>;
}) {
  const swipeRef = useRef<Swipeable>(null);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  function renderRightActions(
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
  ) {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.85],
      extrapolate: 'clamp',
    });
    return (
      <Pressable
        style={[styles.deleteAction, { backgroundColor: colors.danger }]}
        onPress={() => {
          swipeRef.current?.close();
          removeItem(item.id);
        }}
      >
        <Animated.Text style={[styles.deleteText, { transform: [{ scale }] }]}>
          Remove
        </Animated.Text>
      </Pressable>
    );
  }

  const printSummary = item.printConfig
    ? `${item.printConfig.colorMode === 'bw' ? 'B&W' : 'Color'} · ${item.printConfig.paperSize} · ${item.printConfig.copies} cop${item.printConfig.copies !== 1 ? 'ies' : 'y'} · ${item.printConfig.pages === 'all' ? 'All pages' : `Pages ${item.printConfig.pages}`}`
    : null;

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
    >
      <View style={[styles.itemRow, { backgroundColor: colors.surface, borderBottomColor: colors.borderFaint }]}>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={2}>
            {item.productName}
          </Text>
          {item.isPrinting && printSummary && (
            <Text style={[styles.printSummary, { color: colors.text3 }]} numberOfLines={2}>
              {printSummary}
            </Text>
          )}
          {item.isPrinting && item.fileKeys && item.fileKeys.length > 0 && (
            <Text style={[styles.fileCount, { color: colors.text2 }]}>
              {item.fileKeys.length} file{item.fileKeys.length !== 1 ? 's' : ''}
            </Text>
          )}
          <Text style={[styles.itemPrice, { color: colors.text }]}>
            ₹{item.price}
            {item.quantity > 1 && (
              <Text style={{ color: colors.text3 }}> × {item.quantity}</Text>
            )}
          </Text>
        </View>

        <View style={styles.itemActions}>
          {item.isPrinting ? (
            // Printing items: show "Edit" link
            <Pressable
              style={[styles.editBtn, { borderColor: colors.primary }]}
              onPress={() =>
                navigation.navigate('PrintingConfig', {
                  productId: item.productId,
                  sellerId: item.sellerId,
                  sellerName: item.sellerName,
                  productName: item.productName,
                  price: item.price,
                })
              }
            >
              <Text style={[styles.editBtnText, { color: colors.primary }]}>Edit</Text>
            </Pressable>
          ) : (
            // Simple items: quantity stepper
            <View style={[styles.stepper, { borderColor: colors.primary }]}>
              <Pressable
                style={styles.stepperBtn}
                onPress={() => updateQuantity(item.id, item.quantity - 1)}
                hitSlop={6}
              >
                <Text style={[styles.stepperSymbol, { color: colors.primary }]}>−</Text>
              </Pressable>
              <Text style={[styles.stepperQty, { color: colors.text }]}>{item.quantity}</Text>
              <Pressable
                style={styles.stepperBtn}
                onPress={() => updateQuantity(item.id, item.quantity + 1)}
                hitSlop={6}
              >
                <Text style={[styles.stepperSymbol, { color: colors.primary }]}>+</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Swipeable>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header({
  onBack,
  colors,
  insets,
}: {
  onBack: () => void;
  colors: ReturnType<typeof useColors>;
  insets: { top: number };
}) {
  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: insets.top + spacing.sm,
          backgroundColor: colors.bg,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <Pressable onPress={onBack} style={styles.backBtn} hitSlop={8}>
        <Text style={[styles.backText, { color: colors.text }]}>←</Text>
      </Pressable>
      <Text style={[styles.headerTitle, { color: colors.text }]}>Cart</Text>
      <View style={styles.headerRight} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  backBtn: { padding: spacing.xs },
  backText: { fontSize: 22 },
  headerTitle: { flex: 1, fontSize: fontSize.display, fontWeight: fontWeight.bold, textAlign: 'center' },
  headerRight: { width: 30 },

  // Empty state
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing['3xl'] },
  emptyIcon: { fontSize: 64, marginBottom: spacing.lg },
  emptyTitle: { fontSize: fontSize.display, fontWeight: fontWeight.bold, marginBottom: spacing.sm },
  emptySubtitle: { fontSize: fontSize.body, textAlign: 'center', marginBottom: spacing['3xl'] },
  exploreBtn: {
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  exploreBtnText: { fontSize: fontSize.body, fontWeight: fontWeight.bold },

  // Seller group
  sellerGroup: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sellerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sellerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerAvatarText: { fontSize: fontSize.subhead, fontWeight: fontWeight.bold },
  sellerName: { flex: 1, fontSize: fontSize.body, fontWeight: fontWeight.bold },
  sellerItemCount: { fontSize: fontSize.caption },

  // Item row
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemInfo: { flex: 1, gap: 3 },
  itemName: { fontSize: fontSize.body, fontWeight: fontWeight.semibold },
  printSummary: { fontSize: fontSize.caption, lineHeight: 17 },
  fileCount: { fontSize: fontSize.caption },
  itemPrice: { fontSize: fontSize.subhead, fontWeight: fontWeight.bold, marginTop: 2 },
  itemActions: { alignItems: 'flex-end' },

  // Stepper
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  stepperBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  stepperSymbol: { fontSize: fontSize.bodyLg, fontWeight: fontWeight.bold },
  stepperQty: {
    fontSize: fontSize.subhead,
    fontWeight: fontWeight.bold,
    minWidth: 20,
    textAlign: 'center',
  },

  // Edit button (printing)
  editBtn: {
    borderWidth: 1.5,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  editBtnText: { fontSize: fontSize.subhead, fontWeight: fontWeight.semibold },

  // Delete swipe action
  deleteAction: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: { color: '#fff', fontSize: fontSize.subhead, fontWeight: fontWeight.bold },

  // Summary card
  summaryCard: {
    margin: spacing.lg,
    marginTop: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  summaryTitle: { fontSize: fontSize.body, fontWeight: fontWeight.bold, marginBottom: spacing.xs },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: fontSize.body, flex: 1 },
  summaryValue: { fontSize: fontSize.body, fontWeight: fontWeight.semibold },
  summaryDivider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.xs },
  summaryTotal: { fontSize: fontSize.body, fontWeight: fontWeight.bold },
  summaryTotalValue: { fontSize: fontSize.display, fontWeight: fontWeight.bold },
  deliveryNote: { fontSize: fontSize.caption, marginTop: spacing.xs },

  // Checkout bar
  checkoutBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  checkoutBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  checkoutCount: { fontSize: fontSize.caption },
  checkoutTotal: { fontSize: fontSize.bodyLg, fontWeight: fontWeight.bold },
  checkoutBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  checkoutBtnText: { fontSize: fontSize.body, fontWeight: fontWeight.bold },
});
