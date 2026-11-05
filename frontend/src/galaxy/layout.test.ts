import { describe, expect, it } from 'vitest'

import { hash, moonDistance, orbitFor, orbitSpeed, orbitTilt, rng, sizeFor } from './layout'

describe('galaxy layout', () => {
  it('puts higher-ranked artists closer to the core and bigger', () => {
    expect(orbitFor(1)).toBeLessThan(orbitFor(2))
    expect(sizeFor(1)).toBeGreaterThan(sizeFor(10))
  })

  it('never shrinks a planet below a visible size, even far down the list', () => {
    expect(sizeFor(50)).toBe(0.7)
  })

  it('moves outer planets slower', () => {
    expect(orbitSpeed(orbitFor(10))).toBeLessThan(orbitSpeed(orbitFor(1)))
  })

  it('spaces moons outward from the planet', () => {
    expect(moonDistance(2, 0)).toBeGreaterThan(2)
    expect(moonDistance(2, 1)).toBeGreaterThan(moonDistance(2, 0))
  })

  it('gives each artist the same tilt and seed on every visit', () => {
    expect(hash('artist-1')).toBe(hash('artist-1'))
    expect(hash('artist-1')).not.toBe(hash('artist-2'))
    expect(orbitTilt('artist-1')).toEqual(orbitTilt('artist-1'))
    expect(hash('x')).toBeGreaterThanOrEqual(0)
    expect(hash('x')).toBeLessThanOrEqual(1)
  })

  it('makes repeatable random sequences', () => {
    const a = rng(0.5)
    const b = rng(0.5)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
})
