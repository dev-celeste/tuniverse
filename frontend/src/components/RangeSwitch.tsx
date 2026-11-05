import type { TimeRange } from '../api/types'
import { TIME_RANGES } from '../timeRanges'

type Props = {
  value: TimeRange
  onChange: (range: TimeRange) => void
  /** True while the newly chosen range is loading. */
  busy: boolean
}

/** 4 weeks / 6 months / All time. */
export default function RangeSwitch({ value, onChange, busy }: Props) {
  return (
    <div className="ranges glass" role="radiogroup" aria-label="Listening period" aria-busy={busy}>
      {TIME_RANGES.map((range) => (
        <button
          key={range.value}
          type="button"
          role="radio"
          aria-checked={value === range.value}
          className={value === range.value && busy ? 'loading' : undefined}
          onClick={() => onChange(range.value)}
        >
          {range.label}
        </button>
      ))}
    </div>
  )
}
