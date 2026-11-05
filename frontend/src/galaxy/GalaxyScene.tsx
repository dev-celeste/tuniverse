import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { Canvas } from '@react-three/fiber'
import { useCallback, useState } from 'react'

import type { Planet } from '../api/types'
import { pad2 } from '../format'
import { useAnchorStore } from './anchorStore'
import { Dust, Stars } from './Backdrop'
import CameraRig from './CameraRig'
import Core from './Core'
import type { Focus } from './focus'
import LabelProjector from './LabelProjector'
import { moonDistance, sizeFor } from './layout'
import PlanetBody from './PlanetBody'
import { useDisplayedPlanets } from './useDisplayedPlanets'

const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

type Props = {
  planets: Planet[]
  focus: Focus
  onFocus: (focus: Focus) => void
  /** A moon to light up, e.g. while its track is hovered in the panel. */
  highlightMoonId: string | null
}

/**
 * The 3D galaxy: the listener at the core, top artists as planets, top tracks as moons.
 * Loaded lazily from the Galaxy page so three.js stays out of the start screen's bundle.
 */
export default function GalaxyScene({ planets, focus, onFocus, highlightMoonId }: Props) {
  const motion = reducedMotion ? 0.15 : 1
  const anchors = useAnchorStore()
  const displayed = useDisplayedPlanets(planets)
  const [hovered, setHovered] = useState<string | null>(null)
  const [coreHovered, setCoreHovered] = useState(false)

  const focusedPlanetId = focus?.kind === 'planet' ? focus.id : null

  // Stand far enough back that the planet and its outermost moon fit comfortably
  const planetDistance = useCallback(
    (id: string) => {
      const planet = planets.find((p) => p.id === id)
      if (!planet) return 30
      const radius = sizeFor(planet.rank)
      const outer = planet.moons.length ? moonDistance(radius, planet.moons.length - 1) : radius
      return Math.max(radius * 7.5, outer * 3.6)
    },
    [planets],
  )

  const cursor = hovered || coreHovered ? 'pointer' : 'grab'

  return (
    <div className="scene" style={{ cursor }}>
      <Canvas
        // 1.5x is plenty for soft, glowing visuals and saves ~44% of the pixels a 2x screen would draw
        dpr={[1, 1.5]}
        flat
        camera={{ fov: 50, near: 0.1, far: 2000 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        aria-label="Your music galaxy"
      >
        <color attach="background" args={['#05050a']} />
        <fogExp2 attach="fog" args={['#05050a', 0.0042]} />
        <ambientLight color="#2a2a44" intensity={1.7} />

        <Stars />
        <Dust motion={motion} />
        <Core motion={motion} anchors={anchors} onHover={setCoreHovered} onSelect={() => onFocus({ kind: 'core' })} />
        {displayed.map((planet) => (
          <PlanetBody
            key={planet.id}
            planet={planet}
            motion={motion}
            anchors={anchors}
            hovered={hovered === planet.id}
            focused={focusedPlanetId === planet.id}
            dimmed={focus !== null && focusedPlanetId !== planet.id}
            highlightMoonId={highlightMoonId}
            onHover={setHovered}
            onSelect={(id) => onFocus({ kind: 'planet', id })}
          />
        ))}

        <CameraRig reducedMotion={reducedMotion} focus={focus} anchors={anchors} planetDistance={planetDistance} />
        <LabelProjector store={anchors} />

        <EffectComposer>
          <Bloom intensity={0.7} luminanceThreshold={0.42} luminanceSmoothing={0.3} mipmapBlur />
        </EffectComposer>
      </Canvas>

      {/* Labels, positioned every frame by LabelProjector. Planet names are buttons, so the
          galaxy can also be explored by keyboard. */}
      <div className="scene-labels">
        <span
          className={`planet-label core-label${coreHovered ? ' show' : ''}`}
          ref={(el) => anchors.setElement('core', el)}
          aria-hidden="true"
        >
          You
        </span>
        {displayed.map((planet) => {
          const state = focusedPlanetId === planet.id ? ' focused' : focus ? ' dimmed' : ''
          return (
            <button
              key={planet.id}
              type="button"
              className={`planet-label${state}${hovered === planet.id ? ' hovered' : ''}`}
              ref={(el) => anchors.setElement(planet.id, el)}
              tabIndex={planet.leaving ? -1 : 0}
              aria-label={`${planet.name}, rank ${planet.rank}. Visit planet`}
              onClick={() => onFocus({ kind: 'planet', id: planet.id })}
              onPointerEnter={() => setHovered(planet.id)}
              onPointerLeave={() => setHovered(null)}
            >
              <span className="rk">{pad2(planet.rank)}</span>
              {planet.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
