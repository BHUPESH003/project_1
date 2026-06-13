import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeStack } from './HomeStack';
import { OrdersStack } from './OrdersStack';
import { ProfileStack } from './ProfileStack';
import { CustomTabBar } from '@/components/layout/TabBar';
import { FloatingCartBar } from '@/components/layout/FloatingCartBar';
import type { RootStackParamList } from './RootNavigator';

export type MainTabsParamList = {
  Home:    undefined;
  Orders:  undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

// Tab bar content height (icon + label + vertical padding), excluding safe area
const TAB_BAR_CONTENT_HEIGHT = 72;

type Props = NativeStackScreenProps<RootStackParamList, 'Main'>;

export function MainTabs({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = TAB_BAR_CONTENT_HEIGHT + Math.max(insets.bottom, 8);

  function handleCartPress() {
    // Bubbles through the navigator tree: root stack → tab navigator → home stack → Cart
    (navigation as any).navigate('Home', { screen: 'Cart' });
  }

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="Home"    component={HomeStack} />
        <Tab.Screen name="Orders"  component={OrdersStack} />
        <Tab.Screen name="Profile" component={ProfileStack} />
      </Tab.Navigator>

      {/* Rendered after Tab.Navigator → sits above the tab bar in z-order on Android */}
      <FloatingCartBar
        onPress={handleCartPress}
        bottomOffset={tabBarHeight}
      />
    </View>
  );
}
