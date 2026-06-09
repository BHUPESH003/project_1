import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { EditProfileScreen } from '@/screens/profile/EditProfileScreen';
import { AddressesScreen } from '@/screens/profile/AddressesScreen';
import { FavoritesScreen } from '@/screens/profile/FavoritesScreen';
import { NotificationPrefsScreen } from '@/screens/profile/NotificationPrefsScreen';
import { AppearanceScreen } from '@/screens/profile/AppearanceScreen';
import { AboutScreen } from '@/screens/profile/AboutScreen';

export type ProfileStackParamList = {
  Profile: undefined;
  EditProfile: undefined;
  Addresses: undefined;
  Favorites: undefined;
  NotificationPrefs: undefined;
  Appearance: undefined;
  About: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Addresses" component={AddressesScreen} />
      <Stack.Screen name="Favorites" component={FavoritesScreen} />
      <Stack.Screen name="NotificationPrefs" component={NotificationPrefsScreen} />
      <Stack.Screen name="Appearance" component={AppearanceScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
    </Stack.Navigator>
  );
}
