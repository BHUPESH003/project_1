import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useColors } from '@/theme';
import { spacing, radius } from '@/theme/spacing';
import { fontSize, fontWeight } from '@/theme/typography';
import { useAddressStore } from '@/stores/addressStore';

interface HomeHeaderProps {
  onAddressTap: () => void;
  onFavoritesTap?: () => void;
  onNotificationsTap?: () => void;
}

export function HomeHeader({ onAddressTap, onFavoritesTap, onNotificationsTap }: HomeHeaderProps) {
  const colors = useColors();
  const address = useAddressStore((s) => s.selectedAddress);

  const areaLabel = address
    ? address.label.length > 22
      ? address.label.slice(0, 22) + '…'
      : address.label
    : 'Select location';

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Address pill */}
      <Pressable style={styles.addressBlock} onPress={onAddressTap} hitSlop={4}>
        <Text style={[styles.deliverTo, { color: colors.text3 }]}>
          Delivering to
        </Text>
        <View style={styles.pillRow}>
          <Text style={[styles.areaText, { color: colors.text }]} numberOfLines={1}>
            {areaLabel}
          </Text>
          <Text style={[styles.chevron, { color: colors.text2 }]}>⌄</Text>
        </View>
      </Pressable>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          style={[styles.iconBtn, { backgroundColor: colors.surface2 }]}
          onPress={onFavoritesTap}
          hitSlop={4}
        >
          <Text style={styles.icon}>♡</Text>
        </Pressable>
        <Pressable
          style={[styles.iconBtn, { backgroundColor: colors.surface2 }]}
          onPress={onNotificationsTap}
          hitSlop={4}
        >
          <Text style={styles.icon}>🔔</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  addressBlock: { flex: 1, marginRight: spacing.md },
  deliverTo: { fontSize: fontSize.micro, fontWeight: fontWeight.medium },
  pillRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  areaText: { fontSize: fontSize.body, fontWeight: fontWeight.bold },
  chevron: { fontSize: 14, fontWeight: fontWeight.bold },
  actions: { flexDirection: 'row', gap: spacing.sm },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 16 },
});
