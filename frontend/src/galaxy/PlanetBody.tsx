import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  type Group,
  type Mesh,
  type Sprite,
  Vector3,
} from 'three'

import type { Planet } from '../api/types'
import { hash, moonDistance, orbitFor, orbitSpeed, orbitTilt, sizeFor } from './layout'
import type { LabelStore } from './labelStore'
import { bandTexture, glowTexture } from './textures'

// Unit circle shared by every orbit line; each orbit scales it to its radius
const CIRCLE = new BufferGeometry().setFromPoints(
  Array.from({ length: 161 }, (_, i) => {
    const a = (i / 160) * Math.PI * 2
    return new Vector3(Math.cos(a), 0, Math.sin(a))
  }),
)

/** One top artist: a banded planet on a tilted orbit, with its top tracks as moons. */
export default function PlanetBody({ planet, motion, labels }: { planet: Planet; motion: number; labels: LabelStore }) {
  const holder = useRef<Group>(null)
  const body = useRef<Mesh>(null)
  const halo = useRef<Sprite>(null)
  const moonRefs = useRef<(Mesh | null)[]>([])

  const orbit = orbitFor(planet.rank)
  const radius = sizeFor(planet.rank)
  const color = useMemo(() => new Color(planet.color), [planet.color])
  // Surface slightly darker than the glow color, so the lit side doesn't wash out
  const surface = useMemo(() => new Color(planet.color).multiplyScalar(0.85), [planet.color])
  const texture = useMemo(() => bandTexture(hash(planet.id)), [planet.id])
  const tilt = useMemo(() => orbitTilt(planet.id), [planet.id])

  // Animation state lives in refs so orbiting never re-renders React
  const state = useRef({
    angle: hash(`${planet.id}a`) * Math.PI * 2,
    grow: 0, // 0 → 1 as the planet fades in
    moons: planet.moons.map((moon, i) => ({
      angle: hash(moon.id) * Math.PI * 2,
      speed: (0.5 + hash(`${moon.id}s`) * 0.4) / (i + 1),
    })),
  })

  useFrame((_, dt) => {
    const s = state.current
    s.angle += dt * motion * orbitSpeed(orbit)
    s.grow = Math.min(1, s.grow + dt * 0.8)
    const r = radius * (1 - Math.pow(1 - s.grow, 3))

    holder.current?.position.set(Math.cos(s.angle) * orbit, 0, Math.sin(s.angle) * orbit)
    if (body.current) {
      body.current.scale.setScalar(Math.max(r, 0.0001))
      body.current.rotation.y += dt * 0.12 * motion
    }
    if (halo.current) halo.current.scale.setScalar(r * 4.4)

    s.moons.forEach((m, i) => {
      m.angle += dt * motion * m.speed
      const dist = moonDistance(r, i)
      const mesh = moonRefs.current[i]
      if (!mesh) return
      mesh.position.set(Math.cos(m.angle) * dist, 0, Math.sin(m.angle) * dist)
      mesh.scale.setScalar(Math.max(r * 0.17, 0.0001))
    })
  })

  const emissive = 0.1 + planet.glow_intensity * 0.22

  return (
    <group rotation={[tilt[0], 0, tilt[1]]}>
      <lineLoop geometry={CIRCLE} scale={orbit}>
        <lineBasicMaterial color={color} transparent opacity={0.035} depthWrite={false} />
      </lineLoop>

      <group ref={holder}>
        <mesh
          ref={(m) => {
            body.current = m
            labels.setAnchor(planet.id, m)
          }}
          rotation={[0, 0, (hash(`${planet.id}t`) - 0.5) * 0.7]}
        >
          <sphereGeometry args={[1, 48, 32]} />
          <meshStandardMaterial
            color={surface}
            map={texture}
            emissive={color}
            emissiveMap={texture}
            emissiveIntensity={emissive}
            roughness={0.82}
            metalness={0}
          />
        </mesh>

        <sprite ref={halo}>
          <spriteMaterial
            map={glowTexture()}
            color={color}
            transparent
            opacity={(0.16 + planet.glow_intensity * 0.3) * 0.55}
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </sprite>

        {planet.moons.map((moon, i) => (
          <mesh key={moon.id} ref={(m) => { moonRefs.current[i] = m }}>
            <sphereGeometry args={[1, 24, 16]} />
            <meshStandardMaterial color="#dedbe9" emissive={color} emissiveIntensity={0.28} roughness={0.9} />
          </mesh>
        ))}
      </group>
    </group>
  )
}
