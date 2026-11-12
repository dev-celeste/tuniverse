import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { Canvas } from '@react-three/fiber'
import { useCallback, useState } from 'react'

import type { MoodResponse, Planet } from '../api/types'
import { pad2 } from '../format'
import { useAnchorStore } from './anchorStore'
import { Dust, Stars } from './Backdrop'
import CameraRig from './CameraRig'
import Constellation from './Constellation'
import Core from './Core'
import type { Focus } from './focus'
import LabelProjector from './LabelProjector'
import { moonDistance, sizeFor } from './layout'
import Nebula from './Nebula'
import PlanetBody from './PlanetBody'
import type { Star } from './stars'
import { useDisplayedPlanets } from './useDisplayedPlanets'

const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

type Props = {
  planets: Planet[]
  /** Top tracks for the constellation; empty while loading or if unavailable. */
  stars: Star[]
  mood: MoodResponse | null
  focus: Focus
  onFocus: (focus: Focus) => void
  /** A track to light up (its star, its moon and its planet), e.g. while hovered in a panel. */
  highlightTrackId: string | null
  /** Only this mood's planets, stars and nebula wisps stay lit. */
  moodFilter: string | null
}

/**
 * The 3D galaxy: the listener at the core, top artists as planets, top tracks as moons and as
 * a constellation, and the mood mix as a nebula. Loaded lazily from the Galaxy page so
 * three.js stays out of the start screen's bundle.
 */
export default function GalaxyScene({ planets, stars, mood, focus, onFocus, highlightTrackId, moodFilter }: Props) {
  const motion = reducedMotion ? 0.15 : 1
  const anchors = useAnchorStore()
  const displayed = useDisplayedPlanets(planets)
  const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null)
  const [coreHovered, setCoreHovered] = useState(false)
  const [hoveredStar, setHoveredStar] = useState<string | null>(null)
  const [skyHovered, setSkyHovered] = useState(false)
  const [nebulaHovered, setNebulaHovered] = useState(false)

  const focusedPlanetId = focus?.kind === 'planet' ? focus.id : null
  const skyFocus = focus?.kind === 'constellation'
  const nebulaFocus = focus?.kind === 'nebula'
  // A hovered or highlighted track lights up its planet too
  const litTrack = highlightTrackId ?? hoveredStar
  const linkedPlanetId = stars.find((s) => s.track.id === litTrack)?.planetId ?? null

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

  const pointer = hoveredPlanet || coreHovered || hoveredStar || (skyHovered && !skyFocus) || (nebulaHovered && !nebulaFocus)

  const captionState = (own: boolean, hovered: boolean) =>
    own ? ' hidden' : focus ? ' dimmed' : hovered ? ' hovered' : ''

  return (
    <div className="scene" style={{ cursor: pointer ? 'pointer' : 'grab' }}>
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
        <Core
          motion={motion}
          tint={mood?.visual_identity.primary_color ?? null}
          anchors={anchors}
          onHover={setCoreHovered}
          onSelect={() => onFocus({ kind: 'core' })}
        />
        {displayed.map((planet) => {
          const moodMatch = moodFilter !== null && planet.mood === moodFilter
          return (
            <PlanetBody
              key={planet.id}
              planet={planet}
              motion={motion}
              anchors={anchors}
              hovered={hoveredPlanet === planet.id || linkedPlanetId === planet.id || moodMatch}
              focused={focusedPlanetId === planet.id}
              dimmed={(focus !== null && focusedPlanetId !== planet.id) || (moodFilter !== null && !moodMatch)}
              highlightMoonId={litTrack}
              onHover={setHoveredPlanet}
              onSelect={(id) => onFocus({ kind: 'planet', id })}
            />
          )
        })}

        {stars.length > 0 && (
          <Constellation
            stars={stars}
            motion={motion}
            anchors={anchors}
            focused={skyFocus}
            receded={focus !== null && !skyFocus}
            moodFilter={moodFilter}
            highlightTrackId={highlightTrackId}
            hoveredTrackId={hoveredStar}
            onHoverStar={setHoveredStar}
            onHoverWhole={setSkyHovered}
            onSelect={(trackId) => onFocus({ kind: 'constellation', trackId })}
          />
        )}

        {mood && (
          <Nebula
            distribution={mood.mood_distribution}
            motion={motion}
            anchors={anchors}
            focused={nebulaFocus}
            receded={focus !== null && !nebulaFocus}
            moodFilter={moodFilter}
            onHover={setNebulaHovered}
            onSelect={() => onFocus({ kind: 'nebula' })}
          />
        )}

        <CameraRig reducedMotion={reducedMotion} focus={focus} anchors={anchors} planetDistance={planetDistance} />
        <LabelProjector store={anchors} />

        <EffectComposer>
          <Bloom intensity={0.7} luminanceThreshold={0.42} luminanceSmoothing={0.3} mipmapBlur />
        </EffectComposer>
      </Canvas>

      {/* Labels, positioned every frame by LabelProjector. Planet names and the captions are
          buttons, so the galaxy can also be explored by keyboard. */}
      <div className="scene-labels">
        <span className={`planet-label core-label${coreHovered ? ' show' : ''}`} ref={(el) => anchors.setElement('core', el)} aria-hidden="true">
          You
        </span>

        {displayed.map((planet) => {
          const state =
            focusedPlanetId === planet.id
              ? ' focused'
              : skyFocus || nebulaFocus
                ? ' faint'
                : focus || (moodFilter && planet.mood !== moodFilter)
                  ? ' dimmed'
                  : ''
          return (
            <button
              key={planet.id}
              type="button"
              className={`planet-label${state}${hoveredPlanet === planet.id ? ' hovered' : ''}`}
              ref={(el) => anchors.setElement(planet.id, el)}
              tabIndex={planet.leaving ? -1 : 0}
              aria-label={`${planet.name}, rank ${planet.rank}. Visit planet`}
              onClick={() => onFocus({ kind: 'planet', id: planet.id })}
              onPointerEnter={() => setHoveredPlanet(planet.id)}
              onPointerLeave={() => setHoveredPlanet(null)}
            >
              <span className="rk">{pad2(planet.rank)}</span>
              {planet.name}
            </button>
          )
        })}

        {stars.map((star) => {
          const lit = hoveredStar === star.track.id || highlightTrackId === star.track.id
          // Close-up: every star shows its rank, titles on hover. Home view: only the hovered star.
          const show = skyFocus || lit ? ' show' : ''
          return (
            <span
              key={star.track.id}
              className={`star-label${show}${lit ? '' : ' compact'}`}
              ref={(el) => anchors.setElement(`star:${star.track.id}`, el)}
              aria-hidden="true"
            >
              <span className="rk">#{star.rank}</span>
              <span className="tt">{star.track.name}</span>
            </span>
          )
        })}

        {stars.length > 0 && (
          <button
            type="button"
            className={`caption-label${captionState(skyFocus, skyHovered)}`}
            ref={(el) => anchors.setElement('caption:constellation', el)}
            tabIndex={skyFocus ? -1 : 0}
            onClick={() => onFocus({ kind: 'constellation' })}
          >
            <span className="rk">{stars.length}</span>Top tracks
          </button>
        )}
        {mood && (
          <button
            type="button"
            className={`caption-label${captionState(nebulaFocus, nebulaHovered)}`}
            ref={(el) => anchors.setElement('caption:nebula', el)}
            tabIndex={nebulaFocus ? -1 : 0}
            onClick={() => onFocus({ kind: 'nebula' })}
          >
            Mood nebula
          </button>
        )}
      </div>
    </div>
  )
}
