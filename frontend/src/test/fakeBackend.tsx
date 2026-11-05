import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'

import App from '../App'
import { createQueryClient } from '../queryClient'

export type Reply = { status: number; body?: unknown }

export const USER = { id: 'me', display_name: 'Celeste', image_url: null, profile_url: 'https://open.spotify.com/user/me', followers: 12 }
export const OK: Reply = { status: 200, body: USER }
export const NO_SESSION: Reply = { status: 401, body: { detail: 'No Spotify session found. Please log in first.' } }

export const galaxyPath = (range = 'medium_term') => `GET /api/v1/spotify/galaxy?time_range=${range}`

export const moon = (id: string, name: string, rank: number) => ({
  id, name, rank, popularity: 70, duration_ms: 230000,
  album_image_url: `https://img.test/${id}.jpg`, spotify_url: `https://open.spotify.com/track/${id}`,
})

export const planet = (rank: number, name: string, extra: Record<string, unknown> = {}) => ({
  id: `a${rank}`, name, rank, orbit_radius: 0, planet_size: 0, glow_intensity: 0.8,
  mood: 'Aggressive', color: '#E63946', image_url: null, genres: ['metalcore'], popularity: 80,
  followers: 4100000, spotify_url: null, moons: [], ...extra,
})

export const galaxyReply = (planets: ReturnType<typeof planet>[], range = 'medium_term'): Reply => ({
  status: 200,
  body: { time_range: range, total_planets: planets.length, planets },
})

export const GALAXY = galaxyReply([planet(1, 'Sleep Token'), planet(2, 'Phoebe Bridgers')])

// Fake backend: tests set what each "METHOD path" answers, and can change it mid-test.
// A list answers with its items in turn, repeating the last one.
export const backend = { routes: {} as Record<string, Reply | Reply[]>, calls: [] as string[] }

export function installFakeBackend() {
  backend.calls.length = 0
  backend.routes = {
    'GET /api/v1/spotify/me': OK,
    [galaxyPath()]: GALAXY,
    'POST /api/v1/auth/logout': { status: 200, body: { logged_out: true } },
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const key = `${init?.method ?? 'GET'} ${url}`
      backend.calls.push(key)
      const route = backend.routes[key] ?? { status: 404, body: { detail: 'Not Found' } }
      const reply = Array.isArray(route) ? (route.length > 1 ? route.shift()! : route[0]) : route
      return new Response(JSON.stringify(reply.body ?? {}), {
        status: reply.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }),
  )
}

export function renderAt(path: string) {
  const client = createQueryClient()
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return client
}
