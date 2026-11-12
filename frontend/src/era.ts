import type { Track } from './api/types'

export type MusicalEra = {
  /** Decades newest first, e.g. [{ decade: 2020, count: 15 }, …]. */
  decades: { decade: number; count: number }[]
  /** The decade with the most tracks. */
  topDecade: number
  oldest: { name: string; year: number }
}

// Spotify release dates are "YYYY", "YYYY-MM" or "YYYY-MM-DD"
const releaseYear = (track: Track) => {
  const year = Number(track.album.release_date?.slice(0, 4))
  return Number.isFinite(year) && year > 1000 ? year : null
}

/** When your top tracks were released, by decade. Null if none have a release date. */
export function musicalEra(tracks: Track[]): MusicalEra | null {
  const dated = tracks.flatMap((track) => {
    const year = releaseYear(track)
    return year ? [{ name: track.name, year }] : []
  })
  if (dated.length === 0) return null

  const counts = new Map<number, number>()
  for (const { year } of dated) {
    const decade = Math.floor(year / 10) * 10
    counts.set(decade, (counts.get(decade) ?? 0) + 1)
  }
  const decades = [...counts].map(([decade, count]) => ({ decade, count })).sort((a, b) => b.decade - a.decade)
  // Ties go to the more recent decade (decades are already newest first)
  const topDecade = decades.reduce((best, d) => (d.count > best.count ? d : best)).decade
  const oldest = dated.reduce((a, b) => (b.year < a.year ? b : a))

  return { decades, topDecade, oldest }
}
