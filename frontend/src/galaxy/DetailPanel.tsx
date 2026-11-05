import type { CSSProperties } from 'react'

import type { Planet, SpotifyUser, TimeRange } from '../api/types'
import { formatCount, formatDuration, initials, pad2 } from '../format'
import { rangeLabel } from '../timeRanges'
import type { Focus } from './focus'

type Props = {
  focus: Focus
  planets: Planet[]
  user: SpotifyUser
  timeRange: TimeRange
  onClose: () => void
  onHighlightMoon: (moonId: string | null) => void
}

/** The panel that slides in when you visit a planet or the core. */
export default function DetailPanel({ focus, planets, user, timeRange, onClose, onHighlightMoon }: Props) {
  const planet = focus?.kind === 'planet' ? planets.find((p) => p.id === focus.id) : undefined
  const open = focus?.kind === 'core' || planet !== undefined

  return (
    // inert while closed: hidden from assistive tech and unreachable by keyboard
    <aside className={`panel glass${open ? '' : ' closed'}`} aria-label="Details" inert={!open}>
      {open && (
        <button type="button" className="back" onClick={onClose}>
          ← Galaxy <kbd>Esc</kbd>
        </button>
      )}
      {planet && <PlanetDetails planet={planet} timeRange={timeRange} onHighlightMoon={onHighlightMoon} />}
      {focus?.kind === 'core' && <CoreDetails user={user} planets={planets} timeRange={timeRange} />}
    </aside>
  )
}

function Portrait({ src, name, color, label }: { src: string | null | undefined; name: string; color: string; label: string }) {
  return src ? (
    <img className="portrait" src={src} alt={label} />
  ) : (
    <span className="portrait portrait-fallback" style={{ '--c': color } as CSSProperties} role="img" aria-label={label}>
      {initials(name)}
    </span>
  )
}

function PlanetDetails({ planet, timeRange, onHighlightMoon }: { planet: Planet; timeRange: TimeRange; onHighlightMoon: (id: string | null) => void }) {
  const moons = [...planet.moons].sort((a, b) => a.rank - b.rank)

  return (
    <>
      <div className="headline">
        <Portrait src={planet.image_url} name={planet.name} color={planet.color} label={`Photo of ${planet.name}`} />
        <p className="eyebrow">
          Rank {pad2(planet.rank)} · Top artist · {rangeLabel(timeRange)}
        </p>
        <h2>{planet.name}</h2>
        <p className="chip">
          <span className="dot" style={{ '--c': planet.color } as CSSProperties} />
          {planet.mood}
        </p>
      </div>

      <dl className="stats">
        {planet.popularity != null && (
          <div>
            <dt>Popularity</dt>
            <dd>
              {planet.popularity}
              <small>/100</small>
            </dd>
          </div>
        )}
        {planet.followers != null && (
          <div>
            <dt>Followers</dt>
            <dd>{formatCount(planet.followers)}</dd>
          </div>
        )}
        <div>
          <dt>Moons</dt>
          <dd>
            {planet.moons.length}
            <small> {planet.moons.length === 1 ? 'track' : 'tracks'}</small>
          </dd>
        </div>
      </dl>

      <p className="genres">
        {planet.genres.length ? planet.genres.join(' · ') : 'Spotify has no genres for this artist, so the planet stays neutral gray.'}
      </p>

      <p className="section-title">Orbiting tracks</p>
      {moons.length ? (
        <ol className="tracks">
          {moons.map((moon) => {
            const content = (
              <>
                {moon.album_image_url ? (
                  <img className="art" src={moon.album_image_url} alt="" />
                ) : (
                  <span className="art art-fallback" aria-hidden="true" />
                )}
                <span className="t">
                  <b>{moon.name}</b>
                  <small>#{moon.rank} in your top tracks</small>
                </span>
                {moon.duration_ms != null && <span className="d">{formatDuration(moon.duration_ms)}</span>}
              </>
            )
            const highlight = {
              onPointerEnter: () => onHighlightMoon(moon.id),
              onPointerLeave: () => onHighlightMoon(null),
              onFocus: () => onHighlightMoon(moon.id),
              onBlur: () => onHighlightMoon(null),
            }
            return (
              <li key={moon.id}>
                {moon.spotify_url ? (
                  <a href={moon.spotify_url} target="_blank" rel="noopener noreferrer" aria-label={`${moon.name}, open in Spotify`} {...highlight}>
                    {content}
                  </a>
                ) : (
                  <div className="row" tabIndex={0} {...highlight}>
                    {content}
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="empty">None of their songs are in your top 50 tracks. You listen to them across many songs instead of one favorite.</p>
      )}

      {planet.spotify_url && (
        <a className="out" href={planet.spotify_url} target="_blank" rel="noopener noreferrer">
          Open {planet.name} in Spotify ↗
        </a>
      )}
      <p className="key">Color shows genre family · glow shows popularity · distance from the core shows rank</p>
    </>
  )
}

function CoreDetails({ user, planets, timeRange }: { user: SpotifyUser; planets: Planet[]; timeRange: TimeRange }) {
  const name = user.display_name ?? 'You'
  const moonCount = planets.reduce((n, p) => n + p.moons.length, 0)

  return (
    <>
      <div className="headline">
        <Portrait src={user.image_url} name={name} color="#d8c49c" label="Your Spotify profile photo" />
        <p className="eyebrow">Your universe · {rangeLabel(timeRange)}</p>
        <h2>{name}</h2>
      </div>

      <dl className="stats">
        {user.followers != null && (
          <div>
            <dt>Followers</dt>
            <dd>{formatCount(user.followers)}</dd>
          </div>
        )}
        <div>
          <dt>Planets</dt>
          <dd>
            {planets.length}
            <small> artists</small>
          </dd>
        </div>
        <div>
          <dt>Moons</dt>
          <dd>
            {moonCount}
            <small> {moonCount === 1 ? 'track' : 'tracks'}</small>
          </dd>
        </div>
      </dl>

      {user.profile_url && (
        <a className="out" href={user.profile_url} target="_blank" rel="noopener noreferrer">
          Open your Spotify profile ↗
        </a>
      )}
      <p className="key">Planets are your top artists, moons are your top tracks, and you're the light at the center.</p>
    </>
  )
}
