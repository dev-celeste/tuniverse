import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from './api/client'
import App from './App'
import { createQueryClient } from './queryClient'
import { markSignedIn, wasSignedIn } from './session'

type Reply = { status: number; body?: unknown }

const USER = { id: 'me', display_name: 'Celeste', image_url: null, profile_url: null, followers: 12 }
const OK: Reply = { status: 200, body: USER }
const NO_SESSION: Reply = { status: 401, body: { detail: 'No Spotify session found. Please log in first.' } }

// Fake backend: tests set what each "METHOD path" answers, and can change it mid-test
let routes: Record<string, Reply>
const calls: string[] = []

beforeEach(() => {
  calls.length = 0
  routes = { 'GET /api/v1/spotify/me': OK, 'POST /api/v1/auth/logout': { status: 200, body: { logged_out: true } } }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const key = `${init?.method ?? 'GET'} ${url}`
      calls.push(key)
      const reply = routes[key] ?? { status: 404, body: { detail: 'Not Found' } }
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
    expect(await screen.findByRole('heading', { name: 'Celeste' })).toBeInTheDocument()
    expect(screen.getByText('12 followers')).toBeInTheDocument()
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
    expect(await screen.findByRole('heading', { name: 'Celeste' })).toBeInTheDocument()
  })

  it('sends the user to log in when any request finds the session gone', async () => {
    const client = renderAt('/galaxy')
    await screen.findByRole('heading', { name: 'Celeste' })

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
    await screen.findByRole('heading', { name: 'Celeste' })

    routes['GET /api/v1/spotify/me'] = NO_SESSION
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))

    expect(await screen.findByRole('button', { name: 'Connect Spotify' })).toBeInTheDocument()
    expect(calls).toContain('POST /api/v1/auth/logout')
    expect(wasSignedIn()).toBe(false)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
