import type { ComponentProps } from 'react'

import type GalaxyScene from '../galaxy/GalaxyScene'

/**
 * WebGL doesn't exist in jsdom, so tests swap the 3D scene for this: one button per planet
 * plus the core, wired to the same onFocus, and the highlighted moon exposed for assertions.
 */
export default function FakeGalaxyScene({ planets, onFocus, highlightMoonId }: ComponentProps<typeof GalaxyScene>) {
  return (
    <div data-testid="scene" data-highlight={highlightMoonId ?? ''}>
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
    </div>
  )
}
