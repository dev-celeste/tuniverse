import { type ThreeEvent, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, Color, type Sprite, type SpriteMaterial } from 'three'

import type { AnchorStore } from './anchorStore'
import { glowTexture } from './textures'

// Warm white until the mood loads, then the dominant mood's color
const NEUTRAL = new Color('#f3d9c9')
const WHITE = new Color('#ffffff')

type Props = {
  motion: number
  /** Dominant mood's primary color, from /mood. */
  tint: string | null
  anchors: AnchorStore
  onHover: (hovered: boolean) => void
  onSelect: () => void
}

/** The glowing core at the center of the galaxy: the listener. Looks the same until clicked. */
export default function Core({ motion, tint, anchors, onHover, onSelect }: Props) {
  const halo = useRef<Sprite>(null)
  const corona = useRef<Sprite>(null)
  const color = useRef(NEUTRAL.clone())
  const target = useMemo(() => (tint ? new Color(tint) : NEUTRAL), [tint])

  useFrame(({ clock }, dt) => {
    // Drift toward the mood color when it arrives or the time range changes
    color.current.lerp(target, 1 - Math.pow(0.2, dt))
    if (halo.current) {
      halo.current.scale.setScalar(20 + Math.sin(clock.elapsedTime * 0.8) * 0.6 * motion)
      ;(halo.current.material as SpriteMaterial).color.copy(color.current).lerp(WHITE, 0.55)
    }
    if (corona.current) (corona.current.material as SpriteMaterial).color.copy(color.current)
  })

  return (
    <group>
      {/* Legacy-style light (no distance falloff) so outer planets are lit like the inner ones */}
      <pointLight color="#fff1dd" intensity={3.6} decay={0} />
      <mesh
        ref={(m) => anchors.setAnchor('core', m)}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          onHover(true)
        }}
        onPointerOut={() => onHover(false)}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          if (e.delta > 6) return
          e.stopPropagation()
          onSelect()
        }}
      >
        <sphereGeometry args={[2.3, 48, 48]} />
        <meshBasicMaterial color="#fff4e6" />
      </mesh>
      <sprite ref={halo} scale={20}>
        <spriteMaterial map={glowTexture()} transparent opacity={0.5} depthWrite={false} blending={AdditiveBlending} />
      </sprite>
      <sprite ref={corona} scale={56}>
        <spriteMaterial map={glowTexture()} transparent opacity={0.07} depthWrite={false} blending={AdditiveBlending} />
      </sprite>
    </group>
  )
}
