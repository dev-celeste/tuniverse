import { type ReactNode, Suspense, lazy } from 'react'

import { ApiError } from '../api/client'
import { useGalaxy } from '../api/queries'
import Brand from '../components/Brand'
import { useLogout } from '../useLogout'

// three.js is large: load the scene only when someone reaches their galaxy
const GalaxyScene = lazy(() => import('../galaxy/GalaxyScene'))

function Status({ children }: { children: ReactNode }) {
  return (
    <main className="overlay-center">
      <p className="status" role="status">
        {children}
      </p>
    </main>
  )
}

export default function Galaxy() {
  const logout = useLogout()
  const galaxy = useGalaxy('medium_term')
  const planets = galaxy.data?.planets ?? []
  // A 401 means the session is gone and RequireSession is about to redirect: keep showing the loader
  const sessionGone = galaxy.error instanceof ApiError && galaxy.error.status === 401

  return (
    <div className="galaxy-page">
      {planets.length > 0 && (
        <Suspense fallback={<Status>Charting your universe…</Status>}>
          <GalaxyScene planets={planets} />
        </Suspense>
      )}

      <header className="top overlay-top">
        <Brand caption="Your universe" />
        <button type="button" className="btn btn-ghost btn-small" onClick={logout}>
          Log out
        </button>
      </header>

      {(galaxy.isPending || sessionGone) && <Status>Charting your universe…</Status>}

      {galaxy.isError && !sessionGone && (
        <main className="overlay-center">
          <section className="card glass" role="alert">
            <p className="eyebrow">Something went wrong</p>
            <p>Tuniverse couldn't load your galaxy: {galaxy.error.message}</p>
            <button type="button" className="btn btn-ghost btn-small" onClick={() => galaxy.refetch()}>
              Try again
            </button>
          </section>
        </main>
      )}

      {galaxy.isSuccess && planets.length === 0 && (
        <main className="overlay-center">
          <section className="card glass" aria-labelledby="empty-title">
            <p className="eyebrow">Your universe</p>
            <h1 id="empty-title">Still forming</h1>
            <p>
              Spotify doesn't have enough listening history for you yet. Listen for a few days and your planets will
              appear here.
            </p>
          </section>
        </main>
      )}
    </div>
  )
}
