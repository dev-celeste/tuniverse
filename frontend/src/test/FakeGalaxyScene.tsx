import type { ComponentProps } from 'react'

import type GalaxyScene from '../galaxy/GalaxyScene'

/**
 * WebGL doesn't exist in jsdom, so tests swap the 3D scene for this: buttons for each planet,
 * the core, each star and the nebula, wired to the same onFocus, with the highlighted track,
 * mood filter and core tint exposed for assertions.
 */
export default function FakeGalaxyScene({ planets, stars, mood, onFocus, highlightTrackId, moodFilter }: ComponentProps<typeof GalaxyScene>) {
  return (
    <div data-testid="scene" data-highlight={highlightTrackId ?? ''} data-mood-filter={moodFilter ?? ''} data-tint={mood?.visual_identity.primary_color ?? ''}>
      <ul aria-label="Planets">
        {planets.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => onFocus({ kind: 'planet', id: p.id })}>
              {p.name}
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => onFocus({ kind: 'core' })}>
        Core
      </button>
      {stars.length > 0 && (
        <ul aria-label="Stars">
          {stars.map((s) => (
            <li key={s.track.id}>
              <button type="button" onClick={() => onFocus({ kind: 'constellation', trackId: s.track.id })}>
                Star {s.rank}: {s.track.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {mood && (
        <button type="button" onClick={() => onFocus({ kind: 'nebula' })}>
          Nebula
        </button>
      )}
    </div>
  )
}
