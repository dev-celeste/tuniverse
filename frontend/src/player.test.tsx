import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { NO_SESSION, backend, galaxyPath, galaxyReply, installFakeBackend, moon, planet, renderAt, topTracksPath, track, tracksReply } from './test/fakeBackend'

vi.mock('./galaxy/GalaxyScene', () => import('./test/FakeGalaxyScene'))

beforeEach(() => {
  installFakeBackend()
  backend.routes[galaxyPath()] = galaxyReply([
    planet(1, 'Sleep Token', { moons: [moon('t1', 'The Summoning', 1), moon('t2', 'Granite', 2)] }),
    planet(2, 'Phoebe Bridgers'),
  ])
  backend.routes[topTracksPath()] = tracksReply([
    track('t1', 'The Summoning', ['Sleep Token'], '2023-01-05'),
    track('t2', 'Granite', ['Sleep Token'], '2023-03-23'),
  ])
})

const panel = () => document.querySelector<HTMLElement>('aside.panel')!
const scene = () => screen.getByTestId('scene')

async function listenToGranite() {
  renderAt('/galaxy')
  const planets = within(await screen.findByRole('list', { name: 'Planets' }, { timeout: 4000 }))
  await userEvent.click(planets.getByRole('button', { name: 'Sleep Token' }))
  const row = within(panel()).getByRole('button', { name: 'Listen to Granite' })
  await userEvent.click(row)
  await userEvent.unhover(row)
  return row
}

describe('the in-app player', () => {
  it("plays a song in Spotify's player and keeps its moon lit", async () => {
    const row = await listenToGranite()

    const dock = within(screen.getByRole('region', { name: 'Now playing' }))
    const player = dock.getByTitle('Spotify player: Granite by Sleep Token')
    expect(player).toHaveAttribute('src', expect.stringContaining('https://open.spotify.com/embed/track/t2'))
    expect(row).toHaveAttribute('aria-pressed', 'true')
    // The pointer has left the row, but the playing song stays lit
    expect(scene()).toHaveAttribute('data-highlight', 't2')
  })

  it('keeps playing while you explore, until you close it', async () => {
    await listenToGranite()

    await userEvent.keyboard('{Escape}')
    await userEvent.click(screen.getByRole('button', { name: 'Core' }))
    expect(screen.getByRole('region', { name: 'Now playing' })).toBeInTheDocument()

    // The same song shows as playing in the top tracks list too
    await userEvent.click(screen.getByRole('button', { name: 'Top tracks' }))
    expect(within(panel()).getByRole('button', { name: 'Listen to 2. Granite' })).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(screen.getByRole('button', { name: 'Close player' }))
    expect(screen.queryByRole('region', { name: 'Now playing' })).not.toBeInTheDocument()
    expect(scene()).toHaveAttribute('data-highlight', '')
  })

  it('swaps the player when you pick another song', async () => {
    await listenToGranite()

    await userEvent.click(within(panel()).getByRole('button', { name: 'Listen to The Summoning' }))

    expect(screen.getByTitle('Spotify player: The Summoning by Sleep Token')).toHaveAttribute('src', expect.stringContaining('/embed/track/t1'))
    expect(screen.queryByTitle(/Granite/)).not.toBeInTheDocument()
  })

  it('plays real songs in the demo', async () => {
    backend.routes['GET /api/v1/spotify/me'] = NO_SESSION
    renderAt('/demo')
    const planets = within(await screen.findByRole('list', { name: 'Planets' }, { timeout: 4000 }))
    await userEvent.click(planets.getByRole('button', { name: 'Arctic Monkeys' }))

    await userEvent.click(within(panel()).getByRole('button', { name: 'Listen to Do I Wanna Know?' }))

    // Do I Wanna Know? on Spotify
    expect(screen.getByTitle('Spotify player: Do I Wanna Know? by Arctic Monkeys')).toHaveAttribute(
      'src',
      expect.stringContaining('/embed/track/5FVd6KXrgO9B3JPmC8OPst'),
    )
  })
})
