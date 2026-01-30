import React from 'react';
import { Redirect, Slot } from 'expo-router';
import useAuth from '@/hooks/useAuth';

/**
 * Nested layout for the initial "/" route.
 * Uses declarative <Redirect /> (which runs via useFocusEffect after the
 * navigator is ready) instead of router.replace() in useEffect, avoiding
 * "Attempted to navigate before mounting the Root Layout" errors.
 */
export default function RootGroupLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <Slot />;
  }
  if (isAuthenticated) {
    return <Redirect href="/(tabs)/home" />;
  }
  return <Redirect href="/(auth)/login" />;
}
