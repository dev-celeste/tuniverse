import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useNavigate } from 'react-router'

import { ApiError, api } from '../api/client'
import { useMe } from '../api/queries'
import Brand from '../components/Brand'
import Starfield from '../components/Starfield'

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0].toUpperCase()).join('')

export default function Galaxy() {
  const me = useMe()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // No session → start screen. Not on the Spotify allowlist → start screen with an explanation.
  // (Ticket 16 moves this into a shared protected-route layer.)
  useEffect(() => {
    if (!(me.error instanceof ApiError)) return
    if (me.error.status === 401) navigate('/', { replace: true })
    if (me.error.status === 403) navigate('/?login_error=not_invited', { replace: true })
  }, [me.error, navigate])

  async function logout() {
    try {
      await api.logout()
    } finally {
      queryClient.clear()
      navigate('/', { replace: true })
    }
  }

  return (
    <div className="shell">
      <Starfield />
      <header className="top">
        <Brand caption="Your universe" />
        {me.data && (
          <button type="button" className="btn btn-ghost btn-small" onClick={logout}>
            Log out
          </button>
        )}
      </header>

      <main className="center">
        {me.isPending && <p className="status">Charting your universe…</p>}

        {me.isError && !(me.error instanceof ApiError && [401, 403].includes(me.error.status)) && (
          <section className="card glass" role="alert">
            <p className="eyebrow">Something went wrong</p>
            <p>Tuniverse couldn't reach Spotify: {me.error.message}</p>
            <button type="button" className="btn btn-ghost btn-small" onClick={() => me.refetch()}>
              Try again
            </button>
          </section>
        )}

        {me.data && (
          <section className="card glass" aria-labelledby="welcome-title">
            {me.data.image_url ? (
              <img className="avatar" src={me.data.image_url} alt="" />
            ) : (
              <span className="avatar avatar-fallback" aria-hidden="true">
                {initials(me.data.display_name ?? 'You')}
              </span>
            )}
            <p className="eyebrow">Connected to Spotify</p>
            <h1 id="welcome-title">{me.data.display_name ?? 'Welcome'}</h1>
            {me.data.followers != null && (
              <span className="stat">
                {me.data.followers.toLocaleString()} {me.data.followers === 1 ? 'follower' : 'followers'}
              </span>
            )}
            <p>You're connected. The 3D galaxy of your artists, tracks and moods is being built next.</p>
          </section>
        )}
      </main>
    </div>
  )
}
