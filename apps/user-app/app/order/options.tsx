/**
 * Order options – copies, color/B&W. Creates order on continue, then select-seller.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors } from '@/constants/colors';
import { useOrderDraftStore } from '@/store/order-draft.store';
import { ordersApi } from '@/api/orders.api';
import { filesApi } from '@/api/files.api';

const CATEGORY_PRINTING = 'printing';
type PrintMode = 'bw' | 'color';

export default function OrderOptionsScreen() {
  const router = useRouter();
  const file = useOrderDraftStore((s) => s.file);
  const options = useOrderDraftStore((s) => s.options);
  const setOptions = useOrderDraftStore((s) => s.setOptions);
  const setOrderId = useOrderDraftStore((s) => s.setOrderId);

  const [copies, setCopies] = useState(options.copies);
  const [mode, setMode] = useState<PrintMode>(options.color ? 'color' : 'bw');
  const [error, setError] = useState<string | null>(null);

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('No file uploaded');
      const result = await ordersApi.createOrder({
        categoryId: CATEGORY_PRINTING,
        orderPayload: {
          fileUrl: file.publicUrl,
          pages: options.pages,
          copies,
          color: mode === 'color',
        },
      });
      return result;
    },
    onSuccess: async (result) => {
      if (!file) return;
      try {
        await filesApi.validateFile({
          fileKey: file.fileKey,
          orderId: result.order_id,
          originalName: file.fileName,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
        });
      } catch {
        // Non-blocking: order is created; validation record is optional
      }
      setOrderId(result.order_id);
      router.replace('/order/select-seller');
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Failed to create order'),
  });

  const onContinue = () => {
    setError(null);
    setOptions({ copies, color: mode === 'color', pages: file?.pageCount ?? 1 });
    createOrderMutation.mutate();
  };

  const pageCount = file?.pageCount ?? 1;
  const submitting = createOrderMutation.isPending;

  useEffect(() => {
    if (!file) router.replace('/order/upload');
  }, [file, router]);

  if (!file) return null;

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Print Options</Text>
        <View style={styles.placeholder} />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <MaterialIcons name="description" size={24} color={colors.primary} />
            <View>
              <Text style={styles.rowLabel}>Pages Detected</Text>
              <Text style={styles.rowHint}>Auto-calculated from file</Text>
            </View>
          </View>
          <Text style={styles.rowValue}>{pageCount}</Text>
        </View>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <MaterialIcons name="file-copy" size={24} color={colors.textMuted} />
            <Text style={styles.rowLabel}>Number of Copies</Text>
          </View>
          <View style={styles.stepper}>
            <TouchableOpacity style={styles.stepperBtn} onPress={() => setCopies((c) => Math.max(1, c - 1))}>
              <MaterialIcons name="remove" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{copies}</Text>
            <TouchableOpacity style={styles.stepperBtn} onPress={() => setCopies((c) => c + 1)}>
              <MaterialIcons name="add" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.sectionLabel}>Print Mode</Text>
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'bw' && styles.modeBtnActive]}
            onPress={() => setMode('bw')}
          >
            <MaterialIcons name="filter-b-and-w" size={18} color={mode === 'bw' ? colors.primary : colors.textMuted} />
            <Text style={[styles.modeText, mode === 'bw' && styles.modeTextActive]}>Black & White</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'color' && styles.modeBtnActive]}
            onPress={() => setMode('color')}
          >
            <MaterialIcons name="palette" size={18} color={mode === 'color' ? colors.primary : colors.textMuted} />
            <Text style={[styles.modeText, mode === 'color' && styles.modeTextActive]}>Color</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Page range</Text>
          <Text style={styles.rowValue}>All (1–{pageCount})</Text>
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton
          label={submitting ? 'Creating…' : 'Continue'}
          onPress={onContinue}
          disabled={!file || submitting}
        />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  placeholder: { width: 40 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderDark,
    marginBottom: 12,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowLabel: { fontSize: 14, fontWeight: '500', color: colors.textPrimary },
  rowHint: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  rowValue: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    padding: 4,
    gap: 8,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, minWidth: 24, textAlign: 'center' },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: 16, marginBottom: 8 },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
  },
  modeBtnActive: { backgroundColor: colors.surfaceDark, borderWidth: 1, borderColor: colors.primary },
  modeText: { fontSize: 14, fontWeight: '500', color: colors.textMuted },
  modeTextActive: { color: colors.primary },
  errorText: { fontSize: 14, color: colors.error, marginTop: 12 },
  footer: { paddingVertical: 24 },
});
