import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';

export default function OrderDetail() {
  const params = useLocalSearchParams();
  const { id } = params as { id: string };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: `Order ${id}` }} />
      <Text>Order details for {id}</Text>
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1, padding: 16 } });
