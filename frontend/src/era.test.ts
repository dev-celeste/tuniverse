import { describe, expect, it } from 'vitest'

import type { Track } from './api/types'
import { musicalEra } from './era'

const track = (name: string, release_date: string | null): Track => ({
  id: name, name, artists: [], explicit: false, album: { name: null, release_date, image_url: null },
})

describe('musicalEra', () => {
  it('counts tracks by decade, newest first, and finds the oldest', () => {
    const era = musicalEra([track('A', '2023-01-05'), track('B', '2019'), track('C', '2024-06'), track('D', '1977')])

    expect(era?.decades).toEqual([
      { decade: 2020, count: 2 },
      { decade: 2010, count: 1 },
      { decade: 1970, count: 1 },
    ])
    expect(era?.topDecade).toBe(2020)
    expect(era?.oldest).toEqual({ name: 'D', year: 1977 })
  })

  it('breaks a tie toward the more recent decade', () => {
    expect(musicalEra([track('A', '2001'), track('B', '2012')])?.topDecade).toBe(2010)
  })

  it('skips tracks without a usable release date', () => {
    expect(musicalEra([track('A', null), track('B', '0000'), track('C', '2015')])?.decades).toEqual([{ decade: 2010, count: 1 }])
  })

  it('is null when no track has a release date', () => {
    expect(musicalEra([track('A', null)])).toBeNull()
    expect(musicalEra([])).toBeNull()
  })
})
