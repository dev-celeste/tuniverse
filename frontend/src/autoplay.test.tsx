import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { NO_SESSION, backend, installFakeBackend, renderAt } from './test/fakeBackend'

vi.mock('./galaxy/GalaxyScene', () => import('./test/FakeGalaxyScene'))

// Desktop, with a stand-in for Spotify's iFrame API that records what the app asks of it
const spotify = vi.hoisted(() => ({
  uris: [] as string[],
  played: [] as string[],
  destroyed: [] as string[],
  fail: false,
}))
vi.mock('./spotifyEmbed', () => ({
  canAutoplay: () => true,
  loadIframeApi: () =>
    spotify.fail
      ? Promise.reject(new Error('blocked'))
      : Promise.resolve({
          createController: (element: HTMLElement, { uri }: { uri: string }, callback: (c: unknown) => void) => {
            spotify.uris.push(uri)
            const iframe = document.createElement('iframe')
            element.replaceWith(iframe)
            callback({
              addListener: (event: string, listener: () => void) => {
                if (event === 'ready') setTimeout(listener, 0)
              },
              play: () => spotify.played.push(uri),
              destroy: () => spotify.destroyed.push(uri),
            })
          },
        }),
}))

beforeEach(() => {
  installFakeBackend()
  backend.routes['GET /api/v1/spotify/me'] = NO_SESSION
  spotify.uris = []
  spotify.played = []
  spotify.destroyed = []
  spotify.fail = false
})

const panel = () => document.querySelector<HTMLElement>('aside.panel')!

async function openArcticMonkeys() {
  renderAt('/demo')
  const planets = within(await screen.findByRole('list', { name: 'Planets' }, { timeout: 4000 }))
  await userEvent.click(planets.getByRole('button', { name: 'Arctic Monkeys' }))
}

describe('autoplay on desktop', () => {
  it('starts the song as soon as the player is ready', async () => {
    await openArcticMonkeys()
    await userEvent.click(within(panel()).getByRole('button', { name: 'Listen to Do I Wanna Know?' }))

    await vi.waitFor(() => expect(spotify.played).toEqual(['spotify:track:5FVd6KXrgO9B3JPmC8OPst']))
    expect(screen.getByTitle('Spotify player: Do I Wanna Know? by Arctic Monkeys')).toBeInTheDocument()
  })

  it('replaces the player when you pick another song', async () => {
    await openArcticMonkeys()
    await userEvent.click(within(panel()).getByRole('button', { name: 'Listen to Do I Wanna Know?' }))
    await vi.waitFor(() => expect(spotify.played).toHaveLength(1))

    await userEvent.click(within(panel()).getByRole('button', { name: 'Listen to 505' }))

    await vi.waitFor(() => expect(spotify.played).toEqual(['spotify:track:5FVd6KXrgO9B3JPmC8OPst', 'spotify:track:58ge6dfP91o9oXMzq3XkIS']))
    expect(spotify.destroyed).toContain('spotify:track:5FVd6KXrgO9B3JPmC8OPst')
    expect(document.querySelectorAll('.now-playing iframe')).toHaveLength(1)
  })

  it("falls back to the plain player if Spotify's script can't load", async () => {
    spotify.fail = true
    await openArcticMonkeys()
    await userEvent.click(within(panel()).getByRole('button', { name: 'Listen to Do I Wanna Know?' }))

    const player = await screen.findByTitle('Spotify player: Do I Wanna Know? by Arctic Monkeys')
    expect(player).toHaveAttribute('src', expect.stringContaining('/embed/track/5FVd6KXrgO9B3JPmC8OPst'))
  })
})
