import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  DimensionValue,
  Easing,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { radius } from '@/constants/radius';
import { useResolvedThemeMode } from '@/theme';

export type SkeletonVariant = 'text' | 'circle' | 'rect';

export interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({
  variant = 'rect',
  width,
  height,
  borderRadius,
  style,
}: SkeletonProps) {
  const mode = useResolvedThemeMode();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );

    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const defaults = useMemo((): { width: DimensionValue; height: number; borderRadius: number } => {
    switch (variant) {
      case 'text':
        return { width: width ?? '100%', height: height ?? 14, borderRadius: borderRadius ?? radius.full };
      case 'circle': {
        const size = height ?? 40;
        return { width: width ?? size, height: size, borderRadius: borderRadius ?? radius.full };
      }
      case 'rect':
      default:
        return { width: width ?? '100%', height: height ?? 80, borderRadius: borderRadius ?? radius.md };
    }
  }, [borderRadius, height, variant, width]);

  const baseColor = mode === 'dark' ? '#1f2937' : '#e5e7eb';

  const shimmerOpacity = shimmer.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.25, 0.55, 0.25],
  });

  const shimmerTranslate = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, 140],
  });

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: baseColor,
          width: defaults.width,
          height: defaults.height,
          borderRadius: defaults.borderRadius,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          {
            opacity: shimmerOpacity,
            transform: [{ translateX: shimmerTranslate }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '40%',
    backgroundColor: '#f3f4f6',
  },
});

export default Skeleton;
