import { type CSSProperties, useEffect, useRef } from 'react'

import type { MoodResponse, Planet, SpotifyUser, TimeRange, Track } from '../api/types'
import { musicalEra } from '../era'
import { formatCount, formatDuration, initials, pad2 } from '../format'
import MoodRows from '../components/MoodRows'
import { moodColor } from '../moods'
import { rangeLabel } from '../timeRanges'
import type { Focus } from './focus'
import type { Star } from './stars'

type Props = {
  focus: Focus
  planets: Planet[]
  stars: Star[]
  tracks: Track[]
  mood: MoodResponse | null
  user: SpotifyUser
  timeRange: TimeRange
  moodFilter: string | null
  onClose: () => void
  /** Light up a track's star, moon and planet (null to clear). Moon ids are track ids. */
  onHighlightTrack: (trackId: string | null) => void
  onMoodFilter: (mood: string | null) => void
}

const swatch = (color: string) => ({ '--c': color }) as CSSProperties

/** The panel that slides in when you visit a planet, the core, the constellation or the nebula. */
export default function DetailPanel({ focus, planets, stars, tracks, mood, user, timeRange, moodFilter, onClose, onHighlightTrack, onMoodFilter }: Props) {
  const planet = focus?.kind === 'planet' ? planets.find((p) => p.id === focus.id) : undefined
  const open =
    planet !== undefined ||
    focus?.kind === 'core' ||
    (focus?.kind === 'constellation' && stars.length > 0) ||
    (focus?.kind === 'nebula' && mood !== null)

  return (
    // inert while closed: hidden from assistive tech and unreachable by keyboard
    <aside className={`panel glass${open ? '' : ' closed'}`} aria-label="Details" inert={!open}>
      {open && (
        <button type="button" className="back" onClick={onClose}>
          ← Galaxy <kbd>Esc</kbd>
        </button>
      )}
      {planet && <PlanetDetails planet={planet} timeRange={timeRange} onHighlightMoon={onHighlightTrack} />}
      {focus?.kind === 'core' && <CoreDetails user={user} planets={planets} tracks={tracks} timeRange={timeRange} />}
      {focus?.kind === 'constellation' && stars.length > 0 && (
        <TracksDetails stars={stars} timeRange={timeRange} selectedTrackId={focus.trackId} onHighlightTrack={onHighlightTrack} />
      )}
      {focus?.kind === 'nebula' && mood && (
        <NebulaDetails mood={mood} timeRange={timeRange} moodFilter={moodFilter} onMoodFilter={onMoodFilter} />
      )}
    </aside>
  )
}

function Portrait({ src, name, color, label }: { src: string | null | undefined; name: string; color: string; label: string }) {
  return src ? (
    <img className="portrait" src={src} alt={label} />
  ) : (
    <span className="portrait portrait-fallback" style={swatch(color)} role="img" aria-label={label}>
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
          <span className="dot" style={swatch(planet.color)} />
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
        {planet.genres.length ? planet.genres.join(' · ') : "Spotify hasn't mapped this artist's genres yet, so their planet stays uncharted silver."}
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

function CoreDetails({ user, planets, tracks, timeRange }: { user: SpotifyUser; planets: Planet[]; tracks: Track[]; timeRange: TimeRange }) {
  const name = user.display_name ?? 'You'
  const moonCount = planets.reduce((n, p) => n + p.moons.length, 0)
  const era = musicalEra(tracks)
  const runtimeMs = tracks.reduce((n, t) => n + (t.duration_ms ?? 0), 0)
  const hours = Math.floor(runtimeMs / 3_600_000)
  const minutes = Math.round((runtimeMs % 3_600_000) / 60_000)
  const maxCount = era ? Math.max(...era.decades.map((d) => d.count)) : 1

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
        {runtimeMs > 0 && (
          <div>
            <dt>Top {tracks.length} runtime</dt>
            <dd>
              {hours > 0 && (
                <>
                  {hours}
                  <small> hr </small>
                </>
              )}
              {minutes}
              <small> min</small>
            </dd>
          </div>
        )}
      </dl>

      {era && (
        <>
          <p className="section-title">Musical era</p>
          <p className="genres">
            Mostly the {era.topDecade}s · oldest: {era.oldest.name} ({era.oldest.year})
          </p>
          <ul className="era" aria-label="Top tracks by decade">
            {era.decades.map(({ decade, count }) => (
              <li key={decade}>
                <span>{decade}s</span>
                <span className="bar">
                  <i style={{ width: `${(count / maxCount) * 100}%` }} />
                </span>
                <span className="n">{count}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {user.profile_url && (
        <a className="out" href={user.profile_url} target="_blank" rel="noopener noreferrer">
          Open your Spotify profile ↗
        </a>
      )}
      <p className="key">From your Spotify profile and your top tracks{era ? "' release dates" : ''}</p>
    </>
  )
}

function TracksDetails({ stars, timeRange, selectedTrackId, onHighlightTrack }: { stars: Star[]; timeRange: TimeRange; selectedTrackId?: string; onHighlightTrack: (id: string | null) => void }) {
  const list = useRef<HTMLOListElement>(null)

  // Clicking a star opens the list at its song and lights it up for a moment
  useEffect(() => {
    if (!selectedTrackId) return
    list.current?.querySelector(`[data-track="${selectedTrackId}"]`)?.scrollIntoView({ block: 'nearest' })
    onHighlightTrack(selectedTrackId)
    const timer = setTimeout(() => onHighlightTrack(null), 1600)
    return () => clearTimeout(timer)
  }, [selectedTrackId, onHighlightTrack])

  return (
    <>
      <div className="headline">
        <p className="eyebrow">Constellation · {rangeLabel(timeRange)}</p>
        <h2>Top tracks</h2>
        <p className="chip">Your {stars.length} most-played songs, brightest first</p>
      </div>

      <ol className="tracks ranked" ref={list}>
        {stars.map(({ track, rank, color, planetId }) => {
          const content = (
            <>
              {track.album.image_url ? <img className="art" src={track.album.image_url} alt="" /> : <span className="art art-fallback" aria-hidden="true" />}
              <span className="t">
                <b>
                  <span className="rk">#{pad2(rank)}</span> {track.name}
                </b>
                <small>
                  <span className="dot" style={swatch(color)} />
                  {track.artists.join(', ')}
                  {planetId ? '' : ' · not in your top artists'}
                </small>
              </span>
              {track.duration_ms != null && <span className="d">{formatDuration(track.duration_ms)}</span>}
            </>
          )
          const props = {
            'data-track': track.id,
            className: selectedTrackId === track.id ? 'on' : undefined,
            onPointerEnter: () => onHighlightTrack(track.id),
            onPointerLeave: () => onHighlightTrack(null),
            onFocus: () => onHighlightTrack(track.id),
            onBlur: () => onHighlightTrack(null),
          }
          return (
            <li key={track.id}>
              {track.spotify_url ? (
                <a href={track.spotify_url} target="_blank" rel="noopener noreferrer" aria-label={`${rank}. ${track.name}, open in Spotify`} {...props}>
                  {content}
                </a>
              ) : (
                <div tabIndex={0} {...props} className={`row${props.className ? ' on' : ''}`}>
                  {content}
                </div>
              )}
            </li>
          )
        })}
      </ol>

      <p className="key">Brightness shows rank · color shows the artist&apos;s genre family · hover a song to light up its moon</p>
    </>
  )
}

function NebulaDetails({ mood, timeRange, moodFilter, onMoodFilter }: { mood: MoodResponse; timeRange: TimeRange; moodFilter: string | null; onMoodFilter: (mood: string | null) => void }) {
  const share = Math.round(mood.mood_distribution[mood.dominant_mood] ?? 0)
  const id = mood.visual_identity

  return (
    <>
      <div className="headline">
        <p className="eyebrow">Mood nebula · {rangeLabel(timeRange)}</p>
        <h2 style={{ color: moodColor(mood.dominant_mood) }}>{mood.dominant_mood}</h2>
        <p className="chip">{share ? `Your dominant mood, ${share}% of your genre mix` : 'Not enough genre data to read a mood yet'}</p>
      </div>

      <p className="section-title">Mood mix</p>
      <MoodRows distribution={mood.mood_distribution} moodFilter={moodFilter} onMoodFilter={onMoodFilter} />

      <p className="section-title">Top genres</p>
      {mood.top_genres.length ? (
        <ul className="chips">
          {mood.top_genres.map(({ genre, count }) => (
            <li key={genre}>
              {genre}
              <b>×{count}</b>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty">Spotify has no genres for these artists yet.</p>
      )}

      <p className="section-title">Visual identity</p>
      <div className="swatches">
        <span className="swatch"><i style={swatch(id.primary_color)} />Primary</span>
        <span className="swatch"><i style={swatch(id.secondary_color)} />Secondary</span>
        <span className="swatch"><i style={swatch(id.accent_color)} />Accent</span>
      </div>
      <p className="genres">
        Background style: {id.background_style} · glow {id.planet_glow_intensity}
      </p>

      <p className="key">
        Based on {mood.artists_with_genres} of {mood.total_artists_analyzed} artists with genre data. Each mood colors a share of the nebula equal to its share of the mix.
      </p>
    </>
  )
}
