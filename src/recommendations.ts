import { searchRepositories, type Repository, type SearchFilters } from './github'

const recommendationLimit = 6

export async function recommendRepositories(
  seed: Repository,
  savedIds: ReadonlySet<number>,
  fetcher: typeof fetch = fetch,
  now = new Date(),
) {
  const topic = Array.isArray(seed.topics)
    ? seed.topics.find((entry) => typeof entry === 'string' && /^[a-z0-9][a-z0-9-]{0,49}$/.test(entry))
    : undefined

  async function findCandidates(filters: SearchFilters, reason: string) {
    const result = await searchRepositories(fetcher, now, filters)
    return {
      repositories: result.repositories
        .filter(({ id }) => id !== seed.id && !savedIds.has(id))
        .slice(0, recommendationLimit),
      reason,
      incomplete: result.incomplete,
    }
  }

  if (topic) {
    const result = await findCandidates({ topic }, `共通トピック「${topic}」`)
    if (result.repositories.length || !seed.language) return result
  }

  if (seed.language) {
    return findCandidates({ language: seed.language }, `同じ言語「${seed.language}」`)
  }

  return { repositories: [], reason: '', incomplete: false }
}
