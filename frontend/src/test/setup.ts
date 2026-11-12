import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// jsdom has no canvas; the starfield handles a missing 2D context by drawing nothing
HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as unknown as HTMLCanvasElement['getContext']
// jsdom doesn't lay out pages, so it has no scrollIntoView
Element.prototype.scrollIntoView = vi.fn()

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  vi.unstubAllGlobals()
})
