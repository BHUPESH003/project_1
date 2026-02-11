import React from 'react';
import { Stack } from 'expo-router';

export default function OrderLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="upload" />
      <Stack.Screen name="options" />
      <Stack.Screen name="select-seller" />
      <Stack.Screen name="delivery" />
      <Stack.Screen name="price-breakdown" />
      <Stack.Screen name="review" />
      <Stack.Screen name="payment-method" />
      <Stack.Screen name="payment-processing" />
      <Stack.Screen name="payment-success" />
      <Stack.Screen name="payment-failure" />
      <Stack.Screen name="expired" />
      <Stack.Screen name="failed" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
