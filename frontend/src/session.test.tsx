import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from './api/client'
import { markSignedIn, wasSignedIn } from './session'
import { GALAXY, NO_SESSION, OK, backend, galaxyPath, installFakeBackend, renderAt } from './test/fakeBackend'

vi.mock('./galaxy/GalaxyScene', () => import('./test/FakeGalaxyScene'))

const GALAXY_PATH = galaxyPath()

beforeEach(installFakeBackend)

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
    backend.routes['GET /api/v1/spotify/me'] = NO_SESSION
    renderAt('/galaxy')

    expect(await screen.findByRole('button', { name: 'Connect Spotify' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('explains an ended session to someone who was signed in', async () => {
    markSignedIn()
    backend.routes['GET /api/v1/spotify/me'] = NO_SESSION
    renderAt('/galaxy')

    expect(await screen.findByRole('alert')).toHaveTextContent('Your session ended')
    expect(screen.getByRole('button', { name: 'Connect Spotify' })).toBeInTheDocument()
    // Shown once: the flag is cleared so the next visit starts fresh
    await waitFor(() => expect(wasSignedIn()).toBe(false))
  })

  it('tells an account that is not on the Spotify allowlist', async () => {
    backend.routes['GET /api/v1/spotify/me'] = { status: 403, body: { detail: 'Spotify API error 403 for /me' } }
    renderAt('/galaxy')

    expect(await screen.findByRole('alert')).toHaveTextContent("isn't on the invite list")
  })

  it('offers a retry when Spotify is unreachable', async () => {
    backend.routes['GET /api/v1/spotify/me'] = { status: 502, body: { detail: 'Spotify API error 503 for /me' } }
    renderAt('/galaxy')

    expect(await screen.findByRole('alert', {}, { timeout: 5000 })).toHaveTextContent("couldn't reach Spotify")

    backend.routes['GET /api/v1/spotify/me'] = OK
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('list', { name: 'Planets' })).toBeInTheDocument()
  })

  it('sends the user to log in when any request finds the session gone', async () => {
    const client = renderAt('/galaxy')
    await screen.findByRole('list', { name: 'Planets' })

    // e.g. the backend restarted and forgot the session
    backend.routes['GET /api/v1/spotify/me'] = NO_SESSION
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
    backend.routes['GET /api/v1/spotify/me'] = NO_SESSION
    renderAt('/?login_error=access_denied')

    expect(await screen.findByRole('alert')).toHaveTextContent('Spotify login was cancelled')
  })

  it('logs out back to the start screen', async () => {
    renderAt('/galaxy')
    await screen.findByRole('list', { name: 'Planets' })

    backend.routes['GET /api/v1/spotify/me'] = NO_SESSION
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))

    expect(await screen.findByRole('button', { name: 'Connect Spotify' })).toBeInTheDocument()
    expect(backend.calls).toContain('POST /api/v1/auth/logout')
    expect(wasSignedIn()).toBe(false)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('galaxy page', () => {
  it('explains an empty galaxy for an account with no listening history', async () => {
    backend.routes[GALAXY_PATH] = { status: 200, body: { time_range: 'medium_term', total_planets: 0, planets: [] } }
    renderAt('/galaxy')

    expect(await screen.findByRole('heading', { name: 'Still forming' })).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Planets' })).not.toBeInTheDocument()
  })

  it('offers a retry when the galaxy fails to load', async () => {
    backend.routes[GALAXY_PATH] = { status: 502, body: { detail: 'Spotify API error 503 for /me/top/artists' } }
    renderAt('/galaxy')

    expect(await screen.findByRole('alert', {}, { timeout: 5000 })).toHaveTextContent("couldn't load your galaxy")

    backend.routes[GALAXY_PATH] = GALAXY
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('list', { name: 'Planets' })).toHaveTextContent('Sleep Token')
  })

  it('sends the user to log in if the galaxy request finds the session gone', async () => {
    // The session dies between the /me check and the galaxy request
    backend.routes['GET /api/v1/spotify/me'] = [OK, NO_SESSION]
    backend.routes[GALAXY_PATH] = NO_SESSION
    renderAt('/galaxy')

    expect(await screen.findByRole('alert')).toHaveTextContent('Your session ended')
    expect(screen.queryByText(/couldn't load your galaxy/)).not.toBeInTheDocument()
  })
})
