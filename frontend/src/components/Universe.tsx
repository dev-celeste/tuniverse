import { Suspense, lazy, useState } from 'react'
import { Outlet } from 'react-router'

import { Scene3DContext, SceneContext, type SceneConfig } from '../galaxy/sceneContext'
import { hasWebGL } from '../galaxy/webgl'
import SceneBoundary from './SceneBoundary'
import Starfield from './Starfield'

// three.js is large: the scene loads after the page, with a 2D starfield in the meantime
const GalaxyScene = lazy(() => import('../galaxy/GalaxyScene'))

/**
 * Layout for the start screen, the demo and your galaxy: one 3D scene that stays mounted
 * while the page on top changes. Pages pick what it shows with useSceneConfig; until one
 * has data, the previous scene stays (so diving in never flashes to black). Without WebGL,
 * the starfield stays and pages switch to their list view.
 */
export default function Universe() {
  const [config, setConfig] = useState<SceneConfig | null>(null)
  const [webgl] = useState(hasWebGL)
  const [sceneFailed, setSceneFailed] = useState(false)
  const scene3d = webgl && !sceneFailed

  return (
    <div className={`universe ${config?.mode ?? 'landing'}`}>
      {/* The page comes first so keyboard users reach its header before the galaxy's labels */}
      <Scene3DContext.Provider value={scene3d}>
        <SceneContext.Provider value={setConfig}>
          <Outlet />
        </SceneContext.Provider>
      </Scene3DContext.Provider>
      {config && scene3d ? (
        <SceneBoundary fallback={<Starfield />} onError={() => setSceneFailed(true)}>
          <Suspense fallback={<Starfield />}>
            <GalaxyScene {...config} />
          </Suspense>
        </SceneBoundary>
      ) : (
        <Starfield />
      )}
    </div>
  )
}
