import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router'

import { ApiError } from '../api/client'
import { type Source, useDemoUser, useGalaxy, useMood, useTopTracks } from '../api/queries'
import type { SpotifyUser, TimeRange } from '../api/types'
import { startLogin } from '../auth'
import Brand from '../components/Brand'
import MoodCard from '../components/MoodCard'
import RangeSwitch from '../components/RangeSwitch'
import DetailPanel from '../galaxy/DetailPanel'
import type { Focus } from '../galaxy/focus'
import { useSceneConfig } from '../galaxy/sceneContext'
import { toStars } from '../galaxy/stars'
import { useLogout } from '../useLogout'

function Status({ children }: { children: ReactNode }) {
  return (
    <main className="overlay-center">
      <p className="status" role="status">
        {children}
      </p>
    </main>
  )
}

/**
 * Your galaxy (source "live", inside RequireSession) or the demo universe (source "demo", sample
 * data, no login). Draws the panels and controls; the 3D scene itself lives in the Universe layout.
 */
export default function Galaxy({ source }: { source: Source }) {
  const demo = source === 'demo'
  // Live: the signed-in user from RequireSession. Demo: the sample listener.
  const sessionUser = useOutletContext<SpotifyUser | undefined>()
  const demoUser = useDemoUser().data
  const user = demo ? demoUser : sessionUser
  const logout = useLogout()
  const [timeRange, setTimeRange] = useState<TimeRange>('medium_term')
  const [focus, setFocus] = useState<Focus>(null)
  const [highlightTrackId, setHighlightTrackId] = useState<string | null>(null)
  const [moodFilter, setMoodFilter] = useState<string | null>(null)

  const galaxy = useGalaxy(timeRange, source)
  const planets = useMemo(() => galaxy.data?.planets ?? [], [galaxy.data])
  // The constellation and nebula are extras: if they fail to load, the galaxy still works
  const topTracks = useTopTracks(timeRange, source)
  const tracks = useMemo(() => topTracks.data?.tracks ?? [], [topTracks.data])
  const stars = useMemo(() => toStars(tracks, planets), [tracks, planets])
  const mood = useMood(timeRange, source).data ?? null
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

  // Point the shared scene at this galaxy once it has loaded (until then the previous scene,
  // e.g. the start screen's, stays and the camera dives in as the planets swap)
  const scene = useMemo(
    () =>
      galaxy.data
        ? { mode: 'galaxy' as const, planets, stars, mood, focus: visibleFocus, onFocus: setFocus, highlightTrackId, moodFilter }
        : null,
    [galaxy.data, planets, stars, mood, visibleFocus, highlightTrackId, moodFilter],
  )
  useSceneConfig(scene)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFocus(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className={`galaxy-page${visibleFocus ? ' focused' : ''}`}>
      <header className="top overlay-top">
        <Brand caption={demo ? 'Demo universe · sample data' : 'Your universe'} />
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
          {demo ? (
            <button type="button" className="btn btn-primary btn-small" onClick={startLogin}>
              Connect Spotify
            </button>
          ) : (
            <button type="button" className="btn btn-ghost btn-small" onClick={logout}>
              Log out
            </button>
          )}
        </div>
      </header>

      {planets.length > 0 && user && (
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
