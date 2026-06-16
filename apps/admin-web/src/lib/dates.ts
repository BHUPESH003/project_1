import type { AnalyticsGranularity } from '@/types/api'

export interface DateRange {
  startDate: string
  endDate: string
}

export type RangePreset = '7d' | '30d' | 'month'

/** Compute a preset date range. Lives outside React so the Date reads aren't
 * flagged by the render-purity rule. */
export function presetRange(preset: RangePreset): DateRange {
  const end = new Date()
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  if (preset === '7d') start.setDate(start.getDate() - 7)
  else if (preset === '30d') start.setDate(start.getDate() - 30)
  else start.setDate(1) // this month
  return { startDate: start.toISOString(), endDate: end.toISOString() }
}

export const DEFAULT_GRANULARITY: AnalyticsGranularity = 'daily'

/** Format an ISO period for a chart axis based on granularity. */
export function formatPeriod(iso: string, granularity: AnalyticsGranularity): string {
  const d = new Date(iso)
  if (granularity === 'monthly')
    return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
