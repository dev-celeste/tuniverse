import type { Planet, Track } from '../api/types'

/** A top track placed in the constellation, linked to its artist's planet when it's also a moon. */
export type Star = {
  track: Track
  rank: number
  color: string
  /** The planet this track orbits as a moon, if its artist is in your top artists. */
  planetId: string | null
  /** That planet's mood, for the mood filter; null for artists outside the galaxy. */
  mood: string | null
}

// Tracks by artists outside the galaxy have no genre data, so their stars stay soft white
const NEUTRAL_STAR = '#e8e4f2'

export function toStars(tracks: Track[], planets: Planet[]): Star[] {
  const planetByMoon = new Map<string, Planet>()
  for (const planet of planets) for (const moon of planet.moons) planetByMoon.set(moon.id, planet)

  return tracks.map((track, i) => {
    const planet = planetByMoon.get(track.id)
    return {
      track,
      rank: i + 1,
      color: planet?.color ?? NEUTRAL_STAR,
      planetId: planet?.id ?? null,
      mood: planet?.mood ?? null,
    }
  })
}
