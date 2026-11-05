import { useQuery } from '@tanstack/react-query'

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
  return useQuery({ queryKey: ['galaxy', timeRange], queryFn: () => api.galaxy(timeRange) })
}
