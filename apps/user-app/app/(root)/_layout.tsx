/**
 * Root group: redirect unauthenticated users to unified auth screen.
 * This combines landing + login into a single seamless flow.
 */
import React from 'react';
import { Redirect } from 'expo-router';

export default function RootGroupLayout() {
  return <Redirect href="/auth-unified" />;
}
