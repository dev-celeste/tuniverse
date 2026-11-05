import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Planet } from './api/types'
import { ApiError } from './api/client'
import App from './App'
import { createQueryClient } from './queryClient'
import { markSignedIn, wasSignedIn } from './session'

// WebGL doesn't exist in jsdom: stand in for the 3D scene with a list of the planets it was given
vi.mock('./galaxy/GalaxyScene', () => ({
  default: ({ planets }: { planets: Planet[] }) => (
    <ul aria-label="Planets">
      {planets.map((p) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  ),
}))

type Reply = { status: number; body?: unknown }

const USER = { id: 'me', display_name: 'Celeste', image_url: null, profile_url: null, followers: 12 }
const OK: Reply = { status: 200, body: USER }
const NO_SESSION: Reply = { status: 401, body: { detail: 'No Spotify session found. Please log in first.' } }
const GALAXY_PATH = 'GET /api/v1/spotify/galaxy?time_range=medium_term'
const planet = (rank: number, name: string) => ({
  id: `a${rank}`, name, rank, orbit_radius: 0, planet_size: 0, glow_intensity: 0.8,
  mood: 'Aggressive', color: '#E63946', image_url: null, genres: ['metalcore'], popularity: 80, spotify_url: null, moons: [],
})
const GALAXY: Reply = {
  status: 200,
  body: { time_range: 'medium_term', total_planets: 2, planets: [planet(1, 'Sleep Token'), planet(2, 'Phoebe Bridgers')] },
}

// Fake backend: tests set what each "METHOD path" answers, and can change it mid-test.
// A list answers with its items in turn, repeating the last one.
let routes: Record<string, Reply | Reply[]>
const calls: string[] = []

beforeEach(() => {
  calls.length = 0
  routes = {
    'GET /api/v1/spotify/me': OK,
    [GALAXY_PATH]: GALAXY,
    'POST /api/v1/auth/logout': { status: 200, body: { logged_out: true } },
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const key = `${init?.method ?? 'GET'} ${url}`
      calls.push(key)
      const route = routes[key] ?? { status: 404, body: { detail: 'Not Found' } }
      const reply = Array.isArray(route) ? (route.length > 1 ? route.shift()! : route[0]) : route
      return new Response(JSON.stringify(reply.body ?? {}), {
        status: reply.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }),
  )
})

function renderAt(path: string) {
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

describe('protected routes', () => {
  it('shows the galaxy to a signed-in user', async () => {
    renderAt('/galaxy')

    expect(screen.getByRole('status')).toHaveTextContent('Charting your universe')
    const planets = await screen.findByRole('list', { name: 'Planets' })
    expect(planets).toHaveTextContent('Sleep Token')
    expect(planets).toHaveTextContent('Phoebe Bridgers')
    expect(wasSignedIn()).toBe(true)
  })

  it('sends a visitor without a session to the start screen, with no message', async () => {
    routes['GET /api/v1/spotify/me'] = NO_SESSION
    renderAt('/galaxy')

    expect(await screen.findByRole('button', { name: 'Connect Spotify' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('explains an ended session to someone who was signed in', async () => {
    markSignedIn()
    routes['GET /api/v1/spotify/me'] = NO_SESSION
    renderAt('/galaxy')

    expect(await screen.findByRole('alert')).toHaveTextContent('Your session ended')
    expect(screen.getByRole('button', { name: 'Connect Spotify' })).toBeInTheDocument()
    // Shown once: the flag is cleared so the next visit starts fresh
    await waitFor(() => expect(wasSignedIn()).toBe(false))
  })

  it('tells an account that is not on the Spotify allowlist', async () => {
    routes['GET /api/v1/spotify/me'] = { status: 403, body: { detail: 'Spotify API error 403 for /me' } }
    renderAt('/galaxy')

    expect(await screen.findByRole('alert')).toHaveTextContent("isn't on the invite list")
  })

  it('offers a retry when Spotify is unreachable', async () => {
    routes['GET /api/v1/spotify/me'] = { status: 502, body: { detail: 'Spotify API error 503 for /me' } }
    renderAt('/galaxy')

    expect(await screen.findByRole('alert', {}, { timeout: 5000 })).toHaveTextContent("couldn't reach Spotify")

    routes['GET /api/v1/spotify/me'] = OK
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('list', { name: 'Planets' })).toBeInTheDocument()
  })

  it('sends the user to log in when any request finds the session gone', async () => {
    const client = renderAt('/galaxy')
    await screen.findByRole('list', { name: 'Planets' })

    // e.g. the backend restarted and forgot the session
    routes['GET /api/v1/spotify/me'] = NO_SESSION
    await client
      .fetchQuery({ queryKey: ['galaxy'], queryFn: () => Promise.reject(new ApiError(401, 'No session')) })
      .catch(() => {})

    expect(await screen.findByRole('alert')).toHaveTextContent('Your session ended')
  })
})

describe('start screen', () => {
  it('offers to enter the universe when already signed in', async () => {
    renderAt('/')

    expect(await screen.findByRole('link', { name: 'Enter your universe' })).toHaveAttribute('href', '/galaxy')
    expect(screen.queryByRole('button', { name: 'Connect Spotify' })).not.toBeInTheDocument()
  })

  it('shows login errors from the backend redirect', async () => {
    routes['GET /api/v1/spotify/me'] = NO_SESSION
    renderAt('/?login_error=access_denied')

    expect(await screen.findByRole('alert')).toHaveTextContent('Spotify login was cancelled')
  })

  it('logs out back to the start screen', async () => {
    renderAt('/galaxy')
    await screen.findByRole('list', { name: 'Planets' })

    routes['GET /api/v1/spotify/me'] = NO_SESSION
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))

    expect(await screen.findByRole('button', { name: 'Connect Spotify' })).toBeInTheDocument()
    expect(calls).toContain('POST /api/v1/auth/logout')
    expect(wasSignedIn()).toBe(false)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('galaxy page', () => {
  it('explains an empty galaxy for an account with no listening history', async () => {
    routes[GALAXY_PATH] = { status: 200, body: { time_range: 'medium_term', total_planets: 0, planets: [] } }
    renderAt('/galaxy')

    expect(await screen.findByRole('heading', { name: 'Still forming' })).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Planets' })).not.toBeInTheDocument()
  })

  it('offers a retry when the galaxy fails to load', async () => {
    routes[GALAXY_PATH] = { status: 502, body: { detail: 'Spotify API error 503 for /me/top/artists' } }
    renderAt('/galaxy')

    expect(await screen.findByRole('alert', {}, { timeout: 5000 })).toHaveTextContent("couldn't load your galaxy")

    routes[GALAXY_PATH] = GALAXY
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('list', { name: 'Planets' })).toHaveTextContent('Sleep Token')
  })

  it('sends the user to log in if the galaxy request finds the session gone', async () => {
    // The session dies between the /me check and the galaxy request
    routes['GET /api/v1/spotify/me'] = [OK, NO_SESSION]
    routes[GALAXY_PATH] = NO_SESSION
    renderAt('/galaxy')

    expect(await screen.findByRole('alert')).toHaveTextContent('Your session ended')
    expect(screen.queryByText(/couldn't load your galaxy/)).not.toBeInTheDocument()
  })
})
