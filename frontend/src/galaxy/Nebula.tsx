import { type ThreeEvent, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, Color, type Sprite, type SpriteMaterial, Vector3 } from 'three'

import { moodColor, moodRows } from '../moods'
import type { AnchorStore } from './anchorStore'
import { rng } from './layout'
import { NEBULA_CENTER } from './places'
import { cloudTexture } from './textures'

const ease = (rate: number, dt: number) => 1 - Math.pow(rate, dt)
const PUFF_COUNT = 32

type Puff = { position: Vector3; scale: number; rotation: number; spin: number; base: number; pick: number; seed: number }

type Props = {
  distribution: Record<string, number>
  motion: number
  anchors: AnchorStore
  focused: boolean
  receded: boolean
  moodFilter: string | null
  onHover: (hovered: boolean) => void
  onSelect: () => void
}

/**
 * Your mood mix as a nebula: soft wisps where each mood colors a share of the cloud equal to
 * its share of the mix. Each mood's wisps sit together in their own lobe, so the colors stay
 * distinct instead of adding up to white.
 */
export default function Nebula({ distribution, motion, anchors, focused, receded, moodFilter, onHover, onSelect }: Props) {
  const sprites = useRef<(Sprite | null)[]>([])
  const hovered = useRef(false)
  const anim = useRef({ glow: 0, dims: Array<number>(PUFF_COUNT).fill(1), colors: Array.from({ length: PUFF_COUNT }, () => new Color(moodColor('Other'))) })

  const puffs = useMemo<Puff[]>(() => {
    const rand = rng(0.909)
    return Array.from({ length: PUFF_COUNT }, (_, i) => {
      const r = 8 + Math.pow(rand(), 0.6) * 50
      const theta = rand() * Math.PI * 2
      const phi = Math.acos(2 * rand() - 1)
      return {
        position: new Vector3(r * Math.sin(phi) * Math.cos(theta) * 1.35, r * Math.cos(phi) * 0.6, r * Math.sin(phi) * Math.sin(theta) * 0.8),
        scale: 38 + rand() * 52,
        rotation: rand() * Math.PI * 2,
        spin: (rand() - 0.5) * 0.03,
        base: 0.5 + rand() * 0.5,
        // A wisp's mood follows its angle around the center, which groups each mood into a lobe
        pick: Math.min(0.999, Math.max(0, theta / (Math.PI * 2) + (rand() - 0.5) * 0.06)),
        seed: [0.11, 0.52, 0.87][i % 3],
      }
    })
  }, [])

  // Walk the cumulative distribution so each mood gets its share of wisps
  const puffMoods = useMemo(() => {
    const rows = moodRows(distribution)
    return puffs.map((puff) => {
      let acc = 0
      for (const [mood, pct] of rows) {
        acc += pct / 100
        if (puff.pick <= acc) return mood
      }
      return 'Other'
    })
  }, [distribution, puffs])

  const targets = useMemo(() => puffMoods.map((mood) => new Color(moodColor(mood))), [puffMoods])

  useFrame((_, dt) => {
    const a = anim.current
    a.glow += ((hovered.current || focused ? 1 : 0) - a.glow) * ease(0.004, dt)
    puffs.forEach((puff, i) => {
      const sprite = sprites.current[i]
      if (!sprite) return
      a.colors[i].lerp(targets[i], ease(0.08, dt))
      const dimTarget = moodFilter ? (puffMoods[i] === moodFilter ? 1.7 : 0.18) : receded ? 0.55 : 1
      a.dims[i] += (dimTarget - a.dims[i]) * ease(0.02, dt)
      const m = sprite.material as SpriteMaterial
      m.color.copy(a.colors[i])
      m.opacity = 0.09 * puff.base * a.dims[i] * (1 + a.glow * 0.5)
      m.rotation += puff.spin * dt * motion
    })
  })

  return (
    <group position={NEBULA_CENTER}>
      {puffs.map((puff, i) => (
        <sprite
          key={i}
          ref={(s) => {
            sprites.current[i] = s
          }}
          position={puff.position}
          scale={puff.scale}
          raycast={() => null}
        >
          <spriteMaterial map={cloudTexture(puff.seed)} rotation={puff.rotation} transparent opacity={0} depthWrite={false} blending={AdditiveBlending} fog={false} />
        </sprite>
      ))}

      {/* Invisible hit area covering the cloud */}
      <mesh
        raycast={focused ? () => null : undefined}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          hovered.current = true
          onHover(true)
        }}
        onPointerOut={() => {
          hovered.current = false
          onHover(false)
        }}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          if (e.delta > 6) return
          e.stopPropagation()
          onSelect()
        }}
      >
        <sphereGeometry args={[58, 16, 12]} />
        <meshBasicMaterial colorWrite={false} depthWrite={false} />
      </mesh>

      <object3D position={[0, -44, 0]} ref={(o) => anchors.setAnchor('caption:nebula', o)} />
    </group>
  )
}
