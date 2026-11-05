import { type ThreeEvent, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  type Group,
  type LineBasicMaterial,
  type LineLoop,
  type Mesh,
  type MeshStandardMaterial,
  type Sprite,
  type SpriteMaterial,
  Vector3,
} from 'three'

import type { AnchorStore } from './anchorStore'
import { hash, moonDistance, orbitFor, orbitSpeed, orbitTilt, sizeFor } from './layout'
import { bandTexture, glowTexture } from './textures'
import type { DisplayedPlanet } from './useDisplayedPlanets'

// Unit circle shared by every orbit line; each orbit scales it to its radius
const CIRCLE = new BufferGeometry().setFromPoints(
  Array.from({ length: 161 }, (_, i) => {
    const a = (i / 160) * Math.PI * 2
    return new Vector3(Math.cos(a), 0, Math.sin(a))
  }),
)

// Frame-rate independent easing: fraction of the remaining distance to cover this frame
const ease = (rate: number, dt: number) => 1 - Math.pow(rate, dt)

type Props = {
  planet: DisplayedPlanet
  motion: number
  anchors: AnchorStore
  hovered: boolean
  focused: boolean
  dimmed: boolean
  highlightMoonId: string | null
  onHover: (id: string | null) => void
  onSelect: (id: string) => void
}

/** One top artist: a banded planet on a tilted orbit, with its top tracks as moons. */
export default function PlanetBody({ planet, motion, anchors, hovered, focused, dimmed, highlightMoonId, onHover, onSelect }: Props) {
  const holder = useRef<Group>(null)
  const body = useRef<Mesh>(null)
  const surface = useRef<MeshStandardMaterial>(null)
  const halo = useRef<Sprite>(null)
  const orbitLoop = useRef<LineLoop>(null)
  const moonRefs = useRef<(Mesh | null)[]>([])

  const color = useMemo(() => new Color(planet.color), [planet.color])
  const baseSurface = useMemo(() => new Color(planet.color).multiplyScalar(0.85), [planet.color])
  const texture = useMemo(() => bandTexture(hash(planet.id)), [planet.id])
  const tilt = useMemo(() => orbitTilt(planet.id), [planet.id])

  // Animation state lives in refs so orbiting never re-renders React
  const anim = useRef({
    angle: hash(`${planet.id}a`) * Math.PI * 2,
    orbit: orbitFor(planet.rank),
    radius: 0, // grows in from nothing
    light: 1,
    moonAngles: new Map<string, number>(),
    moonGlow: new Map<string, number>(),
  })

  // Targets come from props; useFrame eases toward them (rank changes glide, departures shrink away)
  const targetOrbit = orbitFor(planet.rank)
  const targetRadius = planet.leaving ? 0 : sizeFor(planet.rank)
  const targetLight = (dimmed ? 0.45 : 1) * (hovered || focused ? 1.6 : 1)
  const emissiveBase = 0.1 + planet.glow_intensity * 0.22

  useFrame((_, dt) => {
    const a = anim.current
    a.orbit += (targetOrbit - a.orbit) * ease(0.15, dt)
    a.radius += (targetRadius - a.radius) * ease(0.08, dt)
    a.light += (targetLight - a.light) * ease(0.005, dt)
    a.angle += dt * motion * orbitSpeed(a.orbit)
    const r = Math.max(a.radius, 0.0001)

    holder.current?.position.set(Math.cos(a.angle) * a.orbit, 0, Math.sin(a.angle) * a.orbit)
    if (body.current) {
      body.current.scale.setScalar(r)
      body.current.rotation.y += dt * 0.12 * motion
    }
    if (surface.current) {
      surface.current.emissiveIntensity = emissiveBase * a.light
      surface.current.color.copy(baseSurface).multiplyScalar(dimmed ? 0.55 : 1)
    }
    if (halo.current) {
      halo.current.scale.setScalar(r * (hovered || focused ? 5.6 : 4.4))
      ;(halo.current.material as SpriteMaterial).opacity = (0.16 + planet.glow_intensity * 0.3) * 0.55 * a.light
    }
    if (orbitLoop.current) {
      orbitLoop.current.scale.setScalar(a.orbit)
      ;(orbitLoop.current.material as LineBasicMaterial).opacity = (hovered || focused ? 0.16 : 0.035) * (dimmed ? 0.5 : 1)
    }

    planet.moons.forEach((moon, i) => {
      const mesh = moonRefs.current[i]
      if (!mesh) return
      const speed = (0.5 + hash(`${moon.id}s`) * 0.4) / (i + 1)
      const angle = (a.moonAngles.get(moon.id) ?? hash(moon.id) * Math.PI * 2) + dt * motion * speed
      a.moonAngles.set(moon.id, angle)
      const glow = a.moonGlow.get(moon.id) ?? 0
      const nextGlow = glow + ((highlightMoonId === moon.id ? 1 : 0) - glow) * ease(0.002, dt)
      a.moonGlow.set(moon.id, nextGlow)
      const dist = moonDistance(r, i)
      mesh.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist)
      mesh.scale.setScalar(Math.max(r * (0.17 + nextGlow * 0.1), 0.0001))
      ;(mesh.material as MeshStandardMaterial).emissiveIntensity = (0.28 + nextGlow * 0.9) * (dimmed ? 0.5 : 1)
    })
  })

  const handlers = planet.leaving
    ? {}
    : {
        onPointerOver: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          onHover(planet.id)
        },
        onPointerOut: () => onHover(null),
        onClick: (e: ThreeEvent<MouseEvent>) => {
          // Ignore the click at the end of a drag
          if (e.delta > 6) return
          e.stopPropagation()
          onSelect(planet.id)
        },
      }

  return (
    <group rotation={[tilt[0], 0, tilt[1]]}>
      <lineLoop ref={orbitLoop} geometry={CIRCLE}>
        <lineBasicMaterial color={color} transparent opacity={0.035} depthWrite={false} />
      </lineLoop>

      <group ref={holder}>
        <mesh
          ref={(m) => {
            body.current = m
            anchors.setAnchor(planet.id, m)
          }}
          rotation={[0, 0, (hash(`${planet.id}t`) - 0.5) * 0.7]}
          {...handlers}
        >
          <sphereGeometry args={[1, 48, 32]} />
          <meshStandardMaterial
            ref={surface}
            color={baseSurface}
            map={texture}
            emissive={color}
            emissiveMap={texture}
            emissiveIntensity={emissiveBase}
            roughness={0.82}
            metalness={0}
          />
        </mesh>

        <sprite ref={halo}>
          <spriteMaterial map={glowTexture()} color={color} transparent opacity={0} depthWrite={false} blending={AdditiveBlending} />
        </sprite>

        {planet.moons.map((moon, i) => (
          <mesh
            key={moon.id}
            ref={(m) => {
              moonRefs.current[i] = m
            }}
          >
            <sphereGeometry args={[1, 24, 16]} />
            <meshStandardMaterial color="#dedbe9" emissive={color} emissiveIntensity={0.28} roughness={0.9} />
          </mesh>
        ))}
      </group>
    </group>
  )
}
