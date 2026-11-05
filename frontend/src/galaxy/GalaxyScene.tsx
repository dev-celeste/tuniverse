import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { Canvas } from '@react-three/fiber'

import type { Planet } from '../api/types'
import { Dust, Stars } from './Backdrop'
import CameraRig from './CameraRig'
import Core from './Core'
import LabelProjector from './LabelProjector'
import { useLabelStore } from './labelStore'
import PlanetBody from './PlanetBody'

const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The 3D galaxy: the listener at the core, top artists as planets, top tracks as moons.
 * Loaded lazily from the Galaxy page so three.js stays out of the start screen's bundle.
 */
export default function GalaxyScene({ planets }: { planets: Planet[] }) {
  const motion = reducedMotion ? 0.15 : 1
  const labels = useLabelStore()

  return (
    <div className="scene">
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
        <Core motion={motion} />
        {planets.map((planet) => (
          <PlanetBody key={planet.id} planet={planet} motion={motion} labels={labels} />
        ))}

        <CameraRig reducedMotion={reducedMotion} />
        <LabelProjector store={labels} />

        <EffectComposer>
          <Bloom intensity={0.7} luminanceThreshold={0.42} luminanceSmoothing={0.3} mipmapBlur />
        </EffectComposer>
      </Canvas>

      {/* Planet names, positioned every frame by LabelProjector */}
      <div className="scene-labels" aria-hidden="true">
        {planets.map((planet) => (
          <span key={planet.id} className="planet-label" ref={(el) => labels.setElement(planet.id, el)}>
            <span className="rk">{String(planet.rank).padStart(2, '0')}</span>
            {planet.name}
          </span>
        ))}
      </div>
    </div>
  )
}
