import { Link, useSearchParams } from 'react-router'

import { loginErrorMessage, startLogin } from '../auth'
import Starfield from '../components/Starfield'

export default function Landing() {
  const [params] = useSearchParams()
  const error = loginErrorMessage(params.get('login_error'))

  return (
    <main className="landing">
      <Starfield />
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
        <div className="cta">
          <button type="button" className="btn btn-primary" onClick={startLogin}>
            Connect Spotify
          </button>
          <Link to="/demo" className="btn btn-ghost">
            Explore the demo universe
          </Link>
        </div>
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
