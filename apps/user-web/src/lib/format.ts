import type { Numeric } from '@/api/types'

/** Coerce a Prisma Decimal (string) or number to a number. */
export function toNum(v: Numeric | null | undefined, fallback = 0): number {
  if (v == null) return fallback
  const n = typeof v === 'number' ? v : parseFloat(v)
  return Number.isFinite(n) ? n : fallback
}

/** Format an amount as ₹ with Indian grouping. `withSymbol=false` omits the ₹. */
export function money(v: Numeric | null | undefined, withSymbol = true): string {
  const n = toNum(v)
  const formatted = n.toLocaleString('en-IN', {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  })
  return withSymbol ? `₹${formatted}` : formatted
}

/** "1.2 km" / "850 m" */
export function distance(km: number | null | undefined): string {
  if (km == null) return ''
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

/** "25 min" prep/delivery label. */
export function minutes(m: number | null | undefined): string {
  if (m == null) return ''
  return `${m} min`
}

/** "+91 98765 43210" from "+919876543210". */
export function formatPhone(phone: string): string {
  return phone.replace('+91', '+91 ').replace(/(\d{5})(\d{5})$/, '$1 $2')
}

/** Resolve a stored S3 key/path or a full URL to a usable <img> src. */
const ASSET_BASE = import.meta.env.VITE_ASSET_BASE_URL ?? ''
export function assetUrl(
  pathOrUrl: string | null | undefined,
  explicitUrl?: string | null,
): string | undefined {
  if (explicitUrl) return explicitUrl
  if (!pathOrUrl) return undefined
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl
  if (!ASSET_BASE) return undefined // no CDN configured → caller shows placeholder
  return `${ASSET_BASE.replace(/\/$/, '')}/${pathOrUrl.replace(/^\//, '')}`
}

/** Relative time: "2 min ago", "3h ago", "yesterday". */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day === 1) return 'yesterday'
  if (day < 7) return `${day}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function greeting(d = new Date()): string {
  const h = d.getHours()
  if (h < 12) return 'GOOD MORNING'
  if (h < 17) return 'GOOD AFTERNOON'
  return 'GOOD EVENING'
}
