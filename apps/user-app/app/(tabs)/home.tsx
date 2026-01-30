import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Home' }} />
      <Text>Home - categories and discovery</Text>
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1, padding: 16 } });
