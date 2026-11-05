import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, type Points } from 'three'

import { rng } from './layout'
import { glowTexture } from './textures'

/** Distant stars on a shell around the scene; unaffected by fog so the sky stays crisp. */
export function Stars() {
  const geometry = useMemo(() => {
    const count = 5200
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const rand = rng(0.42)
    const tints = [new Color('#ffffff'), new Color('#cfd8ff'), new Color('#ffe6c7')]
    for (let i = 0; i < count; i++) {
      const r = 320 + rand() * 520
      const theta = rand() * Math.PI * 2
      const phi = Math.acos(2 * rand() - 1)
      positions.set([r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta)], i * 3)
      const c = tints[Math.floor(rand() * 3)].clone().multiplyScalar(0.25 + rand() * 0.75)
      colors.set([c.r, c.g, c.b], i * 3)
    }
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(positions, 3))
    geo.setAttribute('color', new BufferAttribute(colors, 3))
    return geo
  }, [])

  return (
    <points geometry={geometry}>
      <pointsMaterial size={1.3} sizeAttenuation={false} vertexColors fog={false} />
    </points>
  )
}

/** A faint, slowly turning disc of dust in the galaxy's plane. */
export function Dust({ motion }: { motion: number }) {
  const ref = useRef<Points>(null)
  const geometry = useMemo(() => {
    const count = 3000
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const rand = rng(0.77)
    for (let i = 0; i < count; i++) {
      const r = 5 + Math.pow(rand(), 0.75) * 78
      const theta = rand() * Math.PI * 2
      const spread = (rand() + rand() + rand() - 1.5) * (0.6 + r / 40)
      positions.set([Math.cos(theta) * r, spread, Math.sin(theta) * r], i * 3)
      const b = 0.15 + rand() * 0.35
      colors.set([b, b, b * 1.1], i * 3)
    }
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(positions, 3))
    geo.setAttribute('color', new BufferAttribute(colors, 3))
    return geo
  }, [])

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.004 * motion
  })

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        size={0.16}
        map={glowTexture()}
        vertexColors
        transparent
        opacity={0.8}
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  )
}
