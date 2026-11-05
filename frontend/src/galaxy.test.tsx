import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { backend, galaxyPath, galaxyReply, installFakeBackend, moon, planet, renderAt } from './test/fakeBackend'

vi.mock('./galaxy/GalaxyScene', () => import('./test/FakeGalaxyScene'))

const SLEEP_TOKEN = planet(1, 'Sleep Token', {
  image_url: 'https://img.test/sleep-token.jpg',
  genres: ['metalcore', 'alt metal'],
  spotify_url: 'https://open.spotify.com/artist/st',
  moons: [moon('t2', 'Granite', 6), moon('t1', 'The Summoning', 1)],
})
const HIATUS = planet(2, 'Hiatus Kaiyote', { mood: 'Other', color: '#ADB5BD', genres: [], followers: null, moons: [] })

beforeEach(() => {
  installFakeBackend()
  backend.routes[galaxyPath()] = galaxyReply([SLEEP_TOKEN, HIATUS])
})

async function openGalaxy() {
  renderAt('/galaxy')
  return within(await screen.findByRole('list', { name: 'Planets' }))
}

// Found directly: a closed panel is inert, so role queries rightly skip it
const panel = () => document.querySelector<HTMLElement>('aside.panel')!

describe('visiting a planet', () => {
  it('opens the artist panel with photo, stats, genres and tracks', async () => {
    const planets = await openGalaxy()
    await userEvent.click(planets.getByRole('button', { name: 'Sleep Token' }))

    const details = within(panel())
    expect(details.getByRole('heading', { name: 'Sleep Token' })).toBeInTheDocument()
    expect(details.getByRole('img', { name: 'Photo of Sleep Token' })).toHaveAttribute('src', 'https://img.test/sleep-token.jpg')
    expect(details.getByText('4.1M')).toBeInTheDocument()
    expect(details.getByText('metalcore · alt metal')).toBeInTheDocument()

    // Tracks in top-tracks order, each linking to Spotify
    const tracks = details.getAllByRole('link', { name: /open in Spotify$/ })
    expect(tracks.map((t) => t.textContent)).toEqual([
      expect.stringContaining('The Summoning'),
      expect.stringContaining('Granite'),
    ])
    expect(tracks[0]).toHaveAttribute('href', 'https://open.spotify.com/track/t1')
    expect(details.getByRole('link', { name: 'Open Sleep Token in Spotify ↗' })).toBeInTheDocument()
  })

  it('handles an artist with no genres, followers or tracks', async () => {
    const planets = await openGalaxy()
    await userEvent.click(planets.getByRole('button', { name: 'Hiatus Kaiyote' }))

    const details = within(panel())
    expect(details.getByRole('img', { name: 'Photo of Hiatus Kaiyote' })).toHaveTextContent('HK')
    expect(details.queryByText('Followers')).not.toBeInTheDocument()
    expect(details.getByText(/no genres for this artist/)).toBeInTheDocument()
    expect(details.getByText(/None of their songs are in your top 50/)).toBeInTheDocument()
  })

  it('lights up a moon while its track is hovered', async () => {
    const planets = await openGalaxy()
    await userEvent.click(planets.getByRole('button', { name: 'Sleep Token' }))

    await userEvent.hover(within(panel()).getByRole('link', { name: 'Granite, open in Spotify' }))
    expect(screen.getByTestId('scene')).toHaveAttribute('data-highlight', 't2')
    await userEvent.unhover(within(panel()).getByRole('link', { name: 'Granite, open in Spotify' }))
    expect(screen.getByTestId('scene')).toHaveAttribute('data-highlight', '')
  })

  it('closes with Esc or the back button', async () => {
    const planets = await openGalaxy()

    await userEvent.click(planets.getByRole('button', { name: 'Sleep Token' }))
    await userEvent.keyboard('{Escape}')
    expect(panel()).toHaveClass('closed')

    await userEvent.click(planets.getByRole('button', { name: 'Sleep Token' }))
    expect(panel()).not.toHaveClass('closed')
    await userEvent.click(within(panel()).getByRole('button', { name: /Galaxy/ }))
    expect(panel()).toHaveClass('closed')
  })
})

describe('visiting the core', () => {
  it('shows your profile and galaxy stats', async () => {
    await openGalaxy()
    await userEvent.click(screen.getByRole('button', { name: 'Core' }))

    const details = within(panel())
    expect(details.getByRole('heading', { name: 'Celeste' })).toBeInTheDocument()
    expect(details.getByRole('img', { name: 'Your Spotify profile photo' })).toHaveTextContent('C')
    expect(details.getByText('Planets').nextElementSibling).toHaveTextContent('2 artists')
    expect(details.getByText('Moons').nextElementSibling).toHaveTextContent('2 tracks')
    expect(details.getByRole('link', { name: 'Open your Spotify profile ↗' })).toHaveAttribute('href', 'https://open.spotify.com/user/me')
  })
})

describe('time range', () => {
  it('loads the chosen range and re-forms the galaxy', async () => {
    backend.routes[galaxyPath('short_term')] = galaxyReply([planet(1, 'Fred again..', { id: 'fa' })], 'short_term')
    await openGalaxy()

    await userEvent.click(screen.getByRole('radio', { name: '4 weeks' }))

    expect(screen.getByRole('radio', { name: '4 weeks' })).toHaveAttribute('aria-checked', 'true')
    expect(await screen.findByRole('button', { name: 'Fred again..' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sleep Token' })).not.toBeInTheDocument()
    expect(backend.calls).toContain(galaxyPath('short_term'))
  })

  it('closes the panel when the visited artist drops out of the new range', async () => {
    backend.routes[galaxyPath('long_term')] = galaxyReply([planet(1, 'Bon Iver', { id: 'bi' })], 'long_term')
    const planets = await openGalaxy()
    await userEvent.click(planets.getByRole('button', { name: 'Sleep Token' }))

    await userEvent.click(screen.getByRole('radio', { name: 'All time' }))

    await screen.findByRole('button', { name: 'Bon Iver' })
    await waitFor(() => expect(panel()).toHaveClass('closed'))
  })
})
