import { useFrame, useThree } from '@react-three/fiber'
import { type Mesh, Vector3 } from 'three'

import type { AnchorStore } from './anchorStore'

const world = new Vector3()
const edge = new Vector3()

/**
 * Lives inside the Canvas: projects every anchor to the screen and moves its label just below it.
 */
export default function LabelProjector({ store }: { store: AnchorStore }) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)

  useFrame(() => {
    for (const { anchor, element } of store.all()) {
      if (!anchor || !element) continue
      // Rendered radius = the geometry's own radius × the mesh's (animated) scale
      const geometry = (anchor as Mesh).geometry
      if (geometry && !geometry.boundingSphere) geometry.computeBoundingSphere()
      const radius = anchor.scale.x * (geometry?.boundingSphere?.radius ?? 1)
      anchor.getWorldPosition(world)
      edge.copy(world).addScaledVector(camera.up, radius)
      world.project(camera)
      edge.project(camera)
      // Behind the camera, or still too small while fading in
      if (world.z > 1 || radius < 0.05) {
        element.style.visibility = 'hidden'
        continue
      }
      const x = (world.x * 0.5 + 0.5) * size.width
      const y = (-world.y * 0.5 + 0.5) * size.height
      const pixelRadius = Math.abs((-edge.y * 0.5 + 0.5) * size.height - y)
      element.style.visibility = 'visible'
      element.style.transform = `translate(${x.toFixed(1)}px, ${(y + pixelRadius + 4).toFixed(1)}px) translateX(-50%)`
    }
  })

  return null
}
