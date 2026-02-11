/**
 * Upload file – expo-document-picker, presigned URL, S3 upload, then options.
 * Includes PDF page count detection and preview for multi-page documents.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Loader } from '@/components/Loader';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { filesApi } from '@/api/files.api';
import { useOrderDraftStore } from '@/store/order-draft.store';

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Detect PDF page count from buffer
async function getPDFPageCount(uri: string): Promise<number> {
  try {
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const text = new TextDecoder().decode(uint8Array);
    
    // Count /Page entries in PDF (simplified detection)
    const pageMatches = text.match(/\/Type\s*\/Pages/g);
    if (pageMatches && pageMatches.length > 0) {
      // For more accurate count, look for /Count in pages dict
      const countMatches = text.match(/\/Count\s+(\d+)/g);
      if (countMatches && countMatches.length > 0) {
        const match = countMatches[countMatches.length - 1].match(/\d+/);
        if (match) return parseInt(match[0], 10);
      }
    }
    
    // Fallback: count /Page objects
    const pageObjects = text.match(/\/Type\s*\/Page\s*>>/g) || [];
    return pageObjects.length || 1;
  } catch {
    // If page detection fails, assume 1 page
    return 1;
  }
}

export default function UploadScreen() {
  const router = useRouter();
  const [file, setFile] = useState<{
    name: string;
    size: number;
    mimeType: string;
    uri: string;
    pageCount?: number;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [detectingPages, setDetectingPages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setDraftFile = useOrderDraftStore((s) => s.setFile);
  const draftFile = useOrderDraftStore((s) => s.file);

  const pickFile = async () => {
    setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ALLOWED_TYPES,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const f = result.assets[0];
      if (f.size && f.size > MAX_SIZE_BYTES) {
        setError(`File must be under ${formatSize(MAX_SIZE_BYTES)}`);
        return;
      }

      const newFile = {
        name: f.name,
        size: f.size ?? 0,
        mimeType: f.mimeType ?? 'application/octet-stream',
        uri: f.uri,
        pageCount: 1,
      };

      // Detect page count for PDFs
      if (f.mimeType === 'application/pdf') {
        setDetectingPages(true);
        try {
          const pageCount = await getPDFPageCount(f.uri);
          newFile.pageCount = pageCount;
        } catch (e) {
          console.warn('Failed to detect PDF pages:', e);
          newFile.pageCount = 1;
        } finally {
          setDetectingPages(false);
        }
      }

      setFile(newFile);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to pick file');
    }
  };

  const onContinue = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const presigned = await filesApi.getPresignedUrl({
        fileName: file.name,
        mimeType: file.mimeType,
        fileSize: file.size,
      });
      const publicUrl = presigned.publicUrl ?? presigned.uploadUrl;
      const uploadUrl = presigned.uploadUrl;
      const headers: Record<string, string> = {
        ...(presigned.headers ?? {}),
        'Content-Type': file.mimeType,
      };
      const response = await fetch(file.uri);
      const blob = await response.blob();
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers,
        body: blob,
      });
      if (!putRes.ok) {
        throw new Error(`Upload failed: ${putRes.status}`);
      }
      setDraftFile({
        fileKey: presigned.fileKey,
        publicUrl,
        fileName: file.name,
        sizeBytes: file.size,
        mimeType: file.mimeType,
        pageCount: file.pageCount,
      });
      router.push('/order/options');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setError(null);
    setDraftFile(null);
  };

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <MaterialIcons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>New Print Order</Text>
        <View style={styles.placeholder} />
      </View>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentPadding}>
        <TouchableOpacity
          style={styles.uploadZone}
          onPress={pickFile}
          activeOpacity={0.9}
          disabled={uploading || detectingPages}
        >
          {uploading || detectingPages ? (
            <Loader />
          ) : (
            <View style={styles.uploadIconWrap}>
              <MaterialIcons name="cloud-upload" size={32} color={file ? colors.primary : colors.textMuted} />
            </View>
          )}
          <Text style={styles.uploadTitle}>{file ? 'File selected' : 'Upload File'}</Text>
          <Text style={styles.uploadSubtitle}>
            {file ? `${file.name} • ${formatSize(file.size)}` : 'Tap to pick PDF, DOC, or image'}
          </Text>
        </TouchableOpacity>

        {file && !uploading && (
          <View style={styles.fileDetailsCard}>
            <View style={styles.fileHeader}>
              <View style={styles.fileIconWrap}>
                <MaterialIcons 
                  name={file.mimeType === 'application/pdf' ? 'picture-as-pdf' : 'insert-drive-file'}
                  size={32}
                  color={colors.primary}
                />
              </View>
              <View style={styles.fileHeaderInfo}>
                <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                <Text style={styles.fileSize}>{formatSize(file.size)}</Text>
              </View>
              <TouchableOpacity onPress={clearFile}>
                <MaterialIcons name="delete" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Page count for PDF files */}
            {file.mimeType === 'application/pdf' && (
              <View style={styles.pageInfoCard}>
                <View style={styles.pageInfoRow}>
                  <View style={styles.pageInfoIcon}>
                    <MaterialIcons name="pages" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.pageInfoContent}>
                    <Text style={styles.pageInfoLabel}>Pages Detected</Text>
                    <Text style={styles.pageInfoValue}>
                      {file.pageCount} {file.pageCount === 1 ? 'page' : 'pages'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.pageInfoHint}>
                  You'll be able to select copies and color options next
                </Text>
              </View>
            )}
          </View>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={uploading ? 'Uploading…' : detectingPages ? 'Detecting pages…' : 'Continue'}
          onPress={onContinue}
          disabled={!file || uploading || detectingPages}
        />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxs,
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.sectionHeader, color: colors.textPrimary },
  placeholder: { width: 40 },
  content: { flex: 1 },
  contentPadding: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  uploadZone: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.borderDark,
    backgroundColor: colors.surfaceDark,
    marginBottom: spacing.lg,
  },
  uploadIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  uploadTitle: { ...typography.primary, color: colors.textPrimary, marginBottom: spacing.xxs },
  uploadSubtitle: { ...typography.meta, color: colors.textMuted },
  fileDetailsCard: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderDark,
    marginBottom: spacing.lg,
  },
  fileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  fileIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileHeaderInfo: { flex: 1 },
  fileName: { ...typography.secondary, color: colors.textPrimary, marginBottom: spacing.xxs },
  fileSize: { ...typography.meta, color: colors.textMuted },
  pageInfoCard: {
    backgroundColor: colors.primaryTint,
    borderRadius: 10,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  pageInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  pageInfoIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageInfoContent: { flex: 1 },
  pageInfoLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase' },
  pageInfoValue: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginTop: spacing.xxs },
  pageInfoHint: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  errorText: { ...typography.secondary, color: colors.error, marginTop: spacing.sm },
  footer: { paddingVertical: spacing.lg, paddingHorizontal: spacing.lg },
});
