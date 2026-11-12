import { describe, expect, it } from 'vitest'

import type { Planet, Track } from '../api/types'
import { toStars } from './stars'

const track = (id: string): Track => ({ id, name: id, artists: [], explicit: false, album: {} })
const planet = (id: string, moonIds: string[]): Planet => ({
  id, name: id, rank: 1, orbit_radius: 0, planet_size: 0, glow_intensity: 0.5, mood: 'Calm', color: '#80FFDB', genres: [],
  moons: moonIds.map((m) => ({ id: m, name: m, rank: 1 })),
})

describe('toStars', () => {
  it('ranks tracks in order and links moons to their planet', () => {
    const stars = toStars([track('t1'), track('t2')], [planet('p1', ['t2'])])

    expect(stars.map((s) => s.rank)).toEqual([1, 2])
    expect(stars[1]).toMatchObject({ planetId: 'p1', mood: 'Calm', color: '#80FFDB' })
  })

  it('keeps tracks by artists outside the galaxy as neutral stars', () => {
    const [star] = toStars([track('t9')], [planet('p1', ['t2'])])

    expect(star).toMatchObject({ planetId: null, mood: null, color: '#e8e4f2' })
  })
})
