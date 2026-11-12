import { type ReactNode, Suspense, lazy, useEffect, useMemo, useState } from 'react'

import { ApiError } from '../api/client'
import { useGalaxy, useMood, useTopTracks } from '../api/queries'
import type { TimeRange } from '../api/types'
import Brand from '../components/Brand'
import MoodCard from '../components/MoodCard'
import RangeSwitch from '../components/RangeSwitch'
import DetailPanel from '../galaxy/DetailPanel'
import type { Focus } from '../galaxy/focus'
import { toStars } from '../galaxy/stars'
import { useLogout } from '../useLogout'
import { useSessionUser } from '../useSessionUser'

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
  const user = useSessionUser()
  const logout = useLogout()
  const [timeRange, setTimeRange] = useState<TimeRange>('medium_term')
  const [focus, setFocus] = useState<Focus>(null)
  const [highlightTrackId, setHighlightTrackId] = useState<string | null>(null)
  const [moodFilter, setMoodFilter] = useState<string | null>(null)

  const galaxy = useGalaxy(timeRange)
  const planets = useMemo(() => galaxy.data?.planets ?? [], [galaxy.data])
  // The constellation and nebula are extras: if they fail to load, the galaxy still works
  const topTracks = useTopTracks(timeRange)
  const tracks = useMemo(() => topTracks.data?.tracks ?? [], [topTracks.data])
  const stars = useMemo(() => toStars(tracks, planets), [tracks, planets])
  const mood = useMood(timeRange).data ?? null
  // A 401 means the session is gone and RequireSession is about to redirect: keep showing the loader
  const sessionGone = galaxy.error instanceof ApiError && galaxy.error.status === 401
  // While a new range loads, the previous galaxy stays on screen
  const switchingRange = galaxy.isFetching && galaxy.isPlaceholderData

  // A focused artist may drop out when the range changes
  const visibleFocus: Focus = focus?.kind === 'planet' && !planets.some((p) => p.id === focus.id) ? null : focus

  // Leaving a view clears any highlighted song: the closing panel never sends "pointer left"
  const [shownFocus, setShownFocus] = useState<Focus>(null)
  if (shownFocus !== visibleFocus) {
    setShownFocus(visibleFocus)
    setHighlightTrackId(null)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFocus(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className={`galaxy-page${visibleFocus ? ' focused' : ''}`}>
      {planets.length > 0 && (
        <Suspense fallback={<Status>Charting your universe…</Status>}>
          <GalaxyScene
            planets={planets}
            stars={stars}
            mood={mood}
            focus={visibleFocus}
            onFocus={setFocus}
            highlightTrackId={highlightTrackId}
            moodFilter={moodFilter}
          />
        </Suspense>
      )}

      <header className="top overlay-top">
        <Brand caption="Your universe" />
        <div className="actions">
          {stars.length > 0 && (
            <button
              type="button"
              className="tracks-btn glass"
              aria-pressed={visibleFocus?.kind === 'constellation'}
              onClick={() => setFocus(visibleFocus?.kind === 'constellation' ? null : { kind: 'constellation' })}
            >
              Top tracks
            </button>
          )}
          <RangeSwitch value={timeRange} onChange={setTimeRange} busy={switchingRange} />
          <button type="button" className="btn btn-ghost btn-small" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      {planets.length > 0 && (
        <DetailPanel
          focus={visibleFocus}
          planets={planets}
          stars={stars}
          tracks={tracks}
          mood={mood}
          user={user}
          timeRange={timeRange}
          moodFilter={moodFilter}
          onClose={() => setFocus(null)}
          onHighlightTrack={setHighlightTrackId}
          onMoodFilter={setMoodFilter}
        />
      )}

      {planets.length > 0 && mood && (
        <MoodCard
          mood={mood}
          timeRange={timeRange}
          moodFilter={moodFilter}
          onMoodFilter={setMoodFilter}
          onExplore={() => setFocus({ kind: 'nebula' })}
        />
      )}

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
