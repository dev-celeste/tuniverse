import { useEffect, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { ApiError } from '../api/client'
import { useGalaxy, useMe, useMood, useTopTracks } from '../api/queries'
import { loginErrorMessage, startLogin } from '../auth'
import { useSceneConfig } from '../galaxy/sceneContext'
import { toStars } from '../galaxy/stars'
import { clearSignedIn } from '../session'
import { useLogout } from '../useLogout'

const noop = () => {}

export default function Landing() {
  const [params] = useSearchParams()
  const me = useMe()
  const logout = useLogout()
  const navigate = useNavigate()
  const signedIn = me.isSuccess
  // Spotify answers 403 for accounts not on the app's allowlist, even right after a good login
  const notInvited = me.error instanceof ApiError && me.error.status === 403
  const error = signedIn ? null : loginErrorMessage(notInvited ? 'not_invited' : params.get('login_error'))
  // Just back from logging in: show the start screen for a beat, then dive into the galaxy
  const welcoming = signedIn && params.has('welcome')

  // The session is gone, and the start screen has explained it if needed: reset the flag
  // so the next visit doesn't say "session ended" again
  useEffect(() => {
    if (me.error instanceof ApiError && me.error.status === 401) clearSignedIn()
  }, [me.error])

  // Behind the title: the demo galaxy, seen from far out
  const galaxy = useGalaxy('medium_term', 'demo').data
  const tracks = useTopTracks('medium_term', 'demo').data
  const mood = useMood('medium_term', 'demo').data
  const scene = useMemo(
    () =>
      galaxy
        ? {
            mode: 'landing' as const,
            planets: galaxy.planets,
            stars: tracks ? toStars(tracks.tracks, galaxy.planets) : [],
            mood: mood ?? null,
            focus: null,
            onFocus: noop,
            highlightTrackId: null,
            moodFilter: null,
          }
        : null,
    [galaxy, tracks, mood],
  )
  useSceneConfig(scene)

  useEffect(() => {
    if (!welcoming || !scene) return
    const timer = setTimeout(() => navigate('/galaxy', { replace: true }), 1200)
    return () => clearTimeout(timer)
  }, [welcoming, scene, navigate])

  return (
    <main className="landing">
      <section className="landing-inner" aria-labelledby="landing-title">
        <p className="eyebrow">Your listening, mapped</p>
        <h1 className="wordmark-xl" id="landing-title">
          Tun<em>i</em>verse
        </h1>
        <p className="tagline">
          Your top artists become planets, your favorite songs form a constellation, and your moods color the nebula.
        </p>
        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}
        {welcoming ? (
          <p className="status" role="status">
            Entering your universe…
          </p>
        ) : (
          <div className="cta">
            {signedIn ? (
              <Link to="/galaxy" className="btn btn-primary">
                Enter your universe
              </Link>
            ) : (
              <button type="button" className="btn btn-primary" onClick={startLogin}>
                Connect Spotify
              </button>
            )}
            <Link to="/demo" className="btn btn-ghost">
              Explore the demo universe
            </Link>
          </div>
        )}
        {signedIn && !welcoming && (
          <p className="signed-in">
            Signed in as {me.data.display_name ?? 'you'} ·{' '}
            <button type="button" className="link-button" onClick={logout}>
              Log out
            </button>
          </p>
        )}
        <ul className="legend" aria-label="What you'll see">
          <li><b>Planets</b> · artists</li>
          <li><b>Stars</b> · top tracks</li>
          <li><b>Nebula</b> · mood</li>
        </ul>
        <p className="fineprint">
          Read-only access to your top artists and tracks. Spotify sign-in is invite-only while the app is in
          development; the demo shows everything with sample data.
        </p>
      </section>
    </main>
  )
}
