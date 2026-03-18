/**
 * App entry – redirect to login or home based on auth state.
 * Waits for token restore before redirecting.
 */
import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Loader } from '@/components/Loader';
import { useAuthStore } from '@/store/auth.store';

export default function Index() {
  const [ready, setReady] = useState(false);
  const restoreToken = useAuthStore((s) => s.restoreToken);
  const isAuthenticated = useAuthStore((s) => !!s.token && !!s.user);

  useEffect(() => {
    restoreToken().then(() => setReady(true));
  }, [restoreToken]);

  if (!ready) {
    return (
      <View style={styles.container}>
        <Loader />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/home" />;
  }

  return <Redirect href="/auth-unified" />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
