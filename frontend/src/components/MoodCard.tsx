import type { MoodResponse, TimeRange } from '../api/types'
import { moodColor } from '../moods'
import { rangeLabel } from '../timeRanges'
import MoodRows from './MoodRows'

type Props = {
  mood: MoodResponse
  timeRange: TimeRange
  moodFilter: string | null
  onMoodFilter: (mood: string | null) => void
  onExplore: () => void
}

/** Corner summary of the mood mix; its rows double as a filter for the galaxy. */
export default function MoodCard({ mood, timeRange, moodFilter, onMoodFilter, onExplore }: Props) {
  const share = Math.round(mood.mood_distribution[mood.dominant_mood] ?? 0)

  return (
    <section className="mood-card glass" aria-label="Galaxy mood">
      <p className="eyebrow">Galaxy mood · {rangeLabel(timeRange)}</p>
      <p className="dominant" style={{ color: moodColor(mood.dominant_mood) }}>
        {mood.dominant_mood}
        {share > 0 && <small>{share}%</small>}
      </p>
      {/* Top 3 here; the full mix lives in the nebula panel */}
      <MoodRows distribution={mood.mood_distribution} moodFilter={moodFilter} onMoodFilter={onMoodFilter} limit={3} />
      <p className="basis">
        Based on {mood.artists_with_genres} of {mood.total_artists_analyzed} artists with genre data
      </p>
      <button type="button" className="mood-link" onClick={onExplore}>
        Explore the mood nebula →
      </button>
    </section>
  )
}
