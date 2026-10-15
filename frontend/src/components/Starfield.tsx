import { useEffect, useRef } from 'react'

const STAR_COUNT = 420

/**
 * A quiet, twinkling 2D sky behind the start screen and placeholder pages.
 * The 3D galaxy (React Three Fiber) replaces it on /galaxy in Ticket 17.
 */
export default function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const stars = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() < 0.08 ? 1.2 + Math.random() * 0.8 : 0.4 + Math.random() * 0.7,
      base: 0.25 + Math.random() * 0.6,
      phase: Math.random() * Math.PI * 2,
      warm: Math.random() < 0.2,
    }))

    let frame = 0
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const draw = (time: number) => {
      const w = window.innerWidth
      const h = window.innerHeight
      ctx.clearRect(0, 0, w, h)
      for (const s of stars) {
        const twinkle = reducedMotion ? 1 : 0.75 + 0.25 * Math.sin(time / 1400 + s.phase)
        ctx.globalAlpha = s.base * twinkle
        ctx.fillStyle = s.warm ? '#ffe6c7' : '#e4e8ff'
        ctx.beginPath()
        ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2)
        ctx.fill()
      }
      if (!reducedMotion) frame = requestAnimationFrame(draw)
    }

    resize()
    frame = requestAnimationFrame(draw)
    const onResize = () => {
      resize()
      if (reducedMotion) draw(0)
    }
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return <canvas ref={canvasRef} className="starfield" aria-hidden="true" />
}
