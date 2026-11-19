import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { NO_SESSION, backend, installFakeBackend, renderAt } from './test/fakeBackend'

// A scene that can't start, e.g. the GPU refused a context
vi.mock('./galaxy/GalaxyScene', () => ({
  default: () => {
    throw new Error('Error creating WebGL context.')
  },
}))

const getContext = vi.mocked(HTMLCanvasElement.prototype.getContext)

beforeEach(() => {
  installFakeBackend()
  backend.routes['GET /api/v1/spotify/me'] = NO_SESSION
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

async function expectListView() {
  const list = within(await screen.findByRole('region', { name: 'Your galaxy' }, { timeout: 4000 }))
  expect(list.getByText(/can't draw the 3D galaxy/)).toBeInTheDocument()
  return list
}

describe('without 3D', () => {
  it('shows the demo as a list when the browser has no WebGL', async () => {
    getContext.mockImplementation(() => null)
    renderAt('/demo')

    const list = await expectListView()
    expect(list.getByRole('button', { name: /You/ })).toBeInTheDocument()
    expect(list.getByRole('button', { name: /Top tracks/ })).toBeInTheDocument()
    expect(list.getByRole('button', { name: /Mood nebula/ })).toBeInTheDocument()
    // The list has its own nebula entry, so the mood card steps aside
    expect(screen.queryByRole('region', { name: 'Galaxy mood' })).not.toBeInTheDocument()
  })

  it('opens the same panels from the list', async () => {
    getContext.mockImplementation(() => null)
    renderAt('/demo')
    const list = await expectListView()

    const entry = list.getByRole('button', { name: /Arctic Monkeys/ })
    await userEvent.click(entry)
    expect(entry).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { name: 'Arctic Monkeys' })).toHaveFocus()

    await userEvent.click(list.getByRole('button', { name: /Mood nebula/ }))
    expect(screen.getByText('Mood mix')).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    expect(list.getByRole('button', { name: /Mood nebula/ })).toHaveFocus()
  })

  it('falls back to the list when the 3D scene fails to start', async () => {
    renderAt('/demo')

    await expectListView()
    expect(screen.getByRole('button', { name: 'Connect Spotify' })).toBeInTheDocument()
  })
})
