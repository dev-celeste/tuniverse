import Brand from '../components/Brand'
import Starfield from '../components/Starfield'
import { useLogout } from '../useLogout'
import { useSessionUser } from '../useSessionUser'

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0].toUpperCase()).join('')

export default function Galaxy() {
  const user = useSessionUser()
  const logout = useLogout()

  return (
    <div className="shell">
      <Starfield />
      <header className="top">
        <Brand caption="Your universe" />
        <button type="button" className="btn btn-ghost btn-small" onClick={logout}>
          Log out
        </button>
      </header>

      <main className="center">
        <section className="card glass" aria-labelledby="welcome-title">
          {user.image_url ? (
            <img className="avatar" src={user.image_url} alt="" />
          ) : (
            <span className="avatar avatar-fallback" aria-hidden="true">
              {initials(user.display_name ?? 'You')}
            </span>
          )}
          <p className="eyebrow">Connected to Spotify</p>
          <h1 id="welcome-title">{user.display_name ?? 'Welcome'}</h1>
          {user.followers != null && (
            <span className="stat">
              {user.followers.toLocaleString()} {user.followers === 1 ? 'follower' : 'followers'}
            </span>
          )}
          <p>You're connected. The 3D galaxy of your artists, tracks and moods is being built next.</p>
        </section>
      </main>
    </div>
  )
}
