import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useColors } from '@/theme';
import { spacing } from '@/theme/spacing';
import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';
import { AppTextInput } from '@/components/ui/TextInput';
import { useAuthStore } from '@/stores/authStore';
import { useUpdateProfile } from '@/api/hooks/useProfile';
import { showToast } from '@/stores/toastStore';

const schema = z.object({
  name:  z.string().min(1, 'Name is required'),
  email: z.string().email('Enter a valid email').or(z.literal('')),
});
type FormValues = z.infer<typeof schema>;

export function EditProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const nav    = useNavigation();
  const user   = useAuthStore((s) => s.user);
  const updateUserStore = useAuthStore((s) => s.updateUser);
  const { mutateAsync, isPending } = useUpdateProfile();

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:  user?.name ?? '',
      email: user?.email ?? '',
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      const updated = await mutateAsync({
        name:  values.name,
        email: values.email || undefined,
      });
      await updateUserStore(updated);
      showToast({ type: 'success', message: 'Profile updated' });
      nav.goBack();
    } catch {
      showToast({ type: 'error', message: 'Failed to update profile' });
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm, borderBottomColor: colors.border }]}>
          <IconButton
            icon={<Text style={{ color: colors.text, fontSize: 18 }}>←</Text>}
            onPress={() => nav.goBack()}
            size={40}
          />
          <AppText variant="title" style={{ color: colors.text }}>Edit Profile</AppText>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing['3xl'] }]}
          keyboardShouldPersistTaps="handled"
        >
          <Controller
            control={control}
            name="name"
            render={({ field: { value, onChange, onBlur } }) => (
              <AppTextInput
                label="Full Name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Your name"
                autoCapitalize="words"
                error={errors.name?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="email"
            render={({ field: { value, onChange, onBlur } }) => (
              <AppTextInput
                label="Email (optional)"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email?.message}
              />
            )}
          />

          <View style={{ marginTop: spacing.xl }}>
            <Button
              label={isPending ? 'Saving…' : 'Save Changes'}
              onPress={handleSubmit(onSubmit)}
              disabled={isPending}
            />
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
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
  scroll: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
});
