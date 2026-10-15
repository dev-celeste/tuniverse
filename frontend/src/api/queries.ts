import { useQuery } from '@tanstack/react-query'

import { ApiError, api } from './client'

// 401 (no session) and 403 (account not on the Spotify allowlist) won't fix themselves on retry
const shouldRetry = (failureCount: number, error: Error) =>
  !(error instanceof ApiError && (error.status === 401 || error.status === 403)) && failureCount < 2

export function useMe() {
  return useQuery({ queryKey: ['me'], queryFn: api.me, retry: shouldRetry })
}
