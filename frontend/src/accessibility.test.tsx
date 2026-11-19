import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { backend, galaxyPath, galaxyReply, installFakeBackend, planet, renderAt } from './test/fakeBackend'

vi.mock('./galaxy/GalaxyScene', () => import('./test/FakeGalaxyScene'))

beforeEach(() => {
  installFakeBackend()
  backend.routes[galaxyPath()] = galaxyReply([planet(1, 'Sleep Token'), planet(2, 'Phoebe Bridgers')])
})

async function openGalaxy() {
  renderAt('/galaxy')
  return within(await screen.findByRole('list', { name: 'Planets' }, { timeout: 4000 }))
}

describe('keyboard and screen reader focus', () => {
  it('moves focus into the panel when a view opens, and back when Esc closes it', async () => {
    const planets = await openGalaxy()
    const opener = planets.getByRole('button', { name: 'Sleep Token' })

    await userEvent.click(opener)
    expect(screen.getByRole('heading', { name: 'Sleep Token' })).toHaveFocus()

    await userEvent.keyboard('{Escape}')
    expect(opener).toHaveFocus()
  })

  it('returns focus from the back button too', async () => {
    const planets = await openGalaxy()
    const opener = planets.getByRole('button', { name: 'Phoebe Bridgers' })

    await userEvent.click(opener)
    await userEvent.click(screen.getByRole('button', { name: /Galaxy/ }))

    expect(opener).toHaveFocus()
  })

  it('keeps focus in the panel when switching from one view to another', async () => {
    const planets = await openGalaxy()

    await userEvent.click(planets.getByRole('button', { name: 'Sleep Token' }))
    await userEvent.click(screen.getByRole('button', { name: 'Core' }))

    expect(screen.getByRole('heading', { name: 'Celeste' })).toHaveFocus()
  })
})
