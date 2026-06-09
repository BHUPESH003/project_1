import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useColors, useTheme } from '@/theme';
import { spacing, radius } from '@/theme/spacing';
import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/IconButton';
import type { ThemeMode } from '@/theme';

const MODES: { value: ThemeMode; label: string; icon: string; description: string }[] = [
  { value: 'system', label: 'System Default', icon: '⚙️', description: 'Follows your device settings' },
  { value: 'light',  label: 'Light',          icon: '☀️', description: 'Always use light mode' },
  { value: 'dark',   label: 'Dark',           icon: '🌙', description: 'Always use dark mode' },
];

export function AppearanceScreen() {
  const colors     = useColors();
  const insets     = useSafeAreaInsets();
  const nav        = useNavigation();
  const { theme, setMode } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm, borderBottomColor: colors.border }]}>
        <IconButton icon={<Text style={{ color: colors.text, fontSize: 18 }}>←</Text>} onPress={() => nav.goBack()} size={40} />
        <AppText variant="title" style={{ color: colors.text }}>Appearance</AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + spacing['3xl'] }}
      >
        <AppText variant="caption" style={{ color: colors.text3, marginBottom: spacing.md }}>
          THEME
        </AppText>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {MODES.map((m, i) => {
            const selected = theme.mode === m.value;
            return (
              <TouchableOpacity
                key={m.value}
                style={[
                  styles.modeRow,
                  { borderBottomColor: colors.border },
                  i === MODES.length - 1 && { borderBottomWidth: 0 },
                ]}
                onPress={() => setMode(m.value)}
                activeOpacity={0.7}
              >
                <AppText style={{ fontSize: 22, width: 32 }}>{m.icon}</AppText>
                <View style={{ flex: 1 }}>
                  <AppText
                    variant="body"
                    style={{ color: selected ? colors.primary : colors.text }}
                  >
                    {m.label}
                  </AppText>
                  <AppText variant="caption" style={{ color: colors.text3, marginTop: 2 }}>
                    {m.description}
                  </AppText>
                </View>
                <View
                  style={[
                    styles.radio,
                    {
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.primary : 'transparent',
                    },
                  ]}
                >
                  {selected && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
});
