import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { backend, galaxyPath, galaxyReply, installFakeBackend, moodPath, moon, planet, renderAt, topTracksPath, track, tracksReply } from './test/fakeBackend'

vi.mock('./galaxy/GalaxyScene', () => import('./test/FakeGalaxyScene'))

const SLEEP_TOKEN = planet(1, 'Sleep Token', {
  image_url: 'https://img.test/sleep-token.jpg',
  genres: ['metalcore', 'alt metal'],
  spotify_url: 'https://open.spotify.com/artist/st',
  moons: [moon('t2', 'Granite', 6), moon('t1', 'The Summoning', 1)],
})
const HIATUS = planet(2, 'Hiatus Kaiyote', { mood: 'Other', color: '#ADB5BD', genres: [], followers: null, moons: [] })

// #1 and #2 are moons of Sleep Token; #3 is by an artist outside the galaxy
const TOP_TRACKS = [
  track('t1', 'The Summoning', ['Sleep Token'], '2023-01-05'),
  track('t2', 'Granite', ['Sleep Token'], '2023-03'),
  track('t9', 'Dreams', ['Fleetwood Mac'], '1977'),
]

beforeEach(() => {
  installFakeBackend()
  backend.routes[galaxyPath()] = galaxyReply([SLEEP_TOKEN, HIATUS])
  backend.routes[topTracksPath()] = tracksReply(TOP_TRACKS)
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

describe('constellation', () => {
  it('opens your top tracks from the header button', async () => {
    await openGalaxy()
    await userEvent.click(await screen.findByRole('button', { name: 'Top tracks' }))

    const details = within(panel())
    expect(details.getByRole('heading', { name: 'Top tracks' })).toBeInTheDocument()
    const rows = details.getAllByRole('link', { name: /open in Spotify$/ })
    expect(rows.map((r) => r.getAttribute('aria-label'))).toEqual([
      '1. The Summoning, open in Spotify',
      '2. Granite, open in Spotify',
      '3. Dreams, open in Spotify',
    ])
    // Only the track whose artist has no planet is marked
    expect(rows[0]).not.toHaveTextContent('not in your top artists')
    expect(rows[2]).toHaveTextContent('Fleetwood Mac · not in your top artists')
    expect(screen.getByRole('button', { name: 'Top tracks' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('lights up a song across the galaxy while it is hovered', async () => {
    await openGalaxy()
    await userEvent.click(await screen.findByRole('button', { name: 'Top tracks' }))

    await userEvent.hover(within(panel()).getByRole('link', { name: '2. Granite, open in Spotify' }))
    expect(screen.getByTestId('scene')).toHaveAttribute('data-highlight', 't2')
  })

  it('clears the highlight when the panel closes under the pointer', async () => {
    await openGalaxy()
    await userEvent.click(await screen.findByRole('button', { name: 'Top tracks' }))
    await userEvent.hover(within(panel()).getByRole('link', { name: '2. Granite, open in Spotify' }))

    await userEvent.keyboard('{Escape}')
    expect(screen.getByTestId('scene')).toHaveAttribute('data-highlight', '')
  })

  it('opens the list at the star you clicked', async () => {
    await openGalaxy()
    await userEvent.click(await screen.findByRole('button', { name: 'Star 3: Dreams' }))

    expect(within(panel()).getByRole('link', { name: '3. Dreams, open in Spotify' })).toHaveClass('on')
    expect(screen.getByTestId('scene')).toHaveAttribute('data-highlight', 't9')
  })

  it('leaves the galaxy working if top tracks fail to load', async () => {
    backend.routes[topTracksPath()] = { status: 502, body: { detail: 'Spotify API error 503' } }
    const planets = await openGalaxy()

    expect(planets.getByRole('button', { name: 'Sleep Token' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Top tracks' })).not.toBeInTheDocument()
  })
})

describe('mood', () => {
  it('summarizes the mood mix in the corner card and tints the core', async () => {
    await openGalaxy()

    const card = within(await screen.findByRole('region', { name: 'Galaxy mood' }))
    expect(card.getByText('Aggressive', { selector: '.dominant' })).toHaveTextContent('56%')
    expect(card.getAllByRole('button', { name: /^Highlight/ })).toHaveLength(3)
    expect(card.getByText('Based on 2 of 3 artists with genre data')).toBeInTheDocument()
    expect(screen.getByTestId('scene')).toHaveAttribute('data-tint', '#E63946')
  })

  it('filters the galaxy to a mood while its row is hovered', async () => {
    await openGalaxy()
    const card = within(await screen.findByRole('region', { name: 'Galaxy mood' }))

    await userEvent.hover(card.getByRole('button', { name: /^Highlight Reflective/ }))
    expect(screen.getByTestId('scene')).toHaveAttribute('data-mood-filter', 'Reflective')
    await userEvent.unhover(card.getByRole('button', { name: /^Highlight Reflective/ }))
    expect(screen.getByTestId('scene')).toHaveAttribute('data-mood-filter', '')
  })

  it('opens the nebula panel with the full mix, genres and palette', async () => {
    await openGalaxy()
    await userEvent.click(await screen.findByRole('button', { name: 'Explore the mood nebula →' }))

    const details = within(panel())
    expect(details.getByRole('heading', { name: 'Aggressive' })).toBeInTheDocument()
    expect(details.getByText('Your dominant mood, 56% of your genre mix')).toBeInTheDocument()
    expect(details.getAllByRole('button', { name: /^Highlight/ })).toHaveLength(3)
    expect(details.getByText('metalcore')).toHaveTextContent('metalcore×2')
    expect(details.getByText('Primary')).toBeInTheDocument()
    expect(details.getByText('Background style: supernova · glow 0.9')).toBeInTheDocument()
  })

  it('also opens from the nebula in the sky', async () => {
    await openGalaxy()
    await userEvent.click(await screen.findByRole('button', { name: 'Nebula' }))

    expect(within(panel()).getByText(/Mood nebula/)).toBeInTheDocument()
  })

  it('leaves the galaxy working if the mood fails to load', async () => {
    backend.routes[moodPath()] = { status: 502, body: { detail: 'Spotify API error 503' } }
    await openGalaxy()

    expect(screen.queryByRole('region', { name: 'Galaxy mood' })).not.toBeInTheDocument()
    expect(screen.getByTestId('scene')).toHaveAttribute('data-tint', '')
  })
})

describe('musical era', () => {
  it('shows in the core panel from your top tracks\' release dates', async () => {
    await openGalaxy()
    await screen.findByRole('button', { name: 'Top tracks' })
    await userEvent.click(screen.getByRole('button', { name: 'Core' }))

    const details = within(panel())
    expect(details.getByText('Mostly the 2020s · oldest: Dreams (1977)')).toBeInTheDocument()
    expect(details.getByRole('list', { name: 'Top tracks by decade' })).toHaveTextContent('2020s21970s1')
    expect(details.getByText('Top 3 runtime').nextElementSibling).toHaveTextContent('12 min')
  })
})
