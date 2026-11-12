import { type ThreeEvent, useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, BufferGeometry, Color, DoubleSide, type LineBasicMaterial, type Sprite, type SpriteMaterial, Vector3 } from 'three'

import type { AnchorStore } from './anchorStore'
import { hash } from './layout'
import { CONSTELLATION_HALF_SIZE, CONSTELLATION_PATH, constellationFrame } from './places'
import type { Star } from './stars'
import { glowTexture } from './textures'

const ease = (rate: number, dt: number) => 1 - Math.pow(rate, dt)
const WHITE = new Color('#ffffff')

type Props = {
  stars: Star[]
  motion: number
  anchors: AnchorStore
  focused: boolean
  /** Something else is focused: recede a little. */
  receded: boolean
  moodFilter: string | null
  highlightTrackId: string | null
  hoveredTrackId: string | null
  onHoverStar: (trackId: string | null) => void
  onHoverWhole: (hovered: boolean) => void
  onSelect: (trackId?: string) => void
}

/** Top tracks as a constellation: one path from #1 (biggest, brightest) to #20. */
export default function Constellation({ stars, motion, anchors, focused, receded, moodFilter, highlightTrackId, hoveredTrackId, onHoverStar, onHoverWhole, onSelect }: Props) {
  const width = useThree((s) => s.size.width)
  const frame = useMemo(() => constellationFrame(width), [width])
  const line = useRef<LineBasicMaterial>(null)
  const coreRefs = useRef<(Sprite | null)[]>([])
  const haloRefs = useRef<(Sprite | null)[]>([])
  const wholeHover = useRef(false)
  const anim = useRef({ glow: 0, stars: new Map<string, { highlight: number; dim: number; color: Color; from: string }>() })

  const points = useMemo(
    () => CONSTELLATION_PATH.slice(0, stars.length).map(([x, y], i) => new Vector3(-x, y, (hash(`star${i}`) - 0.5) * 6)),
    [stars.length],
  )
  const lineGeometry = useMemo(
    () => new BufferGeometry().setFromPoints(points.slice(1).flatMap((p, i) => [points[i], p])),
    [points],
  )

  useFrame(({ clock }, dt) => {
    const a = anim.current
    a.glow += ((wholeHover.current && !focused ? 1 : 0) - a.glow) * ease(0.003, dt)

    stars.forEach((star, i) => {
      const id = star.track.id
      let s = a.stars.get(id)
      if (!s || s.from !== star.color) {
        // Mostly white, tinted by the artist's mood color
        s = { highlight: s?.highlight ?? 0, dim: s?.dim ?? 1, color: WHITE.clone().lerp(new Color(star.color), 0.4), from: star.color }
        a.stars.set(id, s)
      }
      const lit = hoveredTrackId === id || highlightTrackId === id ? 1 : 0
      s.highlight += (lit - s.highlight) * ease(0.002, dt)
      const dimTarget = moodFilter && star.mood !== moodFilter ? 0.15 : receded ? 0.5 : 1
      s.dim += (dimTarget - s.dim) * ease(0.01, dt)

      const size = (4.6 - i * 0.13) * (1 + Math.sin(clock.elapsedTime * 1.3 + hash(id) * 6.28) * 0.07 * motion) * (1 + s.highlight * 0.6) * (1 + a.glow * 0.35)
      const core = coreRefs.current[i]
      const halo = haloRefs.current[i]
      if (core) {
        core.scale.setScalar(size)
        const m = core.material as SpriteMaterial
        m.color.copy(s.color)
        m.opacity = Math.min(1, (0.55 + (1 - i / 20) * 0.45) * s.dim + s.highlight * 0.3)
      }
      if (halo) {
        halo.scale.setScalar(size * 2.6)
        const m = halo.material as SpriteMaterial
        m.color.copy(s.color)
        m.opacity = (0.08 + s.highlight * 0.2) * s.dim
      }
    })

    if (line.current) line.current.opacity = (focused ? 0.4 : 0.28 + a.glow * 0.3) * (receded ? 0.5 : 1)
  })

  const pickWhole = !focused

  return (
    <group position={frame.center} quaternion={frame.quaternion} scale={frame.scale}>
      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial ref={line} color="#cfd3ff" transparent opacity={0.28} depthWrite={false} fog={false} />
      </lineSegments>

      {stars.map((star, i) => (
        <group key={star.track.id} position={points[i]}>
          <sprite
            ref={(s) => {
              coreRefs.current[i] = s
              anchors.setAnchor(`star:${star.track.id}`, s)
            }}
            onPointerOver={(e: ThreeEvent<PointerEvent>) => {
              e.stopPropagation()
              onHoverStar(star.track.id)
            }}
            onPointerOut={() => onHoverStar(null)}
            onClick={(e: ThreeEvent<MouseEvent>) => {
              if (e.delta > 6) return
              e.stopPropagation()
              onSelect(star.track.id)
            }}
          >
            <spriteMaterial map={glowTexture()} transparent depthWrite={false} blending={AdditiveBlending} fog={false} />
          </sprite>
          <sprite
            ref={(s) => {
              haloRefs.current[i] = s
            }}
            raycast={() => null}
          >
            <spriteMaterial map={glowTexture()} transparent opacity={0.08} depthWrite={false} blending={AdditiveBlending} fog={false} />
          </sprite>
        </group>
      ))}

      {/* Invisible hit area: hover or click anywhere over the constellation, not just on a star */}
      <mesh
        // In the close-up, let pointer events through to the individual stars
        raycast={pickWhole ? undefined : () => null}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          if (!pickWhole) return
          e.stopPropagation()
          wholeHover.current = true
          onHoverWhole(true)
        }}
        onPointerOut={() => {
          wholeHover.current = false
          onHoverWhole(false)
        }}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          if (!pickWhole || e.delta > 6) return
          e.stopPropagation()
          onSelect()
        }}
      >
        <planeGeometry args={[CONSTELLATION_HALF_SIZE.w * 2 + 6, CONSTELLATION_HALF_SIZE.h * 2 + 6]} />
        <meshBasicMaterial colorWrite={false} depthWrite={false} side={DoubleSide} />
      </mesh>

      {/* Anchor for the "Top tracks" caption */}
      <object3D position={[0, -21, 0]} ref={(o) => anchors.setAnchor('caption:constellation', o)} />
    </group>
  )
}
