import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { type ComponentRef, useEffect, useMemo, useRef } from 'react'
import { type PerspectiveCamera, Spherical, Vector3 } from 'three'

import type { AnchorStore } from './anchorStore'
import type { Focus } from './focus'
import {
  CONSTELLATION_HALF_SIZE,
  HOME_DIR,
  HOME_TARGET,
  NEBULA_CENTER,
  NEBULA_HALF_SIZE,
  constellationFrame,
  fitDistance,
  homeDistance,
  landingDistance,
  landingTarget,
} from './places'

const INTRO_DISTANCE = 320
const CORE_DISTANCE = 22
const FOV = 50
const WARP_SECONDS = 2.6
const ORIGIN = new Vector3()

const ease = (rate: number, dt: number) => 1 - Math.pow(rate, dt)

type Props = {
  /** Start screen (far out, idle) or the explorable galaxy. */
  mode: 'landing' | 'galaxy'
  reducedMotion: boolean
  focus: Focus
  anchors: AnchorStore
  /** How far to stand from a planet so it and its moons fit nicely. */
  planetDistance: (id: string) => number
}

/**
 * Orbit controls plus every automatic camera move: the intro fly-in, gliding to whatever is
 * focused (following planets as they orbit), sweeping around behind the constellation,
 * sliding the focus clear of the detail panel, and an idle sway.
 */
export default function CameraRig({ mode, reducedMotion, focus, anchors, planetDistance }: Props) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const width = useThree((s) => s.size.width)
  const frame = useMemo(() => constellationFrame(width), [width])
  const flying = useRef(!reducedMotion)
  // Coming back from the constellation, nebula or core, also swing back to the home angle
  const restoreHome = useRef(false)
  const lastFocus = useRef<Focus>(null)
  const shift = useRef({ x: 0, y: 0 })

  // Where the camera starts: the start-screen view, or (arriving straight at a galaxy, e.g. after
  // logging in) far out for the intro fly-in, or already home for reduced motion
  const initialMode = useRef(mode)
  useEffect(() => {
    const landing = initialMode.current === 'landing'
    const target = landing ? landingTarget(window.innerWidth) : HOME_TARGET
    const distance = landing ? landingDistance(window.innerWidth) : reducedMotion ? homeDistance(window.innerWidth) : INTRO_DISTANCE
    camera.position.copy(target).addScaledVector(HOME_DIR, distance)
    camera.lookAt(target)
    controls.current?.target.copy(target)
  }, [camera, reducedMotion])

  // Entering from the start screen dives in with a brief widening of the view, like a jump to
  // warp; going back to the start screen flies out
  const warp = useRef(1)
  const lastMode = useRef(mode)
  useEffect(() => {
    if (mode === lastMode.current) return
    flying.current = true
    restoreHome.current = true
    if (mode === 'galaxy' && !reducedMotion) warp.current = 0
    lastMode.current = mode
  }, [mode, reducedMotion])

  // Every change of focus starts a flight
  useEffect(() => {
    flying.current = true
    restoreHome.current = focus === null && lastFocus.current !== null && lastFocus.current.kind !== 'planet'
    lastFocus.current = focus
  }, [focus])

  const goal = useRef(new Vector3())
  const previous = useRef(new Vector3())
  const offset = useRef(new Vector3())
  const sph = useRef(new Spherical())
  const sphGoal = useRef(new Spherical())

  useFrame(({ clock, size, camera: frameCamera }, dt) => {
    const c = controls.current
    if (!c) return
    const landing = mode === 'landing'
    const kind = landing ? undefined : focus?.kind

    if (warp.current < 1) {
      warp.current = Math.min(1, warp.current + dt / WARP_SECONDS)
      const lens = frameCamera as PerspectiveCamera
      lens.fov = FOV + Math.sin(warp.current * Math.PI) * 16
      lens.updateProjectionMatrix()
    }
    const diving = warp.current < 1

    // Follow the focus (planets keep orbiting, so this runs every frame)
    const anchor = !landing && focus?.kind === 'planet' ? anchors.getAnchor(focus.id) : null
    if (anchor) anchor.getWorldPosition(goal.current)
    else if (landing) goal.current.copy(landingTarget(size.width))
    else if (kind === 'constellation') goal.current.copy(frame.center)
    else if (kind === 'nebula') goal.current.copy(NEBULA_CENTER)
    else goal.current.copy(kind === 'core' ? ORIGIN : HOME_TARGET)
    previous.current.copy(c.target)
    c.target.lerp(goal.current, ease(diving ? 0.0004 : 0.002, dt))
    camera.position.add(offset.current.subVectors(c.target, previous.current))

    if (flying.current) {
      const want = landing
        ? landingDistance(size.width)
        : focus?.kind === 'planet'
          ? planetDistance(focus.id)
          : kind === 'constellation'
            ? fitDistance(CONSTELLATION_HALF_SIZE.w * frame.scale, CONSTELLATION_HALF_SIZE.h * frame.scale, camera, size.width)
            : kind === 'nebula'
              ? fitDistance(NEBULA_HALF_SIZE.w, NEBULA_HALF_SIZE.h, camera, size.width)
              : kind === 'core'
                ? CORE_DISTANCE
                : homeDistance(size.width)
      // Swing around the target on a sphere, so going behind the constellation sweeps past it
      // instead of cutting through it
      const dir = kind === 'constellation' ? frame.viewDir : restoreHome.current ? HOME_DIR : null
      offset.current.subVectors(camera.position, c.target)
      sph.current.setFromVector3(offset.current)
      sph.current.radius += (want - sph.current.radius) * ease(diving ? 0.012 : 0.04, dt)
      let aligned = true
      if (dir) {
        sphGoal.current.setFromVector3(dir)
        const dTheta = Math.atan2(Math.sin(sphGoal.current.theta - sph.current.theta), Math.cos(sphGoal.current.theta - sph.current.theta))
        const k = ease(0.06, dt)
        sph.current.theta += dTheta * k
        sph.current.phi += (sphGoal.current.phi - sph.current.phi) * k
        aligned = Math.abs(dTheta) < 0.01 && Math.abs(sphGoal.current.phi - sph.current.phi) < 0.01
      }
      offset.current.setFromSpherical(sph.current)
      camera.position.copy(c.target).add(offset.current)
      if (aligned && Math.abs(sph.current.radius - want) < want * 0.01 && c.target.distanceTo(goal.current) < 0.05) {
        flying.current = false
        restoreHome.current = false
      }
    }

    // Slide the focus into the open space beside the panel (above it on phones, where it's a bottom sheet)
    const wide = size.width > 720
    const panelOpen = !landing && focus !== null
    const wantX = panelOpen && wide ? Math.min(380, size.width * 0.3) / 2 : 0
    const wantY = panelOpen && !wide ? size.height * 0.26 : 0
    shift.current.x += (wantX - shift.current.x) * ease(0.02, dt)
    shift.current.y += (wantY - shift.current.y) * ease(0.02, dt)
    if (Math.abs(shift.current.x) > 0.5 || Math.abs(shift.current.y) > 0.5) {
      camera.setViewOffset(size.width, size.height, shift.current.x, shift.current.y, size.width, size.height)
    } else if (camera.view?.enabled) {
      camera.clearViewOffset()
    }

    c.minDistance =
      focus?.kind === 'planet' ? planetDistance(focus.id) * 0.3 : kind === 'constellation' ? 20 : kind === 'nebula' ? 30 : kind === 'core' ? 5 : 6
    c.enabled = !landing
    c.autoRotate = (landing || !focus) && !reducedMotion
    // Start screen: a slow, steady turn. Galaxy: sway back and forth, starting in the direction
    // that drifts the nebula toward the middle first
    c.autoRotateSpeed = landing ? 0.35 : -0.2 * Math.cos(clock.elapsedTime * 0.06)
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
      maxDistance={360}
      rotateSpeed={0.55}
      zoomSpeed={0.7}
      // Grabbing the camera ends any automatic flight
      onStart={() => {
        flying.current = false
        restoreHome.current = false
      }}
    />
  )
}
