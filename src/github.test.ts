import { describe, expect, it, vi } from 'vitest'
import { fetchRepositoryPage, searchRepositories } from './github'
import { recommendRepositories } from './recommendations'

const now = new Date('2026-11-06T15:30:00Z')

const item = {
  id: 42,
  owner: { login: 'octo' },
  name: 'radar',
  html_url: 'https://github.com/octo/radar',
  description: 'Find new projects.',
  stargazers_count: 1234,
  language: 'TypeScript',
  created_at: '2026-10-21T10:30:00Z',
  updated_at: '2026-11-05T09:00:00Z',
}

describe('searchRepositories', () => {
  it('applies a single topic and rejects qualifier injection through custom topics', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => Response.json({ items: [] }))
    await searchRepositories(fetcher, now, { topic: 'cli', ranking: 'all' })
    expect(new URL(String(fetcher.mock.calls[0]![0])).searchParams.get('q')).toContain('topic:cli')
    await searchRepositories(fetcher, now, { topic: 'cli stars:0', ranking: 'all' })
    const query = new URL(String(fetcher.mock.calls[1]![0])).searchParams.get('q')!
    expect(query).not.toContain('topic:')
    expect(query).not.toContain('stars:0')
    expect(query).toContain('stars:>=100')
  })
  it('includes detected licenses for comparison without inventing a license for missing data', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ items: [
      { ...item, license: { spdx_id: 'MIT', name: 'MIT License' } },
      { ...item, id: 43, license: { spdx_id: 'NOASSERTION', name: 'Other' } },
      { ...item, id: 44, license: null },
    ] }))
    const result = await searchRepositories(fetcher, now)
    expect(result.repositories.map(({ license }) => license)).toEqual(['MIT', null, null])
  })
  it.each([
    ['today', '2026-11-06T15:00:00Z'],
    ['week', '2026-11-01T15:00:00Z'],
    ['month', '2026-10-31T15:00:00Z'],
  ] as const)('filters %s by creation date in Japan and sorts by stars', async (ranking, cutoff) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ items: [item] }))

    await searchRepositories(fetcher, now, { ranking, keyword: 'editor', language: 'Rust' })

    const url = new URL(String(fetcher.mock.calls[0]![0]))
    expect(url.searchParams.get('q')).toContain(`created:>=${cutoff}`)
    expect(url.searchParams.get('q')).toContain('"editor" in:name,description language:"Rust"')
    expect(url.searchParams.get('q')).toContain('stars:>=100 is:public fork:false')
    expect(url.searchParams.get('sort')).toBe('stars')
    expect(url.searchParams.get('order')).toBe('desc')
  })

  it('searches all-time rankings without the previous 30-day creation restriction', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ items: [item], total_count: 100 }))

    const result = await searchRepositories(fetcher, now, { ranking: 'all' })

    const url = new URL(String(fetcher.mock.calls[0]![0]))
    expect(url.searchParams.get('q')).not.toContain('created:')
    expect(url.searchParams.get('sort')).toBe('stars')
    expect(result.nextPage?.searchParams.get('sort')).toBe('stars')
    expect(result.nextPage?.searchParams.get('order')).toBe('desc')
    expect(result.nextPage?.searchParams.get('page')).toBe('2')
  })

  it('fetches rising candidates once and sorts the whole set by average daily stars', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({
      items: [
        { ...item, id: 1, stargazers_count: 900, created_at: '2026-10-28T15:30:00Z' },
        { ...item, id: 2, stargazers_count: 400, created_at: '2026-11-05T15:30:00Z' },
      ], total_count: 500,
    }))

    const result = await searchRepositories(fetcher, now, { ranking: 'rising' })

    const url = new URL(String(fetcher.mock.calls[0]![0]))
    expect(url.searchParams.get('q')).toContain('created:>=2026-10-07T15:30:00Z')
    expect(url.searchParams.get('per_page')).toBe('100')
    expect(result.repositories.map(({ id }) => id)).toEqual([2, 1])
    expect(result.nextPage).toBeNull()
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('requests recent public non-forks with at least 100 stars in GitHub search order', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        items: [{ ...item, id: 7, stargazers_count: 100 }, item, { ...item, id: 8, stargazers_count: 99 }],
        incomplete_results: false,
      }),
    )

    const result = await searchRepositories(fetcher, now)

    expect(fetcher).toHaveBeenCalledTimes(1)
    const [input, options] = fetcher.mock.calls[0]!
    const url = new URL(String(input))
    expect(url.origin + url.pathname).toBe('https://api.github.com/search/repositories')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      q: 'created:>=2026-10-07T15:30:00Z stars:>=100 is:public fork:false',
      per_page: '24',
    })
    const headers = new Headers(options?.headers)
    expect(headers.get('accept')).toBe('application/vnd.github+json')
    expect(headers.has('authorization')).toBe(false)
    expect(result.repositories.map(({ id }) => id)).toEqual([7, 42])
    expect(result.repositories[1]).toEqual({
      id: 42,
      owner: 'octo',
      name: 'radar',
      url: 'https://github.com/octo/radar',
      description: 'Find new projects.',
      stars: 1234,
      language: 'TypeScript',
      createdAt: '2026-10-21T10:30:00Z',
      updatedAt: '2026-11-05T09:00:00Z',
      topics: [],
      license: null,
    })
    expect(result.incomplete).toBe(false)
  })

  it('treats a keyword as search text and applies the selected language', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ items: [] }))

    await searchRepositories(fetcher, now, { keyword: ' markdown  editor ', language: 'TypeScript' })

    const [input] = fetcher.mock.calls[0]!
    expect(new URL(String(input)).searchParams.get('q')).toBe(
      '"markdown" "editor" in:name,description language:"TypeScript" created:>=2026-10-07T15:30:00Z stars:>=100 is:public fork:false',
    )
  })

  it('preserves missing descriptions and languages and flags incomplete results', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({
      items: [{ ...item, description: null, language: null }],
      incomplete_results: true,
    }))

    const result = await searchRepositories(fetcher, now)

    expect(result.repositories[0]).toMatchObject({ description: null, language: null })
    expect(result.incomplete).toBe(true)
  })

  it('returns an empty list when GitHub finds no matches', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ items: [], incomplete_results: false }),
    )

    await expect(searchRepositories(fetcher, now)).resolves.toEqual({
      repositories: [],
      incomplete: false,
      nextPage: null,
    })
  })

  it('continues with the same query and stops when it reaches the reported total', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ items: [item], total_count: 25 }))
      .mockResolvedValueOnce(Response.json({ items: [{ ...item, id: 43 }], total_count: 25 }))

    const first = await searchRepositories(fetcher, now, { keyword: 'markdown', language: 'TypeScript' })
    expect(first.nextPage?.searchParams.get('page')).toBe('2')
    expect(first.nextPage?.searchParams.get('q')).toBe(new URL(String(fetcher.mock.calls[0]?.[0])).searchParams.get('q'))

    const second = await fetchRepositoryPage(first.nextPage!, fetcher, now)
    expect(second.repositories.map(({ id }) => id)).toEqual([43])
    expect(second.nextPage).toBeNull()
  })

  it('stops paging after the GitHub Search limit', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ items: [item], total_count: 2000 }))
    const url = new URL('https://api.github.com/search/repositories?per_page=24&page=42')

    await expect(fetchRepositoryPage(url, fetcher, now)).resolves.toMatchObject({ nextPage: null })
  })

  it('recommends unsaved repositories with a shared topic', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ items: [{ ...item, topics: ['markdown'] }] }))
      .mockResolvedValueOnce(Response.json({ items: [item, { ...item, id: 43 }, { ...item, id: 44 }] }))
    const seed = (await searchRepositories(fetcher, now)).repositories[0]!

    const result = await recommendRepositories(seed, new Set([43]), fetcher, now)

    expect(result.reason).toBe('共通トピック「markdown」')
    expect(result.repositories.map(({ id }) => id)).toEqual([44])
    expect(new URL(String(fetcher.mock.calls[1]?.[0])).searchParams.get('q')).toContain('topic:markdown')
  })

  it('recommends by language for bookmarks saved without topics', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ items: [{ ...item, id: 43 }] }))
    const seed = {
      id: 42, name: 'radar', owner: 'octo', url: item.html_url,
      stars: 1234, language: 'TypeScript', description: null,
      createdAt: item.created_at, updatedAt: item.updated_at,
    }

    const result = await recommendRepositories(seed, new Set(), fetcher, now)

    expect(result.reason).toBe('同じ言語「TypeScript」')
    expect(result.repositories).toHaveLength(1)
    expect(new URL(String(fetcher.mock.calls[0]?.[0])).searchParams.get('q')).toContain('language:"TypeScript"')
  })

  it('tries the same language when every result for the topic is already saved', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ items: [{ ...item, topics: ['markdown'] }] }))
      .mockResolvedValueOnce(Response.json({ items: [{ ...item, id: 43 }] }))
      .mockResolvedValueOnce(Response.json({ items: [{ ...item, id: 44 }] }))
    const seed = (await searchRepositories(fetcher, now)).repositories[0]!

    const result = await recommendRepositories(seed, new Set([43]), fetcher, now)

    expect(result.reason).toBe('同じ言語「TypeScript」')
    expect(result.repositories.map(({ id }) => id)).toEqual([44])
  })

  it('distinguishes the primary rate limit and exposes the reset time', async () => {
    const resetAt = Date.parse('2026-11-06T15:30:45Z')
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({}, {
      status: 403,
      headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(resetAt / 1000) },
    }))

    await expect(searchRepositories(fetcher, now)).rejects.toMatchObject({
      kind: 'rate-limit',
      retryAt: resetAt,
    })
  })

  it('uses Retry-After in seconds for HTTP 429', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, {
      status: 429,
      headers: { 'retry-after': '20' },
    }))

    await expect(searchRepositories(fetcher, now)).rejects.toMatchObject({
      kind: 'rate-limit',
      retryAt: now.getTime() + 20_000,
    })
  })

  it('detects a secondary limit from the GitHub message when only CORS-exposed headers are available', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({
      message: 'You have exceeded a secondary rate limit.',
    }, { status: 403 }))

    await expect(searchRepositories(fetcher, now)).rejects.toMatchObject({
      kind: 'rate-limit',
      retryAt: null,
    })
  })

  it.each([403, 503])('treats HTTP %s without rate-limit signals as an API error', async (status) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({}, { status }))

    await expect(searchRepositories(fetcher, now)).rejects.toMatchObject({ kind: 'api' })
  })

  it('rejects network errors', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(searchRepositories(fetcher, now)).rejects.toThrow('Failed to fetch')
  })

  it('treats an invalid result payload as an API error instead of an empty list', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ items: null }))

    await expect(searchRepositories(fetcher, now)).rejects.toMatchObject({ kind: 'api' })
  })
})
