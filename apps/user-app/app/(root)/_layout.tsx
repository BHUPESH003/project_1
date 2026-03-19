import React from 'react';
import { Stack } from 'expo-router';

export default function RootGroupLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
