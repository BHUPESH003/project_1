import React from 'react';
import { StyleSheet, View } from 'react-native';
import { GlobalSearch } from '@/components/GlobalSearch';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { spacing } from '@/constants/spacing';

export default function SearchScreen() {
  const router = useRouter();

  return (
    <ScreenWrapper noPadding style={styles.screen}>
      <View style={styles.container}>
        <GlobalSearch onClose={() => router.back()} />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#000000',
  },
  container: {
    flex: 1,
    paddingTop: spacing.md, // Additional breathing room from camera section
  },
});
