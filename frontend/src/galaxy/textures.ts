import { CanvasTexture, RepeatWrapping } from 'three'

import { rng } from './layout'

let glow: CanvasTexture | null = null

/** Soft radial falloff used for halos, the core's corona and dust motes. */
export function glowTexture(): CanvasTexture {
  if (glow) return glow
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const g = canvas.getContext('2d')!
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.18, 'rgba(255,255,255,0.42)')
  grad.addColorStop(0.5, 'rgba(255,255,255,0.08)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  glow = new CanvasTexture(canvas)
  return glow
}

/** Grayscale gas-giant bands; the material color tints them to the planet's mood. */
export function bandTexture(seed: number): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 128
  const g = canvas.getContext('2d')!
  const rand = rng(seed)
  let y = 0
  while (y < 128) {
    const h = 2 + rand() * 11
    const l = Math.round(150 + rand() * 105)
    g.fillStyle = `rgb(${l},${l},${l})`
    g.fillRect(0, y, 256, h + 1)
    y += h
  }
  // Soften the band edges, then sprinkle faint streaks
  g.globalAlpha = 0.5
  g.drawImage(canvas, 0, 2)
  g.drawImage(canvas, 0, -2)
  g.globalAlpha = 0.12
  for (let i = 0; i < 260; i++) {
    const l = rand() > 0.5 ? 255 : 90
    g.fillStyle = `rgb(${l},${l},${l})`
    g.fillRect(rand() * 256, rand() * 128, 1 + rand() * 6, 1)
  }
  const texture = new CanvasTexture(canvas)
  texture.wrapS = RepeatWrapping
  return texture
}
