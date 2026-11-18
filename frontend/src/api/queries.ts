import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { loadDemoUniverse } from '../demo/demoUniverse'
import { markSignedIn } from '../session'
import { api } from './client'
import type { TimeRange } from './types'

export const ME_KEY = ['me'] as const

/** Where the universe's data comes from: your Spotify account, or the sample demo. */
export type Source = 'live' | 'demo'

/** The current Spotify user; doubles as the "is there a session?" check. */
export function useMe() {
  return useQuery({
    queryKey: ME_KEY,
    queryFn: async () => {
      const user = await api.me()
      markSignedIn()
      return user
    },
  })
}

/** The demo's sample listener. */
export function useDemoUser() {
  return useQuery({ queryKey: ['demo', 'me'], queryFn: async () => (await loadDemoUniverse()).me, staleTime: Infinity })
}

/** Top artists as planets, with their top tracks as moons. */
export function useGalaxy(timeRange: TimeRange, source: Source = 'live') {
  return useQuery({
    queryKey: ['galaxy', source, timeRange],
    queryFn: async () => (source === 'demo' ? (await loadDemoUniverse()).ranges[timeRange].galaxy : api.galaxy(timeRange)),
    // Keep the current galaxy on screen while another time range loads
    placeholderData: keepPreviousData,
  })
}

/** Top 20 tracks: the constellation, plus the musical era in the core panel. */
export function useTopTracks(timeRange: TimeRange, source: Source = 'live') {
  return useQuery({
    queryKey: ['top-tracks', source, timeRange],
    queryFn: async () => (source === 'demo' ? (await loadDemoUniverse()).ranges[timeRange].top_tracks : api.topTracks(timeRange)),
    placeholderData: keepPreviousData,
  })
}

/** Mood mix from your top artists' genres: the nebula, the mood card and the core's tint. */
export function useMood(timeRange: TimeRange, source: Source = 'live') {
  return useQuery({
    queryKey: ['mood', source, timeRange],
    queryFn: async () => (source === 'demo' ? (await loadDemoUniverse()).ranges[timeRange].mood : api.mood(timeRange)),
    placeholderData: keepPreviousData,
  })
}
