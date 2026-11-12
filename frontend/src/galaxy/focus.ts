/**
 * What the camera is visiting: a planet (top artist), the core (you), the constellation
 * (top tracks), the mood nebula, or nothing (the home view).
 */
export type Focus =
  | { kind: 'planet'; id: string }
  | { kind: 'core' }
  | { kind: 'constellation'; trackId?: string }
  | { kind: 'nebula' }
  | null
