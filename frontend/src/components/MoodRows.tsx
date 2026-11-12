import type { CSSProperties } from 'react'

import { moodColor, moodRows } from '../moods'

type Props = {
  distribution: Record<string, number>
  moodFilter: string | null
  onMoodFilter: (mood: string | null) => void
  /** Show only the biggest moods. */
  limit?: number
}

/** Mood mix rows; hovering or selecting one filters the galaxy to that mood. Shared with the mood card. */
export default function MoodRows({ distribution, moodFilter, onMoodFilter, limit }: Props) {
  const rows = moodRows(distribution).slice(0, limit)
  return (
    <ul className="moods" onPointerLeave={() => onMoodFilter(null)}>
      {rows.map(([mood, pct]) => (
        <li key={mood}>
          <button
            type="button"
            className={moodFilter === mood ? 'on' : undefined}
            style={{ '--c': moodColor(mood) } as CSSProperties}
            aria-label={`Highlight ${mood}, ${Math.round(pct)} percent`}
            aria-pressed={moodFilter === mood}
            onPointerEnter={() => onMoodFilter(mood)}
            onFocus={() => onMoodFilter(mood)}
            onBlur={() => onMoodFilter(null)}
            onClick={() => onMoodFilter(moodFilter === mood ? null : mood)}
          >
            <span className="dot" />
            <span>{mood}</span>
            <span className="bar">
              <i style={{ width: `${pct.toFixed(1)}%` }} />
            </span>
            <span className="pct">{Math.round(pct)}%</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
