/**
 * Static UI phase: redirect to login so full auth flow is navigable.
 * TODO Phase 4: Restore useAuth and conditional redirect.
 */
import React from 'react';
import { Redirect, Slot } from 'expo-router';

export default function RootGroupLayout() {
  return <Redirect href="/(auth)/login" />;
}
