import { createContext, useContext, useEffect } from 'react'

import type { MoodResponse, Planet } from '../api/types'
import type { Focus } from './focus'
import type { Star } from './stars'

/**
 * What the shared 3D scene should show. The start screen, the demo and your galaxy are
 * pages over one persistent scene, so moving between them flies the camera instead of
 * reloading the canvas.
 */
export type SceneConfig = {
  /** Start screen (far out, not interactive) or the explorable galaxy. */
  mode: 'landing' | 'galaxy'
  planets: Planet[]
  stars: Star[]
  mood: MoodResponse | null
  focus: Focus
  onFocus: (focus: Focus) => void
  highlightTrackId: string | null
  moodFilter: string | null
}

export const SceneContext = createContext<(config: SceneConfig) => void>(() => {})

/** Called by a page to point the shared scene at its data. Pass a memoized config. */
export function useSceneConfig(config: SceneConfig | null) {
  const setConfig = useContext(SceneContext)
  useEffect(() => {
    if (config) setConfig(config)
  }, [config, setConfig])
}

/**
 * Whether the 3D scene is running. False when WebGL is missing or the scene failed to start:
 * pages then offer the list view, which reaches every panel without the canvas.
 */
export const Scene3DContext = createContext(true)

export const useScene3D = () => useContext(Scene3DContext)
