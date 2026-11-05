import type { TimeRange } from './api/types'

export const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: 'short_term', label: '4 weeks' },
  { value: 'medium_term', label: '6 months' },
  { value: 'long_term', label: 'All time' },
]

export const rangeLabel = (range: TimeRange) => TIME_RANGES.find((r) => r.value === range)!.label
