import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useColors } from '@/theme';
import { fontSize, fontWeight } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

export function NetworkBanner() {
  const { isOffline } = useNetworkStatus();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const translateY = useSharedValue(-60);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isOffline) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      translateY.value = withSpring(-60, { damping: 20, stiffness: 200 });
      opacity.value = withTiming(0, { duration: 150 });
    }
  }, [isOffline, opacity, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[styles.banner, { paddingTop: insets.top + 4 }, animStyle]}
      pointerEvents="none"
    >
      <View style={[styles.inner, { backgroundColor: colors.text }]}>
        <Text style={[styles.dot, { color: colors.danger }]}>●</Text>
        <Text style={[styles.label, { color: colors.bg }]}>
          No internet connection
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  dot: { fontSize: 8 },
  label: { fontSize: fontSize.caption, fontWeight: fontWeight.semibold },
});
