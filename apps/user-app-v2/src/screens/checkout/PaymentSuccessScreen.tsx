import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { useColors } from '@/theme';
import { spacing, radius } from '@/theme/spacing';
import { fontSize, fontWeight } from '@/theme/typography';
import type { HomeStackParamList } from '@/navigation/HomeStack';

type Props = NativeStackScreenProps<HomeStackParamList, 'PaymentSuccess'>;

export function PaymentSuccessScreen({ route, navigation }: Props) {
  const { orderIds } = route.params;
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Animations
  const circleScale = useSharedValue(0);
  const checkScale = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const cardOpacity = useSharedValue(0);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value }],
  }));
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
  }));

  useEffect(() => {
    circleScale.value = withSpring(1, { damping: 12, stiffness: 180 });
    checkScale.value = withDelay(
      200,
      withSpring(1, { damping: 10, stiffness: 200 }),
    );
    titleOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
    titleTranslateY.value = withDelay(
      300,
      withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) }),
    );
    cardOpacity.value = withDelay(500, withTiming(1, { duration: 400 }));
  }, []);

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: colors.bg, paddingBottom: insets.bottom || spacing['3xl'] },
      ]}
    >
      <View style={styles.center}>
        {/* Animated checkmark circle */}
        <Animated.View
          style={[
            styles.circle,
            { backgroundColor: colors.successSoft },
            circleStyle,
          ]}
        >
          <Animated.Text style={[styles.checkmark, checkStyle]}>✓</Animated.Text>
        </Animated.View>

        {/* Title & subtitle */}
        <Animated.View style={[styles.titleBlock, titleStyle]}>
          <Text style={[styles.title, { color: colors.text }]}>Order placed!</Text>
          <Text style={[styles.subtitle, { color: colors.text2 }]}>
            {orderIds.length === 1
              ? 'Your order has been placed and is being processed.'
              : `${orderIds.length} orders placed and being processed.`}
          </Text>
        </Animated.View>

        {/* Order IDs card */}
        <Animated.View
          style={[
            styles.orderCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
            cardStyle,
          ]}
        >
          <Text style={[styles.orderCardTitle, { color: colors.text3 }]}>
            ORDER{orderIds.length > 1 ? 'S' : ''} PLACED
          </Text>
          {orderIds.map((id) => (
            <Text
              key={id}
              style={[styles.orderId, { color: colors.text }]}
              numberOfLines={1}
            >
              #{id.slice(0, 16).toUpperCase()}
            </Text>
          ))}
        </Animated.View>
      </View>

      {/* CTAs */}
      <View style={styles.actions}>
        <Pressable
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            });
          }}
        >
          <Text style={[styles.primaryBtnText, { color: colors.textOnPrimary }]}>
            Back to home
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'space-between' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['3xl'],
    gap: spacing.xl,
  },

  circle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: { fontSize: 52, color: '#059669' },

  titleBlock: { alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 28, fontWeight: fontWeight.bold, textAlign: 'center' },
  subtitle: { fontSize: fontSize.body, textAlign: 'center', lineHeight: 22 },

  orderCard: {
    width: '100%',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  orderCardTitle: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  orderId: {
    fontSize: fontSize.subhead,
    fontWeight: fontWeight.semibold,
    fontVariant: ['tabular-nums'],
  },

  actions: { paddingHorizontal: spacing.lg, gap: spacing.md },
  primaryBtn: {
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  primaryBtnText: { fontSize: fontSize.body, fontWeight: fontWeight.bold },
});
