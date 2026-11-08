export const SEARCH_WINDOW_DAYS = 30
export const SEARCH_PAGE_SIZE = 24
export const SEARCH_MIN_STARS = 100
export const SEARCH_KEYWORD_LIMIT = 100
const SEARCH_RESULT_LIMIT = 1000

export interface Repository {
  id: number
  owner: string
  avatarUrl?: string
  name: string
  url: string
  description: string | null
  stars: number
  language: string | null
  createdAt: string
  updatedAt: string
  topics?: string[]
}

export interface SearchResult {
  repositories: Repository[]
  incomplete: boolean
  nextPage: URL | null
}

export interface SearchFilters {
  keyword?: string
  language?: string
  topic?: string
}

interface GitHubRepository {
  id: number
  owner: { login: string; avatar_url?: string }
  name: string
  html_url: string
  description: string | null
  stargazers_count: number
  language: string | null
  created_at: string
  updated_at: string
  topics?: string[]
}

interface GitHubSearchResponse {
  items: GitHubRepository[]
  incomplete_results: boolean
  total_count?: number
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
  filters: SearchFilters = {},
): Promise<SearchResult> {
  const cutoff = new Date((now?.getTime() ?? Date.now()) - SEARCH_WINDOW_DAYS * 86_400_000)
  const since = cutoff.toISOString().replace(/\.\d{3}Z$/, 'Z')
  const terms = filters.keyword?.slice(0, SEARCH_KEYWORD_LIMIT).match(/[^\s:"\\]+/g) ?? []
  const language = filters.language?.replace(/["\\]/g, '').trim()
  const query = [
    ...terms.map((term) => `"${term}"`),
    terms.length && 'in:name,description',
    language && `language:"${language}"`,
    filters.topic && `topic:${filters.topic}`,
    `created:>=${since}`,
    `stars:>=${SEARCH_MIN_STARS}`,
    'is:public',
    'fork:false',
  ].filter(Boolean).join(' ')
  const url = new URL('https://api.github.com/search/repositories')
  url.search = new URLSearchParams({
    q: query,
    per_page: String(SEARCH_PAGE_SIZE),
  }).toString()

  return fetchRepositoryPage(url, fetcher, now)
}

export async function fetchRepositoryPage(
  url: URL,
  fetcher: typeof fetch = fetch,
  now?: Date,
): Promise<SearchResult> {
  const response = await fetcher(url, { headers: { Accept: 'application/vnd.github+json' } })

  if (!response.ok) {
    throw await readSearchError(response, now?.getTime() ?? Date.now())
  }

  const body: GitHubSearchResponse | null = await response.json().catch(() => null)
  if (!Array.isArray(body?.items)) {
    throw new GitHubSearchError('api', 'GitHub Search returned an invalid response')
  }

  const page = Number(url.searchParams.get('page') ?? 1)
  const pageSize = Number(url.searchParams.get('per_page') ?? SEARCH_PAGE_SIZE)
  const total = Math.min(body.total_count ?? body.items.length, SEARCH_RESULT_LIMIT)
  let nextPage = null
  if (body.items.length && page * pageSize < total) {
    nextPage = new URL(url)
    nextPage.searchParams.set('page', String(page + 1))
  }

  return {
    repositories: body.items.filter((item) => item.stargazers_count >= SEARCH_MIN_STARS).map((item) => ({
      id: item.id,
      owner: item.owner.login,
      avatarUrl: item.owner.avatar_url,
      name: item.name,
      url: item.html_url,
      description: item.description,
      stars: item.stargazers_count,
      language: item.language,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      topics: item.topics ?? [],
    })),
    incomplete: body.incomplete_results === true,
    nextPage,
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
