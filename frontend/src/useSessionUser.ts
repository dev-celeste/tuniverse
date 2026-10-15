import { useOutletContext } from 'react-router'

import type { SpotifyUser } from './api/types'

/** The signed-in user, for pages rendered inside RequireSession. */
export function useSessionUser() {
  return useOutletContext<SpotifyUser>()
}
