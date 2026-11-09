import { describe, expect, it } from 'vitest'
import { rankingSince, risingScore, sortRising, type RankingMode } from './rankings'
import type { Repository } from './github'

const now = new Date('2026-11-06T15:30:00Z') // November 7, 00:30 in Japan.
const repository: Repository = {
  id: 1, owner: 'octo', name: 'radar', url: 'https://github.com/octo/radar',
  description: null, language: null, stars: 900,
  createdAt: '2026-10-28T15:30:00Z', updatedAt: now.toISOString(),
}

describe('ranking periods', () => {
  it.each<[RankingMode, string | null]>([
    ['today', '2026-11-06T15:00:00.000Z'],
    ['week', '2026-11-01T15:00:00.000Z'],
    ['month', '2026-10-31T15:00:00.000Z'],
    ['rising', '2026-10-07T15:30:00.000Z'],
    ['all', null],
  ])('uses the correct creation cutoff for %s', (mode, expected) => {
    expect(rankingSince(mode, now)?.toISOString() ?? null).toBe(expected)
  })

  it('starts a new week at Monday midnight in Japan even when UTC is still Sunday', () => {
    expect(rankingSince('week', new Date('2026-11-08T15:00:00Z'))?.toISOString())
      .toBe('2026-11-08T15:00:00.000Z')
  })

  it('handles month and year boundaries independently of the computer timezone', () => {
    expect(rankingSince('month', new Date('2027-01-01T00:00:00Z'))?.toISOString())
      .toBe('2026-12-31T15:00:00.000Z')
  })
})

describe('rising ranking', () => {
  it('compares stars per day with a minimum age of one day', () => {
    expect(risingScore(repository, now)).toBe(100)
    expect(risingScore({ ...repository, stars: 150, createdAt: now.toISOString() }, now)).toBe(150)
  })

  it('orders the complete candidate set before pagination without mutating it', () => {
    const candidates = [repository, {
      ...repository, id: 2, stars: 400, createdAt: '2026-11-05T15:30:00Z',
    }]

    expect(sortRising(candidates, now).map(({ id }) => id)).toEqual([2, 1])
    expect(candidates.map(({ id }) => id)).toEqual([1, 2])
  })

  it('uses star count to break equal scores and puts invalid creation dates last', () => {
    expect(sortRising([
      { ...repository, id: 3, stars: 1000, createdAt: 'invalid' },
      { ...repository, id: 2, stars: 100, createdAt: now.toISOString() },
      repository,
    ], now).map(({ id }) => id)).toEqual([1, 2, 3])
  })
})
