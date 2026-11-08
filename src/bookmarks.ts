import type { Repository } from './github'

const storageKey = 'oss-radar:bookmarks'

function isRepository(value: unknown): value is Repository {
  if (typeof value !== 'object' || value === null) return false
  const repository = value as Partial<Repository>
  return typeof repository.id === 'number' && Number.isSafeInteger(repository.id)
    && typeof repository.owner === 'string'
    && typeof repository.name === 'string'
    && typeof repository.url === 'string' && repository.url.startsWith('https://github.com/')
    && (repository.description === null || typeof repository.description === 'string')
    && typeof repository.stars === 'number' && Number.isFinite(repository.stars)
    && (repository.language === null || typeof repository.language === 'string')
    && typeof repository.createdAt === 'string' && Number.isFinite(Date.parse(repository.createdAt))
    && typeof repository.updatedAt === 'string' && Number.isFinite(Date.parse(repository.updatedAt))
}

export function readBookmarks(storage: Pick<Storage, 'getItem'>): Repository[] {
  const stored = storage.getItem(storageKey)
  if (!stored) return []

  let items: unknown
  try {
    items = JSON.parse(stored)
  } catch {
    return []
  }
  if (!Array.isArray(items)) return []

  const repositories = new Map<number, Repository>()
  for (const item of items) {
    if (isRepository(item)) repositories.set(item.id, item)
  }
  return [...repositories.values()]
}

export function setBookmarked(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  repository: Repository,
  bookmarked: boolean,
): Repository[] {
  const saved = readBookmarks(storage)
  const others = saved.filter(({ id }) => id !== repository.id)
  const alreadyBookmarked = others.length !== saved.length
  if (bookmarked === alreadyBookmarked) return saved

  const next = bookmarked ? [repository, ...others] : others
  storage.setItem(storageKey, JSON.stringify(next))
  return next
}
