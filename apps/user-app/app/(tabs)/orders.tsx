import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function OrdersScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Orders' }} />
      <Text>Orders list will be shown here</Text>
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1, padding: 16 } });
