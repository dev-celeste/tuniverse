/**
 * Clicks on 3D objects ignore drags (the camera can be dragged around). A fingertip drifts more
 * than a mouse during a tap, so touch screens get a bigger allowance before a tap counts as a drag.
 */
const MOUSE_SLOP = 6
const TOUCH_SLOP = 16

export function isTap(e: { delta: number }): boolean {
  const coarse = typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches ?? false)
  return e.delta <= (coarse ? TOUCH_SLOP : MOUSE_SLOP)
}
