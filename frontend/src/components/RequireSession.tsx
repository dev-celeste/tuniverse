import { Navigate, Outlet } from 'react-router'

import { ApiError } from '../api/client'
import { useMe } from '../api/queries'
import { wasSignedIn } from '../session'
import Starfield from './Starfield'

/**
 * Layout route for every page that needs a Spotify session. Renders the page with the
 * signed-in user (read it with useSessionUser), or sends the visitor to the start screen.
 */
export default function RequireSession() {
  const me = useMe()

  if (me.isError) {
    if (me.error instanceof ApiError && me.error.status === 401) {
      // Only explain if they had a session; first-time visitors just see the start screen
      return <Navigate to={wasSignedIn() ? '/?login_error=session_expired' : '/'} replace />
    }
    if (me.error instanceof ApiError && me.error.status === 403) {
      return <Navigate to="/?login_error=not_invited" replace />
    }
    return (
      <div className="shell">
        <Starfield />
        <main className="center">
          <section className="card glass" role="alert">
            <p className="eyebrow">Something went wrong</p>
            <p>Tuniverse couldn't reach Spotify: {me.error.message}</p>
            <button type="button" className="btn btn-ghost btn-small" onClick={() => me.refetch()}>
              Try again
            </button>
          </section>
        </main>
      </div>
    )
  }

  if (me.isPending) {
    return (
      <div className="shell">
        <Starfield />
        <main className="center">
          <p className="status" role="status">
            Charting your universe…
          </p>
        </main>
      </div>
    )
  }

  return <Outlet context={me.data} />
}
