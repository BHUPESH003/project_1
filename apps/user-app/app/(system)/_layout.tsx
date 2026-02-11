import React from 'react';
import { Stack } from 'expo-router';

export default function SystemLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="no-internet" />
      <Stack.Screen name="error" />
      <Stack.Screen name="session-expired" />
      <Stack.Screen name="maintenance" />
    </Stack>
  );
}
