import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeStack } from './HomeStack';
import { OrdersStack } from './OrdersStack';
import { ProfileStack } from './ProfileStack';
import { CustomTabBar } from '@/components/layout/TabBar';

export type MainTabsParamList = {
  Home:    undefined;
  Orders:  undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home"    component={HomeStack} />
      <Tab.Screen name="Orders"  component={OrdersStack} />
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
}
