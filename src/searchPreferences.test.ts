import { describe, expect, it } from 'vitest'
import { initialSearch, parseSearchURL, searchURL, readSavedSearches, saveSearch, removeSavedSearch, rememberSearch } from './searchPreferences'

function storage() {
  const values = new Map<string, string>()
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } }
}

describe('search persistence and sharing', () => {
  it('round-trips Japanese keywords, C++, topic, and ranking through a share URL', () => {
    const filters = { ranking: 'week' as const, keyword: '日本語 editor', language: 'C++', topic: 'cli' }
    const url = searchURL('https://radar.example/?token=private#old', filters)
    expect(parseSearchURL(url)).toEqual(filters)
    expect(url).not.toContain('token=')
    expect(url).not.toContain('#old')
  })

  it('restores the last search but gives explicit shared URL conditions priority', () => {
    const local = storage()
    rememberSearch(local, { ranking: 'all', language: 'Python' })
    expect(initialSearch('https://radar.example/', local)).toEqual({ ranking: 'all', language: 'Python' })
    expect(initialSearch('https://radar.example/?ranking=month&q=editor', local))
      .toEqual({ ranking: 'month', keyword: 'editor' })
    expect(parseSearchURL('https://radar.example/')).toEqual({ ranking: 'rising' })
  })

  it('rejects invalid ranking and topic qualifiers and bounds user-controlled strings', () => {
    const url = new URL('https://radar.example/')
    url.searchParams.set('ranking', '__proto__')
    url.searchParams.set('topic', 'cli stars:0')
    url.searchParams.set('q', 'x'.repeat(150))
    expect(parseSearchURL(url.href)).toEqual({ ranking: 'rising', keyword: 'x'.repeat(100) })
  })

  it('handles corrupt persisted data without preventing discovery', () => {
    const local = { getItem: () => '{broken' }
    expect(initialSearch('https://radar.example/', local)).toEqual({ ranking: 'rising' })
    expect(readSavedSearches(local)).toEqual([])
  })

  it('saves conditions, updates duplicates, and removes only the selected saved search', () => {
    const local = storage()
    saveSearch(local, 'Python tools', { ranking: 'all', language: 'Python' }, 'first')
    saveSearch(local, 'Renamed', { language: 'Python', ranking: 'all' }, 'duplicate')
    saveSearch(local, 'This week', { ranking: 'week' }, 'second')
    expect(readSavedSearches(local)).toHaveLength(2)
    expect(readSavedSearches(local).find(({ id }) => id === 'first')?.name).toBe('Renamed')
    removeSavedSearch(local, 'second')
    expect(readSavedSearches(local).map(({ id }) => id)).toEqual(['first'])
  })

  it('leaves existing saved searches intact if writing fails', () => {
    const local = storage()
    saveSearch(local, 'Python', { language: 'Python' }, 'first')
    const blocked = { ...local, setItem: () => { throw new Error('quota') } }
    expect(() => saveSearch(blocked, 'Rust', { language: 'Rust' }, 'second')).toThrow('quota')
    expect(readSavedSearches(local)).toHaveLength(1)
  })
})
