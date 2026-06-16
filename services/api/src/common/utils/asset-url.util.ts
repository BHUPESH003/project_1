/**
 * Build public URL for an S3 path (folder/file).
 * Uses S3_PUBLIC_BASE_URL if set, else constructs from bucket + region.
 */
export function buildAssetUrl(
  imagePath: string | null | undefined,
  options: {
    s3PublicBaseUrl?: string;
    s3Bucket?: string;
    s3Region?: string;
  },
): string | null {
  const trimmed = imagePath?.trim();
  if (!trimmed) return null;

  // Already an absolute URL (e.g. an external image or a pre-built S3 link).
  // Return it as-is instead of prepending our S3 base, which would break it.
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const base =
    options.s3PublicBaseUrl ||
    (options.s3Bucket && options.s3Region
      ? `https://${options.s3Bucket}.s3.${options.s3Region}.amazonaws.com`
      : null);
  if (!base) return null;
  const path = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
  return `${base}/${path}`;
}
