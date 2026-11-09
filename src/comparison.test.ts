import { describe, expect, it } from 'vitest'
import { useComparison } from './comparison'
import type { Repository } from './github'

const repo = (id: number): Repository => ({ id, owner: 'octo', name: `repo-${id}`,
  url: `https://github.com/octo/repo-${id}`, description: null, stars: 100,
  language: null, createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-09T00:00:00Z' })

describe('repository comparison', () => {
  it('selects and removes repositories by identity', () => {
    const comparison = useComparison()
    comparison.toggle(repo(1))
    comparison.toggle(repo(2))
    comparison.toggle({ ...repo(1) })
    expect(comparison.repositories.value.map(({ id }) => id)).toEqual([2])
    expect(comparison.canCompare.value).toBe(false)
  })

  it('requires two repositories and limits a comparison to three', () => {
    const comparison = useComparison()
    for (const id of [1, 2, 3, 4]) comparison.toggle(repo(id))
    expect(comparison.repositories.value.map(({ id }) => id)).toEqual([1, 2, 3])
    expect(comparison.canCompare.value).toBe(true)
    expect(comparison.full.value).toBe(true)
    comparison.clear()
    expect(comparison.repositories.value).toEqual([])
    expect(comparison.full.value).toBe(false)
  })
})
