import { describe, expect, it, vi } from 'vitest'
import { readBookmarks, setBookmarked } from './bookmarks'
import type { Repository } from './github'

const repository: Repository = {
  id: 42,
  owner: 'octo',
  name: 'radar',
  url: 'https://github.com/octo/radar',
  description: null,
  stars: 1234,
  language: 'TypeScript',
  createdAt: '2026-10-21T10:30:00Z',
  updatedAt: '2026-11-05T09:00:00Z',
}

function memoryStorage() {
  const entries = new Map<string, string>()
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => { entries.set(key, value) },
  }
}

describe('bookmarks', () => {
  it('saves the repository once and reads it back from storage', () => {
    const storage = memoryStorage()

    expect(readBookmarks(storage)).toEqual([])
    setBookmarked(storage, repository, true)
    setBookmarked(storage, { ...repository }, true)

    expect(readBookmarks(storage)).toEqual([repository])
  })

  it('removes only the selected repository from storage', () => {
    const storage = memoryStorage()
    const other = { ...repository, id: 43, name: 'other', url: 'https://github.com/octo/other' }
    setBookmarked(storage, repository, true)
    setBookmarked(storage, other, true)

    setBookmarked(storage, repository, false)

    expect(readBookmarks(storage)).toEqual([other])
  })

  it('keeps valid entries when stored data contains damaged entries', () => {
    const storage = { getItem: () => JSON.stringify([null, { ...repository, updatedAt: 'invalid' }, repository]) }

    expect(readBookmarks(storage)).toEqual([repository])
    expect(readBookmarks({ getItem: () => '{' })).toEqual([])
  })

  it('reports write failures and leaves the saved list intact', () => {
    const storage = memoryStorage()
    setBookmarked(storage, repository, true)
    const setItem = vi.fn(() => { throw new Error('Storage is full') })

    expect(() => setBookmarked({ ...storage, setItem }, repository, false)).toThrow('Storage is full')
    expect(readBookmarks(storage)).toEqual([repository])
  })
})
