import type { CSSProperties } from 'react'

import type { MoodResponse, Planet } from '../api/types'
import { pad2 } from '../format'
import type { Focus } from '../galaxy/focus'
import type { Star } from '../galaxy/stars'

type Props = {
  planets: Planet[]
  stars: Star[]
  mood: MoodResponse | null
  focus: Focus
  onFocus: (focus: Focus) => void
}

const dot = (color: string) => ({ '--c': color }) as CSSProperties

/**
 * The galaxy as a list, for browsers that can't draw the 3D scene. Every entry opens the same
 * detail panel the scene does, so nothing is lost but the view.
 */
export default function GalaxyList({ planets, stars, mood, focus, onFocus }: Props) {
  const toggle = (next: NonNullable<Focus>, active: boolean) => onFocus(active ? null : next)
  const coreOn = focus?.kind === 'core'
  const tracksOn = focus?.kind === 'constellation'
  const nebulaOn = focus?.kind === 'nebula'

  return (
    <section className="galaxy-list glass" aria-labelledby="galaxy-list-title">
      <div>
        <p className="eyebrow">List view</p>
        <h1 id="galaxy-list-title">Your galaxy</h1>
        <p className="note">This browser can't draw the 3D galaxy, so here's everything in it as a list.</p>
      </div>

      <ul className="entries">
        <li>
          <button type="button" aria-pressed={coreOn} onClick={() => toggle({ kind: 'core' }, coreOn)}>
            <b>You</b>
            <small>Your listening profile</small>
          </button>
        </li>
        {stars.length > 0 && (
          <li>
            <button type="button" aria-pressed={tracksOn} onClick={() => toggle({ kind: 'constellation' }, tracksOn)}>
              <b>Top tracks</b>
              <small>{stars.length} stars in your constellation</small>
            </button>
          </li>
        )}
        {mood && (
          <li>
            <button type="button" aria-pressed={nebulaOn} onClick={() => toggle({ kind: 'nebula' }, nebulaOn)}>
              <b>Mood nebula</b>
              <small>Mostly {mood.dominant_mood}</small>
            </button>
          </li>
        )}
      </ul>

      <p className="section-title" id="galaxy-list-planets">
        Planets · top artists
      </p>
      <ol className="entries" aria-labelledby="galaxy-list-planets">
        {planets.map((planet) => {
          const on = focus?.kind === 'planet' && focus.id === planet.id
          return (
            <li key={planet.id}>
              <button type="button" aria-pressed={on} onClick={() => toggle({ kind: 'planet', id: planet.id }, on)}>
                <span className="rk">{pad2(planet.rank)}</span>
                <i className="dot" style={dot(planet.color)} aria-hidden="true" />
                <b>{planet.name}</b>
                <small>{planet.mood}</small>
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
