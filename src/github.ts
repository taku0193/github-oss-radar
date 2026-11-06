export const SEARCH_WINDOW_DAYS = 30
export const SEARCH_PAGE_SIZE = 24

export interface Repository {
  id: number
  owner: string
  name: string
  url: string
  description: string | null
  stars: number
  language: string | null
  createdAt: string
  updatedAt: string
}

interface SearchResult {
  repositories: Repository[]
  incomplete: boolean
}

interface GitHubRepository {
  id: number
  owner: { login: string }
  name: string
  html_url: string
  description: string | null
  stargazers_count: number
  language: string | null
  created_at: string
  updated_at: string
}

interface GitHubSearchResponse {
  items: GitHubRepository[]
  incomplete_results: boolean
}

export class GitHubSearchError extends Error {
  readonly kind: 'api' | 'rate-limit'
  readonly retryAt: number | null

  constructor(kind: GitHubSearchError['kind'], message: string, retryAt: number | null = null) {
    super(message)
    this.name = 'GitHubSearchError'
    this.kind = kind
    this.retryAt = retryAt
  }
}

export async function searchRepositories(
  fetcher: typeof fetch = fetch,
  now?: Date,
): Promise<SearchResult> {
  const cutoff = new Date((now?.getTime() ?? Date.now()) - SEARCH_WINDOW_DAYS * 86_400_000)
  const since = cutoff.toISOString().replace(/\.\d{3}Z$/, 'Z')
  const url = new URL('https://api.github.com/search/repositories')
  url.search = new URLSearchParams({
    q: `created:>=${since} is:public fork:false`,
    sort: 'stars',
    order: 'desc',
    per_page: String(SEARCH_PAGE_SIZE),
  }).toString()

  const response = await fetcher(url, { headers: { Accept: 'application/vnd.github+json' } })

  if (!response.ok) {
    throw await readSearchError(response, now?.getTime() ?? Date.now())
  }

  const body: GitHubSearchResponse | null = await response.json().catch(() => null)
  if (!Array.isArray(body?.items)) {
    throw new GitHubSearchError('api', 'GitHub Search returned an invalid response')
  }

  return {
    repositories: body.items.map((item) => ({
      id: item.id,
      owner: item.owner.login,
      name: item.name,
      url: item.html_url,
      description: item.description,
      stars: item.stargazers_count,
      language: item.language,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    })),
    incomplete: body.incomplete_results === true,
  }
}

async function readSearchError(response: Response, receivedAt: number): Promise<GitHubSearchError> {
  const remaining = response.headers.get('x-ratelimit-remaining')
  const retryAfter = response.headers.get('retry-after')
  const body: { message?: string } | null = response.status === 403
    ? await response.json().catch(() => null)
    : null

  const isRateLimited = response.status === 429 || (response.status === 403 && (
    remaining === '0' || retryAfter !== null || /rate limit/i.test(body?.message ?? '')
  ))

  if (!isRateLimited) {
    return new GitHubSearchError('api', `GitHub Search returned HTTP ${response.status}`)
  }

  const reset = response.headers.get('x-ratelimit-reset')
  let retryAt = null
  if (retryAfter !== null && /^\d+$/.test(retryAfter)) {
    retryAt = receivedAt + Number(retryAfter) * 1000
  } else if (remaining === '0' && reset !== null && /^\d+$/.test(reset)) {
    retryAt = Number(reset) * 1000
  }
  return new GitHubSearchError('rate-limit', 'GitHub API rate limit exceeded', retryAt)
}
