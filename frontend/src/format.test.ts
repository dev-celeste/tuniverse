import { describe, expect, it } from 'vitest'

import { formatCount, formatDuration, initials } from './format'

describe('format', () => {
  it.each([
    [48, '48'],
    [1200, '1.2K'],
    [15000, '15K'],
    [4100000, '4.1M'],
    [4000000, '4M'],
    [33000000, '33M'],
  ])('formatCount(%i) = %s', (n, expected) => {
    expect(formatCount(n)).toBe(expected)
  })

  it('formats track lengths', () => {
    expect(formatDuration(230000)).toBe('3:50')
    expect(formatDuration(396000)).toBe('6:36')
    expect(formatDuration(65000)).toBe('1:05')
  })

  it('makes placeholder initials', () => {
    expect(initials('Phoebe Bridgers')).toBe('PB')
    expect(initials('SZA')).toBe('S')
    expect(initials('  Bon   Iver ')).toBe('BI')
  })
})
