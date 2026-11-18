import { Suspense, lazy, useState } from 'react'
import { Outlet } from 'react-router'

import { SceneContext, type SceneConfig } from '../galaxy/sceneContext'
import Starfield from './Starfield'

// three.js is large: the scene loads after the page, with a 2D starfield in the meantime
const GalaxyScene = lazy(() => import('../galaxy/GalaxyScene'))

/**
 * Layout for the start screen, the demo and your galaxy: one 3D scene that stays mounted
 * while the page on top changes. Pages pick what it shows with useSceneConfig; until one
 * has data, the previous scene stays (so diving in never flashes to black).
 */
export default function Universe() {
  const [config, setConfig] = useState<SceneConfig | null>(null)

  return (
    <div className={`universe ${config?.mode ?? 'landing'}`}>
      {config ? (
        <Suspense fallback={<Starfield />}>
          <GalaxyScene {...config} />
        </Suspense>
      ) : (
        <Starfield />
      )}
      <SceneContext.Provider value={setConfig}>
        <Outlet />
      </SceneContext.Provider>
    </div>
  )
}
