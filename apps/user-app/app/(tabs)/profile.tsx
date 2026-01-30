import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Profile' }} />
      <Text>Profile and account settings</Text>
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1, padding: 16 } });
