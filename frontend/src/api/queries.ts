import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { markSignedIn } from '../session'
import { api } from './client'
import type { TimeRange } from './types'

export const ME_KEY = ['me'] as const

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

/** Top artists as planets, with their top tracks as moons. */
export function useGalaxy(timeRange: TimeRange) {
  return useQuery({
    queryKey: ['galaxy', timeRange],
    queryFn: () => api.galaxy(timeRange),
    // Keep the current galaxy on screen while another time range loads
    placeholderData: keepPreviousData,
  })
}

/** Top 20 tracks: the constellation, plus the musical era in the core panel. */
export function useTopTracks(timeRange: TimeRange) {
  return useQuery({
    queryKey: ['top-tracks', timeRange],
    queryFn: () => api.topTracks(timeRange),
    placeholderData: keepPreviousData,
  })
}

/** Mood mix from your top artists' genres: the nebula, the mood card and the core's tint. */
export function useMood(timeRange: TimeRange) {
  return useQuery({
    queryKey: ['mood', timeRange],
    queryFn: () => api.mood(timeRange),
    placeholderData: keepPreviousData,
  })
}
