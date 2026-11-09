export interface BookmarkNote { note: string; tags: string[] }
type ReadStorage = Pick<Storage, 'getItem'>
type WriteStorage = Pick<Storage, 'getItem' | 'setItem'>
const storageKey = 'oss-radar:bookmark-notes'

export function readBookmarkNotes(storage: ReadStorage): Record<number, BookmarkNote> {
  let stored: unknown
  try { stored = JSON.parse(storage.getItem(storageKey) ?? '{}') } catch { return {} }
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {}
  const notes: Record<number, BookmarkNote> = {}
  for (const [key, value] of Object.entries(stored)) {
    if (!/^\d+$/.test(key) || !Number.isSafeInteger(Number(key)) || !value || typeof value !== 'object') continue
    const item = value as Partial<BookmarkNote>
    if (typeof item.note !== 'string' || !Array.isArray(item.tags)) continue
    notes[Number(key)] = { note: item.note.slice(0, 2000), tags: [...new Set(item.tags
      .filter((tag): tag is string => typeof tag === 'string' && Boolean(tag.trim()))
      .map((tag) => tag.trim().slice(0, 20)))].slice(0, 8) }
  }
  return notes
}

export function writeBookmarkNote(storage: WriteStorage, id: number, note: string, tagInput: string): Record<number, BookmarkNote> {
  const tags = [...new Set(tagInput.split(/[,、\n]/).map((tag) => tag.trim()).filter(Boolean))]
  if (!Number.isSafeInteger(id) || id < 0) throw new Error('リポジトリを確認できませんでした。')
  if (note.length > 2000) throw new Error('メモは2,000文字まで入力できます。')
  if (tags.length > 8 || tags.some((tag) => tag.length > 20)) throw new Error('タグは8個まで、1個20文字以内で入力してください。')
  const next = { ...readBookmarkNotes(storage) }
  if (note.trim() || tags.length) next[id] = { note: note.trim(), tags }
  else delete next[id]
  storage.setItem(storageKey, JSON.stringify(next))
  return next
}
