import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useColors } from '@/theme';
import { spacing, radius } from '@/theme/spacing';
import { fontSize } from '@/theme/typography';

interface SearchBarProps {
  onPress: () => void;
}

export function SearchBar({ onPress }: SearchBarProps) {
  const colors = useColors();

  return (
    <Pressable
      style={[
        styles.bar,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
      onPress={onPress}
    >
      <Text style={[styles.icon, { color: colors.text3 }]}>🔍</Text>
      <Text style={[styles.placeholder, { color: colors.text3 }]}>
        Search shops and products…
      </Text>
      <Text style={[styles.mic, { color: colors.text3 }]}>🎙</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.xl,
    paddingHorizontal: spacing.md,
    height: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  icon: { fontSize: 16 },
  placeholder: { flex: 1, fontSize: fontSize.body },
  mic: { fontSize: 16 },
});
