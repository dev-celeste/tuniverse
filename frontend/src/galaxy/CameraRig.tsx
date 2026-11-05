import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { type ComponentRef, useEffect, useRef } from 'react'
import { Spherical, Vector3 } from 'three'

// Home view looks slightly above the core, leaving sky room for the constellation (step 3)
export const HOME_TARGET = new Vector3(0, 7, 0)
const HOME_DIR = new Vector3(0, 0.42, 1).normalize()
const INTRO_DISTANCE = 320

const homeDistance = () => (window.innerWidth < 720 ? 96 : 70)

/** Orbit controls plus the intro fly-in and a gentle back-and-forth sway while idle. */
export default function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  const camera = useThree((s) => s.camera)
  const flying = useRef(!reducedMotion)

  // Start far out (or already home, for reduced motion) looking at the galaxy
  useEffect(() => {
    camera.position.copy(HOME_TARGET).addScaledVector(HOME_DIR, reducedMotion ? homeDistance() : INTRO_DISTANCE)
    camera.lookAt(HOME_TARGET)
  }, [camera, reducedMotion])

  const sph = useRef(new Spherical())
  const offset = useRef(new Vector3())

  useFrame(({ clock }, dt) => {
    const c = controls.current
    if (!c) return

    if (flying.current) {
      offset.current.subVectors(camera.position, c.target)
      sph.current.setFromVector3(offset.current)
      const want = homeDistance()
      sph.current.radius += (want - sph.current.radius) * (1 - Math.pow(0.04, dt))
      offset.current.setFromSpherical(sph.current)
      camera.position.copy(c.target).add(offset.current)
      if (Math.abs(sph.current.radius - want) < want * 0.01) flying.current = false
    }

    c.autoRotate = !reducedMotion
    c.autoRotateSpeed = 0.2 * Math.cos(clock.elapsedTime * 0.06)
    c.update()
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={HOME_TARGET}
      enableDamping
      dampingFactor={0.06}
      enablePan={false}
      minDistance={6}
      maxDistance={220}
      rotateSpeed={0.55}
      zoomSpeed={0.7}
      // Grabbing the camera ends the intro flight
      onStart={() => { flying.current = false }}
    />
  )
}
