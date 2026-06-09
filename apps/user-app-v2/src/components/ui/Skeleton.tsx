import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, type ViewStyle } from 'react-native';
import { useColors } from '@/theme';
import { radius as radiusTokens } from '@/theme/spacing';

interface SkeletonProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width, height, borderRadius = radiusTokens.xs, style }: SkeletonProps) {
  const colors = useColors();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.skeletonBase,
          opacity,
        },
        style,
      ]}
    />
  );
}

// Convenience compound skeletons
export function SkeletonText({ lines = 1, style }: { lines?: number; style?: ViewStyle }) {
  return (
    <View style={[{ gap: 6 }, style]}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '70%' : '100%'} height={14} borderRadius={4} />
      ))}
    </View>
  );
}
