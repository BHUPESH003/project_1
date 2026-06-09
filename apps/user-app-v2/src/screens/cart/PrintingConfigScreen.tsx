import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  pick,
  isErrorWithCode,
  errorCodes,
  types as pickerTypes,
  type DocumentPickerResponse,
} from '@react-native-documents/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useColors } from '@/theme';
import { spacing, radius } from '@/theme/spacing';
import { fontSize, fontWeight } from '@/theme/typography';
import { useCartStore } from '@/stores/cartStore';
import { usePresignedUrl, useValidateFile } from '@/api/hooks/useCheckout';
import { showToast } from '@/stores/toastStore';
import type { HomeStackParamList } from '@/navigation/HomeStack';
import type { PrintConfig, UploadedFile } from '@/api/types';
import { apiClient } from '@/api/client';

type Props = NativeStackScreenProps<HomeStackParamList, 'PrintingConfig'>;

interface FileState {
  doc: DocumentPickerResponse;
  uploaded?: UploadedFile;
  uploading: boolean;
  error?: string;
}

const COLOR_OPTIONS: { value: PrintConfig['colorMode']; label: string }[] = [
  { value: 'bw', label: 'B&W' },
  { value: 'color', label: 'Color' },
];

const PAPER_OPTIONS: { value: PrintConfig['paperSize']; label: string }[] = [
  { value: 'A4', label: 'A4' },
  { value: 'A3', label: 'A3' },
  { value: 'Letter', label: 'Letter' },
];

export function PrintingConfigScreen({ route, navigation }: Props) {
  const { productId, sellerId, sellerName, productName, price } = route.params;
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [files, setFiles] = useState<FileState[]>([]);
  const [activeFileIdx, setActiveFileIdx] = useState(0);
  const [colorMode, setColorMode] = useState<PrintConfig['colorMode']>('bw');
  const [paperSize, setPaperSize] = useState<PrintConfig['paperSize']>('A4');
  const [copies, setCopies] = useState(1);
  const [allPages, setAllPages] = useState(true);
  const [pageRange, setPageRange] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const addPrintingItem = useCartStore((s) => s.addPrintingItem);
  const getPresignedUrl = usePresignedUrl();
  const validateFile = useValidateFile();

  const addBtnScale = useSharedValue(1);
  const addBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: addBtnScale.value }],
  }));

  const isAnyUploading = files.some((f) => f.uploading);
  const uploadedKeys = files
    .filter((f) => f.uploaded)
    .map((f) => f.uploaded!.key);
  const canAdd = files.length > 0 && uploadedKeys.length === files.length && !isAdding;

  const unitPrice = price;
  const totalPrice =
    unitPrice * copies * Math.max(uploadedKeys.length, 1);

  async function handlePickFiles() {
    try {
      const picked = await pick({
        type: [pickerTypes.pdf, pickerTypes.images],
        allowMultiSelection: true,
      });

      const newFiles: FileState[] = picked.map((doc) => ({
        doc,
        uploading: true,
      }));
      setFiles((prev) => [...prev, ...newFiles]);

      // Upload each file
      for (let i = 0; i < picked.length; i++) {
        const doc = picked[i];
        const globalIdx = files.length + i;
        try {
          // Get presigned URL
          const { url, key } = await getPresignedUrl.mutateAsync({
            fileName: doc.name ?? `file_${Date.now()}`,
            mimeType: doc.type ?? 'application/octet-stream',
          });

          // Upload to S3 using fetch (not axios — avoids interceptors)
          const fetchRes = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': doc.type ?? 'application/octet-stream' },
            body: { uri: doc.uri, type: doc.type, name: doc.name } as unknown as Blob,
          });

          if (!fetchRes.ok) throw new Error('Upload failed');

          // Validate
          const validated = await validateFile.mutateAsync(key);

          setFiles((prev) =>
            prev.map((f, fi) =>
              fi === globalIdx ? { ...f, uploading: false, uploaded: validated } : f,
            ),
          );
        } catch (err) {
          setFiles((prev) =>
            prev.map((f, fi) =>
              fi === globalIdx
                ? { ...f, uploading: false, error: 'Upload failed' }
                : f,
            ),
          );
        }
      }
    } catch (err) {
      if (!(isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED)) {
        showToast({ type: 'error', message: 'Could not pick file' });
      }
    }
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    if (activeFileIdx >= idx && activeFileIdx > 0) {
      setActiveFileIdx((v) => v - 1);
    }
  }

  async function handleAddToCart() {
    if (!canAdd) return;
    addBtnScale.value = withSpring(0.95, { damping: 15 });
    setTimeout(() => {
      addBtnScale.value = withSpring(1, { damping: 15 });
    }, 120);

    setIsAdding(true);
    try {
      await addPrintingItem(
        { productId, sellerId, sellerName, productName, price },
        {
          colorMode,
          paperSize,
          copies,
          pages: allPages ? 'all' : pageRange,
        },
        uploadedKeys,
      );
      showToast({ type: 'success', message: 'Printing job added to cart' });
      navigation.goBack();
    } catch {
      showToast({ type: 'error', message: 'Could not add to cart' });
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + spacing.sm,
            backgroundColor: colors.bg,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={[styles.headerClose, { color: colors.text }]}>✕</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Configure print</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Product name */}
        <View style={[styles.productBanner, { backgroundColor: colors.primarySoft }]}>
          <Text style={[styles.productName, { color: colors.primary }]}>{productName}</Text>
          <Text style={[styles.productPrice, { color: colors.onPrimarySoft }]}>
            ₹{price} / file
          </Text>
        </View>

        {/* Files section */}
        <SectionHeader title="Files" colors={colors} />
        <View style={styles.sectionBody}>
          {files.map((f, idx) => (
            <FileChip
              key={idx}
              file={f}
              isActive={idx === activeFileIdx}
              onPress={() => setActiveFileIdx(idx)}
              onRemove={() => removeFile(idx)}
              colors={colors}
            />
          ))}
          <Pressable
            style={[styles.addFileBtn, { borderColor: colors.primary }]}
            onPress={handlePickFiles}
          >
            <Text style={[styles.addFileBtnText, { color: colors.primary }]}>
              + Upload PDF or image
            </Text>
          </Pressable>
        </View>

        {/* Config: Color mode */}
        <SectionHeader title="Color" colors={colors} />
        <SegmentedControl
          options={COLOR_OPTIONS}
          value={colorMode}
          onChange={(v) => setColorMode(v)}
          colors={colors}
        />

        {/* Config: Paper size */}
        <SectionHeader title="Paper size" colors={colors} />
        <SegmentedControl
          options={PAPER_OPTIONS}
          value={paperSize}
          onChange={(v) => setPaperSize(v)}
          colors={colors}
        />

        {/* Config: Copies */}
        <SectionHeader title="Copies" colors={colors} />
        <View style={styles.sectionBody}>
          <View style={[styles.stepper, { borderColor: colors.primary }]}>
            <Pressable
              style={styles.stepperBtn}
              onPress={() => setCopies((v) => Math.max(1, v - 1))}
              hitSlop={6}
            >
              <Text style={[styles.stepperSymbol, { color: colors.primary }]}>−</Text>
            </Pressable>
            <Text style={[styles.stepperQty, { color: colors.text }]}>{copies}</Text>
            <Pressable
              style={styles.stepperBtn}
              onPress={() => setCopies((v) => v + 1)}
              hitSlop={6}
            >
              <Text style={[styles.stepperSymbol, { color: colors.primary }]}>+</Text>
            </Pressable>
          </View>
        </View>

        {/* Config: Pages */}
        <SectionHeader title="Pages" colors={colors} />
        <View style={styles.sectionBody}>
          <ToggleRow
            label="All pages"
            value={allPages}
            onToggle={() => setAllPages((v) => !v)}
            colors={colors}
          />
          {!allPages && (
            <View style={[styles.pageRangeInput, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Text style={[styles.pageRangeLabel, { color: colors.text2 }]}>Range (e.g. 1-3, 5)</Text>
            </View>
          )}
        </View>

        {/* Live price */}
        <View style={[styles.pricePreview, { backgroundColor: colors.surface2 }]}>
          <Text style={[styles.pricePreviewLabel, { color: colors.text2 }]}>
            {files.length} file{files.length !== 1 ? 's' : ''} × {copies} cop{copies !== 1 ? 'ies' : 'y'}
          </Text>
          <Text style={[styles.pricePreviewValue, { color: colors.primary }]}>
            ₹{totalPrice}
          </Text>
        </View>
      </ScrollView>

      {/* Add to cart bar */}
      <View
        style={[
          styles.addBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom || spacing.lg,
          },
        ]}
      >
        <Animated.View style={addBtnStyle}>
          <Pressable
            style={[
              styles.addBtn,
              {
                backgroundColor: canAdd ? colors.primary : colors.surface3,
              },
            ]}
            onPress={handleAddToCart}
            disabled={!canAdd}
          >
            {isAdding ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                style={[
                  styles.addBtnText,
                  { color: canAdd ? colors.textOnPrimary : colors.text3 },
                ]}
              >
                {files.length === 0
                  ? 'Add a file first'
                  : isAnyUploading
                  ? 'Uploading…'
                  : `Add to cart — ₹${totalPrice}`}
              </Text>
            )}
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

// ─── Helper components ────────────────────────────────────────────────────────

function SectionHeader({ title, colors }: { title: string; colors: ReturnType<typeof useColors> }) {
  return (
    <Text style={[styles.sectionHeader, { color: colors.text3 }]}>{title.toUpperCase()}</Text>
  );
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  colors,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.segmented, { backgroundColor: colors.surface2 }]}>
      {options.map((opt) => (
        <Pressable
          key={opt.value}
          style={[
            styles.segmentedItem,
            opt.value === value && { backgroundColor: colors.primary, borderRadius: radius.sm },
          ]}
          onPress={() => onChange(opt.value)}
        >
          <Text
            style={[
              styles.segmentedText,
              { color: opt.value === value ? colors.textOnPrimary : colors.text2 },
            ]}
          >
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onToggle,
  colors,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      style={[
        styles.toggleRow,
        { borderColor: colors.border, backgroundColor: colors.surface },
      ]}
      onPress={onToggle}
    >
      <Text style={[styles.toggleLabel, { color: colors.text }]}>{label}</Text>
      <View
        style={[
          styles.toggleTrack,
          { backgroundColor: value ? colors.primary : colors.surface3 },
        ]}
      >
        <View
          style={[
            styles.toggleThumb,
            { transform: [{ translateX: value ? 16 : 0 }] },
          ]}
        />
      </View>
    </Pressable>
  );
}

function FileChip({
  file,
  isActive,
  onPress,
  onRemove,
  colors,
}: {
  file: FileState;
  isActive: boolean;
  onPress: () => void;
  onRemove: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const name = file.doc.name ?? 'File';
  const sizeMb = file.doc.size ? (file.doc.size / 1024 / 1024).toFixed(1) : null;

  return (
    <Pressable
      style={[
        styles.fileChip,
        {
          borderColor: isActive ? colors.primary : colors.border,
          backgroundColor: isActive ? colors.primarySoft : colors.surface,
        },
      ]}
      onPress={onPress}
    >
      <Text style={styles.fileChipIcon}>
        {file.doc.type?.includes('pdf') ? '📄' : '🖼'}
      </Text>
      <View style={styles.fileChipInfo}>
        <Text
          style={[styles.fileChipName, { color: colors.text }]}
          numberOfLines={1}
        >
          {name}
        </Text>
        {sizeMb && (
          <Text style={[styles.fileChipMeta, { color: colors.text3 }]}>
            {sizeMb} MB
            {file.uploaded?.pageCount != null
              ? ` · ${file.uploaded.pageCount} pages`
              : ''}
          </Text>
        )}
        {file.error && (
          <Text style={[styles.fileChipError, { color: colors.danger }]}>
            {file.error}
          </Text>
        )}
      </View>
      {file.uploading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : file.uploaded ? (
        <Text style={{ color: colors.success, fontSize: 16 }}>✓</Text>
      ) : null}
      <Pressable onPress={onRemove} hitSlop={8} style={styles.fileChipRemove}>
        <Text style={[styles.fileChipRemoveText, { color: colors.text3 }]}>✕</Text>
      </Pressable>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerClose: { fontSize: 20, padding: spacing.xs },
  headerTitle: { fontSize: fontSize.display, fontWeight: fontWeight.bold },

  productBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  productName: { fontSize: fontSize.body, fontWeight: fontWeight.bold, flex: 1 },
  productPrice: { fontSize: fontSize.body, fontWeight: fontWeight.semibold },

  sectionHeader: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.8,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionBody: { paddingHorizontal: spacing.lg, gap: spacing.sm },

  // File chip
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  fileChipIcon: { fontSize: 24 },
  fileChipInfo: { flex: 1 },
  fileChipName: { fontSize: fontSize.subhead, fontWeight: fontWeight.semibold },
  fileChipMeta: { fontSize: fontSize.caption },
  fileChipError: { fontSize: fontSize.caption },
  fileChipRemove: { padding: 2 },
  fileChipRemoveText: { fontSize: 14 },

  addFileBtn: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  addFileBtnText: { fontSize: fontSize.body, fontWeight: fontWeight.semibold },

  // Segmented control
  segmented: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    borderRadius: radius.md,
    padding: 3,
    gap: 3,
  },
  segmentedItem: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  segmentedText: { fontSize: fontSize.subhead, fontWeight: fontWeight.semibold },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  toggleLabel: { flex: 1, fontSize: fontSize.body },
  toggleTrack: {
    width: 36,
    height: 20,
    borderRadius: 10,
    padding: 2,
  },
  toggleThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
  },

  // Stepper
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  stepperBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  stepperSymbol: { fontSize: fontSize.bodyLg, fontWeight: fontWeight.bold },
  stepperQty: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    minWidth: 32,
    textAlign: 'center',
  },

  // Page range
  pageRangeInput: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pageRangeLabel: { fontSize: fontSize.body },

  // Price preview
  pricePreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  pricePreviewLabel: { fontSize: fontSize.body },
  pricePreviewValue: { fontSize: fontSize.display, fontWeight: fontWeight.bold },

  // Add bar
  addBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  addBtn: {
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  addBtnText: { fontSize: fontSize.body, fontWeight: fontWeight.bold },
});
