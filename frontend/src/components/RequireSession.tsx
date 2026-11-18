import { Navigate, Outlet } from 'react-router'

import { ApiError } from '../api/client'
import { useMe } from '../api/queries'
import { wasSignedIn } from '../session'

/**
 * Layout route for every page that needs a Spotify session. Renders the page with the
 * signed-in user as its outlet context, or sends the visitor to the start screen. Its own
 * states float over the shared 3D scene.
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
      <main className="overlay-center">
        <section className="card glass" role="alert">
          <p className="eyebrow">Something went wrong</p>
          <p>Tuniverse couldn't reach Spotify: {me.error.message}</p>
          <button type="button" className="btn btn-ghost btn-small" onClick={() => me.refetch()}>
            Try again
          </button>
        </section>
      </main>
    )
  }

  if (me.isPending) {
    return (
      <main className="overlay-center">
        <p className="status" role="status">
          Charting your universe…
        </p>
      </main>
    )
  }

  return <Outlet context={me.data} />
}
