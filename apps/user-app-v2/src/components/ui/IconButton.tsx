import React from 'react';
import { Pressable, StyleSheet, type PressableProps, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useColors } from '@/theme';
import { spacing, radius } from '@/theme/spacing';

interface IconButtonProps extends Omit<PressableProps, 'style'> {
  icon: React.ReactNode;
  size?: number;
  variant?: 'default' | 'filled' | 'ghost';
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function IconButton({
  icon,
  size = 44,
  variant = 'default',
  style,
  onPress,
  ...rest
}: IconButtonProps) {
  const colors = useColors();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn() {
    scale.value = withSpring(0.9, { damping: 20, stiffness: 400 });
  }

  function handlePressOut() {
    scale.value = withSpring(1, { damping: 20, stiffness: 400 });
  }

  const bgColor =
    variant === 'filled' ? colors.primarySoft :
    variant === 'ghost'  ? 'transparent' :
    colors.surface2;

  return (
    <AnimatedPressable
      style={[
        animStyle,
        styles.base,
        { width: size, height: size, backgroundColor: bgColor },
        style,
      ]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...rest}
    >
      {icon}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
