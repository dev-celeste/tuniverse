import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { AdditiveBlending, type Sprite } from 'three'

import { glowTexture } from './textures'

// Warm white for now; step 3 tints the halo with the dominant mood from /mood
const HALO_COLOR = '#f3d9c9'

/** The glowing core at the center of the galaxy: the listener. */
export default function Core({ motion }: { motion: number }) {
  const halo = useRef<Sprite>(null)

  useFrame(({ clock }) => {
    if (halo.current) halo.current.scale.setScalar(20 + Math.sin(clock.elapsedTime * 0.8) * 0.6 * motion)
  })

  return (
    <group>
      {/* Legacy-style light (no distance falloff) so outer planets are lit like the inner ones */}
      <pointLight color="#fff1dd" intensity={3.6} decay={0} />
      <mesh>
        <sphereGeometry args={[2.3, 48, 48]} />
        <meshBasicMaterial color="#fff4e6" />
      </mesh>
      <sprite ref={halo} scale={20}>
        <spriteMaterial map={glowTexture()} color={HALO_COLOR} transparent opacity={0.6} depthWrite={false} blending={AdditiveBlending} />
      </sprite>
      <sprite scale={56}>
        <spriteMaterial map={glowTexture()} color={HALO_COLOR} transparent opacity={0.14} depthWrite={false} blending={AdditiveBlending} />
      </sprite>
    </group>
  )
}
