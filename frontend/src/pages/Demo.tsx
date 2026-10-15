import { Link } from 'react-router'

import Brand from '../components/Brand'
import Starfield from '../components/Starfield'

export default function Demo() {
  return (
    <div className="shell">
      <Starfield />
      <header className="top">
        <Brand caption="Demo universe · sample data" />
      </header>
      <main className="center">
        <section className="card glass" aria-labelledby="demo-title">
          <p className="eyebrow">Demo universe</p>
          <h1 id="demo-title">Coming soon</h1>
          <p>The demo universe arrives with the 3D galaxy: the same experience, on sample listening data.</p>
          <Link to="/" className="btn btn-ghost btn-small">
            Back to the start
          </Link>
        </section>
      </main>
    </div>
  )
}
