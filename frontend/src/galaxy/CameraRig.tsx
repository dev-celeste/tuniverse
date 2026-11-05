import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { type ComponentRef, useEffect, useRef } from 'react'
import { type PerspectiveCamera, Spherical, Vector3 } from 'three'

import type { AnchorStore } from './anchorStore'
import type { Focus } from './focus'

// Home view looks slightly above the core, leaving sky room for the constellation (step 3)
export const HOME_TARGET = new Vector3(0, 7, 0)
const HOME_DIR = new Vector3(0, 0.42, 1).normalize()
const INTRO_DISTANCE = 320
const CORE_DISTANCE = 22
const ORIGIN = new Vector3()

const homeDistance = () => (window.innerWidth < 720 ? 96 : 70)
const ease = (rate: number, dt: number) => 1 - Math.pow(rate, dt)

type Props = {
  reducedMotion: boolean
  focus: Focus
  anchors: AnchorStore
  /** How far to stand from a planet so it and its moons fit nicely. */
  planetDistance: (id: string) => number
}

/**
 * Orbit controls plus every automatic camera move: the intro fly-in, gliding to and following
 * a focused planet or the core, sliding the focus clear of the detail panel, and an idle sway.
 */
export default function CameraRig({ reducedMotion, focus, anchors, planetDistance }: Props) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const flying = useRef(!reducedMotion)
  const shift = useRef({ x: 0, y: 0 })

  // Start far out (or already home, for reduced motion) looking at the galaxy
  useEffect(() => {
    camera.position.copy(HOME_TARGET).addScaledVector(HOME_DIR, reducedMotion ? homeDistance() : INTRO_DISTANCE)
    camera.lookAt(HOME_TARGET)
  }, [camera, reducedMotion])

  // Every change of focus starts a flight
  useEffect(() => {
    flying.current = true
  }, [focus])

  const goal = useRef(new Vector3())
  const previous = useRef(new Vector3())
  const offset = useRef(new Vector3())
  const sph = useRef(new Spherical())

  useFrame(({ clock, size }, dt) => {
    const c = controls.current
    if (!c) return

    // Follow the focus (planets keep orbiting, so this runs every frame)
    const anchor = focus?.kind === 'planet' ? anchors.getAnchor(focus.id) : null
    if (anchor) anchor.getWorldPosition(goal.current)
    else goal.current.copy(focus?.kind === 'core' ? ORIGIN : HOME_TARGET)
    previous.current.copy(c.target)
    c.target.lerp(goal.current, ease(0.002, dt))
    camera.position.add(offset.current.subVectors(c.target, previous.current))

    if (flying.current) {
      const want = focus?.kind === 'planet' ? planetDistance(focus.id) : focus?.kind === 'core' ? CORE_DISTANCE : homeDistance()
      offset.current.subVectors(camera.position, c.target)
      sph.current.setFromVector3(offset.current)
      sph.current.radius += (want - sph.current.radius) * ease(0.04, dt)
      offset.current.setFromSpherical(sph.current)
      camera.position.copy(c.target).add(offset.current)
      if (Math.abs(sph.current.radius - want) < want * 0.01 && c.target.distanceTo(goal.current) < 0.05) flying.current = false
    }

    // Slide the focus into the open space beside the panel (above it on phones, where it's a bottom sheet)
    const wide = size.width > 720
    const wantX = focus && wide ? Math.min(380, size.width * 0.3) / 2 : 0
    const wantY = focus && !wide ? size.height * 0.26 : 0
    shift.current.x += (wantX - shift.current.x) * ease(0.02, dt)
    shift.current.y += (wantY - shift.current.y) * ease(0.02, dt)
    if (Math.abs(shift.current.x) > 0.5 || Math.abs(shift.current.y) > 0.5) {
      camera.setViewOffset(size.width, size.height, shift.current.x, shift.current.y, size.width, size.height)
    } else if (camera.view?.enabled) {
      camera.clearViewOffset()
    }

    c.minDistance = focus?.kind === 'planet' ? planetDistance(focus.id) * 0.3 : focus?.kind === 'core' ? 5 : 6
    c.autoRotate = !focus && !reducedMotion
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
      // Grabbing the camera ends any automatic flight
      onStart={() => {
        flying.current = false
      }}
    />
  )
}
