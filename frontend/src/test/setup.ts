import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// jsdom has no canvas. The starfield handles a missing 2D context by drawing nothing; WebGL
// reports as available so pages use the (faked) 3D scene. fallback.test.tsx turns it off.
const getContext = vi.fn((type: string) => (type.startsWith('webgl') ? {} : null))
HTMLCanvasElement.prototype.getContext = getContext as unknown as HTMLCanvasElement['getContext']
// jsdom doesn't lay out pages, so it has no scrollIntoView
Element.prototype.scrollIntoView = vi.fn()

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  vi.unstubAllGlobals()
})
