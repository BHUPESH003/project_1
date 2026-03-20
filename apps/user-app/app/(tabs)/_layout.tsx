import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { StickyMultiCartBar } from '@/components/StickyMultiCartBar';
import { colors } from '@/constants/colors';

const BRAND_TEAL = colors.primary;
const BRAND_SOFT_TEAL = colors.primaryLight;

function TabItem({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.tabItem} activeOpacity={0.8} onPress={onPress}>
      <View style={[styles.iconWrap, active && styles.iconWrapActive]}>{icon}</View>
      <Text style={[styles.tabLabel, active ? styles.tabLabelActive : styles.tabLabelInactive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ModernBottomBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const currentLeaf = segments[segments.length - 1];
  const focusedRouteName = state.routes[state.index]?.name;

  const isExploreActive = currentLeaf === 'sellers';

  const navigateToTab = (routeName: 'home' | 'orders' | 'profile') => {
    const event = navigation.emit({
      type: 'tabPress',
      target: state.routes.find((r) => r.name === routeName)?.key,
      canPreventDefault: true,
    });

    if (!event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  };

  return (
    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}> 
      <BlurView intensity={70} tint="light" style={styles.navBar}>
        <TabItem
          label="Market"
          active={focusedRouteName === 'home' && !isExploreActive}
          onPress={() => navigateToTab('home')}
          icon={<Ionicons name="home" size={24} color={focusedRouteName === 'home' && !isExploreActive ? BRAND_TEAL : '#9ca3af'} />}
        />

        <TabItem
          label="Explore"
          active={isExploreActive}
          onPress={() => router.push('/(tabs)/home/sellers')}
          icon={<Ionicons name="search-outline" size={24} color={isExploreActive ? BRAND_TEAL : '#9ca3af'} />}
        />

        <TabItem
          label="Orders"
          active={focusedRouteName === 'orders'}
          onPress={() => navigateToTab('orders')}
          icon={<Ionicons name="bag-handle-outline" size={24} color={focusedRouteName === 'orders' ? BRAND_TEAL : '#9ca3af'} />}
        />

        <TabItem
          label="Profile"
          active={focusedRouteName === 'profile'}
          onPress={() => navigateToTab('profile')}
          icon={<Ionicons name="person-outline" size={24} color={focusedRouteName === 'profile' ? BRAND_TEAL : '#9ca3af'} />}
        />
      </BlurView>
    </View>
  );
}

export default function TabsLayout() {
  const isAuthenticated = useAuthStore((s) => !!s.token && !!s.user);
  const sessionExpired = useAuthStore((s) => s.sessionExpired);
  const segments = useSegments();

  // location-selector page was removed — AddressSelector is now a modal

  if (!isAuthenticated && !sessionExpired) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <View style={styles.layoutRoot}>
      <Tabs
        tabBar={(props) => <ModernBottomBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: 'Orders',
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
          }}
        />
      </Tabs>

      <StickyMultiCartBar tabBarHeight={88} />
    </View>
  );
}

const styles = StyleSheet.create({
  layoutRoot: {
    flex: 1,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 60,
    paddingHorizontal: 10,
  },
  navBar: {
    borderRadius: 32,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    backgroundColor: Platform.OS === 'android' ? 'rgba(255,255,255,0.92)' : undefined,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  tabItem: {
    alignItems: 'center',
    gap: 4,
  },
  iconWrap: {
    padding: 8,
    borderRadius: 16,
  },
  iconWrapActive: {
    backgroundColor: BRAND_SOFT_TEAL,
  },
  tabLabel: {
    fontSize: 10,
  },
  tabLabelActive: {
    color: BRAND_TEAL,
    fontWeight: '700',
  },
  tabLabelInactive: {
    color: '#9ca3af',
    fontWeight: '500',
  },
});
