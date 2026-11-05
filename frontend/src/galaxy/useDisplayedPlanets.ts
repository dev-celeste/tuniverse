import { useEffect, useMemo, useState } from 'react'

import type { Planet } from '../api/types'

export type DisplayedPlanet = Planet & { leaving: boolean }

const LEAVE_MS = 1400

/**
 * When the time range changes, artists who drop out of the top list stay on screen briefly
 * (flagged `leaving`) so they can shrink away instead of vanishing.
 */
export function useDisplayedPlanets(planets: Planet[]): DisplayedPlanet[] {
  const [leaving, setLeaving] = useState<Planet[]>([])
  const [previous, setPrevious] = useState(planets)

  // Derive departures during render (React's recommended pattern for "previous props")
  if (previous !== planets) {
    const current = new Set(planets.map((p) => p.id))
    const departed = previous.filter((p) => !current.has(p.id))
    setPrevious(planets)
    setLeaving((old) => {
      const merged = new Map([...old, ...departed].map((p) => [p.id, p]))
      return [...merged.values()].filter((p) => !current.has(p.id))
    })
  }

  useEffect(() => {
    if (leaving.length === 0) return
    const timer = setTimeout(() => setLeaving([]), LEAVE_MS)
    return () => clearTimeout(timer)
  }, [leaving])

  return useMemo(
    () => [...planets.map((p) => ({ ...p, leaving: false })), ...leaving.map((p) => ({ ...p, leaving: true }))],
    [planets, leaving],
  )
}
