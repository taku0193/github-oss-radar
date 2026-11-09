import { SEARCH_KEYWORD_LIMIT, type SearchFilters } from './github'
import { rankingOptions, type RankingMode } from './rankings'

type ReadStorage = Pick<Storage, 'getItem'>
type WriteStorage = Pick<Storage, 'getItem' | 'setItem'>
const lastKey = 'oss-radar:last-search'
const savedKey = 'oss-radar:saved-searches'
const keys = ['ranking', 'q', 'language', 'topic']
export interface SavedSearch { id: string; name: string; filters: SearchFilters }

export function normalizeSearch(value: unknown): SearchFilters {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const ranking = rankingOptions.some(({ value }) => value === source.ranking) ? source.ranking as RankingMode : 'rising'
  const clean = (value: unknown, limit: number) => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, limit) : ''
  const keyword = clean(source.keyword, SEARCH_KEYWORD_LIMIT)
  const language = clean(source.language, 64)
  const topic = clean(source.topic, 50).toLowerCase()
  return { ranking, ...(keyword ? { keyword } : {}), ...(language ? { language } : {}),
    ...(/^[a-z0-9][a-z0-9-]{0,49}$/.test(topic) ? { topic } : {}) }
}

export function parseSearchURL(value: string): SearchFilters {
  const params = new URL(value).searchParams
  return normalizeSearch({ ranking: params.get('ranking'), keyword: params.get('q'), language: params.get('language'), topic: params.get('topic') })
}

export function searchURL(base: string, filters: SearchFilters): string {
  const url = new URL(base)
  url.search = ''
  url.hash = ''
  const next = normalizeSearch(filters)
  url.searchParams.set('ranking', next.ranking!)
  if (next.keyword) url.searchParams.set('q', next.keyword)
  if (next.language) url.searchParams.set('language', next.language)
  if (next.topic) url.searchParams.set('topic', next.topic)
  return url.href
}

export function initialSearch(url: string, storage: ReadStorage): SearchFilters {
  if (keys.some((key) => new URL(url).searchParams.has(key))) return parseSearchURL(url)
  try { return normalizeSearch(JSON.parse(storage.getItem(lastKey) ?? '{}')) } catch { return { ranking: 'rising' } }
}

export function rememberSearch(storage: Pick<Storage, 'setItem'>, filters: SearchFilters) {
  storage.setItem(lastKey, JSON.stringify(normalizeSearch(filters)))
}

export function readSavedSearches(storage: ReadStorage): SavedSearch[] {
  let items: unknown
  try { items = JSON.parse(storage.getItem(savedKey) ?? '[]') } catch { return [] }
  if (!Array.isArray(items)) return []
  const saved = new Map<string, SavedSearch>()
  for (const item of items) {
    if (item && typeof item.id === 'string' && typeof item.name === 'string' && item.name.trim() && item.filters && typeof item.filters === 'object') {
      saved.set(item.id, { id: item.id, name: item.name.trim().slice(0, 40), filters: normalizeSearch(item.filters) })
    }
  }
  return [...saved.values()].slice(0, 12)
}

export function saveSearch(storage: WriteStorage, name: string, filters: SearchFilters, id: string = crypto.randomUUID()): SavedSearch[] {
  const saved = readSavedSearches(storage)
  const normalized = normalizeSearch(filters)
  const existing = saved.find((item) => JSON.stringify(item.filters) === JSON.stringify(normalized))
  if (!existing && saved.length >= 12) throw new Error('保存できる検索条件は12件までです。')
  if (!name.trim()) throw new Error('検索条件の名前を入力してください。')
  const next = [{ id: existing?.id ?? id, name: name.trim().slice(0, 40), filters: normalized }, ...saved.filter((item) => item.id !== existing?.id)]
  storage.setItem(savedKey, JSON.stringify(next))
  return next
}

export function removeSavedSearch(storage: WriteStorage, id: string): SavedSearch[] {
  const next = readSavedSearches(storage).filter((item) => item.id !== id)
  storage.setItem(savedKey, JSON.stringify(next))
  return next
}
