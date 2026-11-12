import { Object3D, type PerspectiveCamera, Quaternion, Vector3 } from 'three'

// Where things sit in the scene, ported from docs/prototype/tuniverse-galaxy.html.

/** Home view looks slightly above the core, leaving sky room for the constellation. */
export const HOME_TARGET = new Vector3(0, 7, 0)
export const HOME_DIR = new Vector3(0, 0.42, 1).normalize()
export const homeDistance = (width: number) => (width < 720 ? 96 : 70)

/** Phones get a smaller constellation so it fits their narrow view. */
export const constellationScale = (width: number) => (width < 720 ? 0.8 : 1)

/**
 * The constellation: one winding path from #1 to #20 in the sky behind the galaxy. Drawn as
 * seen from the close-up (behind it), so x is mirrored when placed. Fewer tracks use the
 * first points of the path.
 */
export const CONSTELLATION_PATH: [number, number][] = [
  [-25, 12], [-20, 15], [-15, 10], [-17, 4], [-11, 1],
  [-6, 6], [-1, 12], [4, 15], [9, 10], [6, 4],
  [10, -1], [5, -6], [-2, -4], [-8, -9], [-4, -15],
  [3, -13], [10, -16], [16, -11], [21, -5], [26, -9],
]
const CONSTELLATION_CENTER = new Vector3(0, 8, -110)
/** Half the constellation's width and height, for fitting the close-up camera. */
export const CONSTELLATION_HALF_SIZE = { w: 28, h: 18 }

/** Placement of the constellation, facing the home camera, plus where the close-up camera goes. */
export function constellationFrame(width: number) {
  const pivot = new Object3D()
  pivot.position.copy(CONSTELLATION_CENTER)
  pivot.lookAt(HOME_TARGET.clone().addScaledVector(HOME_DIR, homeDistance(width)))
  const quaternion = new Quaternion().copy(pivot.quaternion)
  const normal = new Vector3(0, 0, 1).applyQuaternion(quaternion)
  return {
    center: CONSTELLATION_CENTER.clone(),
    quaternion,
    scale: constellationScale(width),
    // The close-up looks from behind and a little below, so your galaxy sits in the background
    viewDir: normal.clone().negate().add(new Vector3(0, -0.4, 0)).normalize(),
  }
}

/** The mood nebula, up and to the left in the sky. */
export const NEBULA_CENTER = new Vector3(-120, -22, -250)
export const NEBULA_HALF_SIZE = { w: 72, h: 52 }

/**
 * Camera distance at which something of the given half-size fills the space beside the panel
 * (desktop) or above it (phones, where the panel is a bottom sheet).
 */
export function fitDistance(halfW: number, halfH: number, camera: PerspectiveCamera, width: number) {
  const tanV = Math.tan((camera.fov * Math.PI) / 360)
  const tanH = tanV * camera.aspect
  const wide = width > 720
  const usableW = wide ? 1 - Math.min(380, width * 0.3) / width : 1
  const usableH = wide ? 1 : 0.36
  return Math.max(halfH / (tanV * 0.66 * usableH), halfW / (tanH * 0.7 * usableW))
}
