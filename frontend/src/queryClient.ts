import { QueryCache, QueryClient } from '@tanstack/react-query'

import { ApiError } from './api/client'
import { ME_KEY } from './api/queries'

// 401 (no session) and 403 (account not on the Spotify allowlist) won't fix themselves on retry
const shouldRetry = (failureCount: number, error: Error) =>
  !(error instanceof ApiError && (error.status === 401 || error.status === 403)) && failureCount < 2

export function createQueryClient() {
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        // A 401 from any data request means the session is gone (expired, revoked, or the
        // backend restarted). Re-check it, and RequireSession sends the user back to log in.
        if (error instanceof ApiError && error.status === 401 && query.queryKey[0] !== ME_KEY[0]) {
          client.invalidateQueries({ queryKey: ME_KEY })
        }
      },
    }),
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        // Listening stats change slowly, and each refetch costs Spotify API quota
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  })
  return client
}
