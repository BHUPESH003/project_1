import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Loader } from '@/components/Loader';

export default function RootIndex() {
  return (
    <View style={styles.container}>
      <Loader />
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 } });
