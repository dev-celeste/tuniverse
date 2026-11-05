// Scene layout, ported from docs/prototype/tuniverse-galaxy.html. The frontend owns layout in
// world units; the API's orbit_radius / planet_size (pixel-era values) aren't used here.

/** Orbit radius for an artist's rank: #1 orbits closest to the core. */
export const orbitFor = (rank: number) => 10 + (rank - 1) * 4.6

/** Planet radius for an artist's rank: higher-ranked artists are bigger. */
export const sizeFor = (rank: number) => Math.max(0.7, 2.05 - (rank - 1) * 0.11)

/** Radians per second: outer planets move slower, roughly like real orbits. */
export const orbitSpeed = (orbit: number) => 3.4 / Math.pow(orbit, 1.5)

/** Distance of a planet's nth moon from its center. */
export const moonDistance = (planetRadius: number, index: number) => planetRadius * (1.9 + index * 0.65)

/** Stable 0–1 hash of a string, so each artist gets the same tilt, start angle and texture every visit. */
export function hash(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967295
}

/** Small seeded PRNG (mulberry32) for repeatable textures and star fields. */
export function rng(seed: number): () => number {
  let a = Math.floor(seed * 4294967295) >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Each orbit is tilted a little differently so the galaxy reads as 3D, not a flat disc. */
export const orbitTilt = (id: string): [number, number] => [(hash(`${id}x`) - 0.5) * 0.36, (hash(`${id}z`) - 0.5) * 0.26]
