import { describe, expect, it, vi } from 'vitest'
import { searchRepositories } from './github'

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
  it('requests the first 24 recent public non-forks by descending star count without a token', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ items: [item], incomplete_results: false }),
    )

    const result = await searchRepositories(fetcher, now)

    expect(fetcher).toHaveBeenCalledTimes(1)
    const [input, options] = fetcher.mock.calls[0]!
    const url = new URL(String(input))
    expect(url.origin + url.pathname).toBe('https://api.github.com/search/repositories')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      q: 'created:>=2026-10-07T15:30:00Z is:public fork:false',
      sort: 'stars',
      order: 'desc',
      per_page: '24',
    })
    const headers = new Headers(options?.headers)
    expect(headers.get('accept')).toBe('application/vnd.github+json')
    expect(headers.has('authorization')).toBe(false)
    expect(result).toEqual({
      repositories: [{
        id: 42,
        owner: 'octo',
        name: 'radar',
        url: 'https://github.com/octo/radar',
        description: 'Find new projects.',
        stars: 1234,
        language: 'TypeScript',
        createdAt: '2026-10-21T10:30:00Z',
        updatedAt: '2026-11-05T09:00:00Z',
      }],
      incomplete: false,
    })
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
    })
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
