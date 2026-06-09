import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { OtpScreen } from '@/screens/auth/OtpScreen';

export type AuthStackParamList = {
  Login: undefined;
  OTP: { phone: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="OTP"   component={OtpScreen} />
    </Stack.Navigator>
  );
}
