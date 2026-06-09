import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useColors } from '@/theme';
import { spacing, radius } from '@/theme/spacing';
import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/IconButton';

const APP_VERSION = '1.0.0';

function LinkRow({ label, url }: { label: string; url: string }) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.linkRow, { borderBottomColor: colors.border }]}
      onPress={() => Linking.openURL(url)}
    >
      <AppText variant="body" style={{ color: colors.text, flex: 1 }}>{label}</AppText>
      <AppText variant="body" style={{ color: colors.text3 }}>→</AppText>
    </TouchableOpacity>
  );
}

export function AboutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const nav    = useNavigation();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm, borderBottomColor: colors.border }]}>
        <IconButton icon={<Text style={{ color: colors.text, fontSize: 18 }}>←</Text>} onPress={() => nav.goBack()} size={40} />
        <AppText variant="title" style={{ color: colors.text }}>About</AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + spacing['3xl'] }}
      >
        {/* App identity */}
        <View style={styles.brandWrap}>
          <View style={[styles.brandIcon, { backgroundColor: colors.primarySoft }]}>
            <AppText style={{ fontSize: 36 }}>🛍️</AppText>
          </View>
          <AppText variant="titleLg" style={{ color: colors.text, marginTop: spacing.md }}>
            LocalApp
          </AppText>
          <AppText variant="caption" style={{ color: colors.text3, marginTop: spacing.xs }}>
            Version {APP_VERSION}
          </AppText>
        </View>

        {/* Links */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: spacing.xl }]}>
          <LinkRow label="Privacy Policy" url="https://example.com/privacy" />
          <LinkRow label="Terms of Service" url="https://example.com/terms" />
          <LinkRow label="Help & Support" url="https://example.com/support" />
        </View>

        <AppText variant="caption" style={{ color: colors.text3, textAlign: 'center', marginTop: spacing.xl }}>
          Made with ❤️ for local businesses
        </AppText>
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
  brandWrap: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
  brandIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
});
