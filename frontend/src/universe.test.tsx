import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { NO_SESSION, backend, galaxyPath, galaxyReply, installFakeBackend, planet, renderAt } from './test/fakeBackend'

vi.mock('./galaxy/GalaxyScene', () => import('./test/FakeGalaxyScene'))

beforeEach(installFakeBackend)

const scene = () => screen.getByTestId('scene')
const spotifyCalls = () => backend.calls.filter((c) => c.includes('/api/v1/spotify/') && !c.endsWith('/spotify/me'))

describe('start screen', () => {
  it('shows the demo galaxy from far out behind the title', async () => {
    backend.routes['GET /api/v1/spotify/me'] = NO_SESSION
    renderAt('/')

    expect(await screen.findByRole('heading', { name: 'Tuniverse' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Arctic Monkeys' })).toBeInTheDocument()
    expect(scene()).toHaveAttribute('data-mode', 'landing')
    // The backdrop is sample data: no Spotify data requests for a visitor who isn't signed in
    expect(spotifyCalls()).toEqual([])
  })

  it('dives into the demo universe', async () => {
    backend.routes['GET /api/v1/spotify/me'] = NO_SESSION
    renderAt('/')
    await screen.findByRole('button', { name: 'Arctic Monkeys' })

    await userEvent.click(screen.getByRole('link', { name: 'Explore the demo universe' }))

    // Same scene, now explorable: the camera flies in instead of the page reloading
    expect(scene()).toHaveAttribute('data-mode', 'galaxy')
    expect(await screen.findByRole('radio', { name: '6 months' })).toBeInTheDocument()
  })
})

describe('coming back from Spotify login', () => {
  it('shows the start screen for a beat, then dives into your galaxy', async () => {
    // Artists that aren't in the demo, so the swap is visible
    backend.routes[galaxyPath()] = galaxyReply([planet(1, 'Laufey', { id: 'laufey' }), planet(2, 'Jutes', { id: 'jutes' })])
    renderAt('/?welcome=1')

    expect(await screen.findByRole('status')).toHaveTextContent('Entering your universe')
    expect(screen.queryByRole('button', { name: 'Connect Spotify' })).not.toBeInTheDocument()

    // The demo backdrop gives way to your planets as the camera dives in
    expect(await screen.findByRole('button', { name: 'Laufey' }, { timeout: 4000 })).toBeInTheDocument()
    expect(scene()).toHaveAttribute('data-mode', 'galaxy')
    expect(screen.queryByRole('button', { name: 'Arctic Monkeys' })).not.toBeInTheDocument()
  })

  it('explains instead of diving when Spotify rejects the account', async () => {
    backend.routes['GET /api/v1/spotify/me'] = { status: 403, body: { detail: 'Spotify API error 403 for /me' } }
    renderAt('/?welcome=1')

    expect(await screen.findByRole('alert')).toHaveTextContent("isn't on the invite list")
    expect(scene()).toHaveAttribute('data-mode', 'landing')
  })
})

describe('demo universe', () => {
  it('works without logging in and never calls Spotify', async () => {
    backend.routes['GET /api/v1/spotify/me'] = NO_SESSION
    renderAt('/demo')

    const planets = within(await screen.findByRole('list', { name: 'Planets' }))
    expect(planets.getByRole('button', { name: 'Tame Impala' })).toBeInTheDocument()
    expect(screen.getByText('Demo universe · sample data')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Connect Spotify' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Log out' })).not.toBeInTheDocument()
    expect(spotifyCalls()).toEqual([])
  })

  it('has the full experience: panels, constellation, mood and time ranges', async () => {
    renderAt('/demo')
    const planets = within(await screen.findByRole('list', { name: 'Planets' }))

    // Each period's #10 artist has no songs in the top tracks: a planet without moons
    await userEvent.click(planets.getByRole('button', { name: 'Britney Spears' }))
    expect(screen.getByText(/None of their songs are in your top 50 tracks/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Core' }))
    expect(screen.getByRole('heading', { name: 'Demo Listener' })).toBeInTheDocument()
    expect(screen.getByText(/^Mostly the 20\d0s · oldest: In the End \(2000\)$/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Top tracks' }))
    expect(screen.getAllByRole('link', { name: /open in Spotify$/ })).toHaveLength(20)

    expect(await screen.findByRole('region', { name: 'Galaxy mood' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: '4 weeks' }))
    expect(await screen.findByRole('button', { name: 'John Summit' })).toBeInTheDocument()
    expect(spotifyCalls()).toEqual([])
  })
})
