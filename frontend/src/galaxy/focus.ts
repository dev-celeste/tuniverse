/** What the camera is visiting: a planet (top artist), the core (you), or nothing (home view). */
export type Focus = { kind: 'planet'; id: string } | { kind: 'core' } | null
