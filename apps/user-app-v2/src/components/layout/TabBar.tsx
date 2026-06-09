import React, { useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/theme';
import { spacing, radius } from '@/theme/spacing';
import { fontSize, fontWeight } from '@/theme/typography';

// Outline icon paths via SVG strings — rendered as Text for zero-dependency
const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  Home:    { active: '⌂',   inactive: '⌂' },
  Orders:  { active: '🛍',   inactive: '🛍' },
  Profile: { active: '◉',   inactive: '◎' },
};

interface TabItemProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function TabItem({ label, active, onPress }: TabItemProps) {
  const colors = useColors();
  const scale = useRef(new Animated.Value(active ? 1 : 0.9)).current;
  const opacity = useRef(new Animated.Value(active ? 1 : 0.55)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: active ? 1 : 0.9,
        damping: 18,
        stiffness: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: active ? 1 : 0.55,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [active, scale, opacity]);

  const icon = TAB_ICONS[label] ?? { active: '●', inactive: '○' };

  return (
    <TouchableOpacity style={styles.tabItem} onPress={onPress} activeOpacity={0.7}>
      <Animated.View
        style={[
          styles.iconWrap,
          { transform: [{ scale }], opacity },
          active && { backgroundColor: colors.primarySoft },
        ]}
      >
        <Text style={[styles.icon, { color: active ? colors.primary : colors.text3 }]}>
          {active ? icon.active : icon.inactive}
        </Text>
      </Animated.View>
      <Text
        style={[
          styles.label,
          { color: active ? colors.primary : colors.text3 },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View
        style={[
          styles.bar,
          {
            backgroundColor: Platform.OS === 'android' ? colors.surface : 'rgba(255,255,255,0.88)',
            borderColor: colors.borderFaint,
            shadowColor: colors.text,
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const active = state.index === index;
          return (
            <TabItem
              key={route.key}
              label={route.name}
              active={active}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  bar: {
    flexDirection: 'row',
    borderRadius: radius['2xl'],
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    justifyContent: 'space-around',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  tabItem: {
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.lg,
  },
  iconWrap: {
    width: 44,
    height: 32,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 20 },
  label: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.3,
  },
});
