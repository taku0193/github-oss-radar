import { describe, expect, it } from 'vitest'
import { readBookmarkNotes, writeBookmarkNote } from './bookmarkNotes'

function storage() {
  const values = new Map<string, string>()
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } }
}

describe('bookmark notes', () => {
  it('saves a note and deduplicated Japanese tags independently of existing bookmarks', () => {
    const local = storage()
    local.setItem('oss-radar:bookmarks', '[{"id":42}]')
    writeBookmarkNote(local, 42, '週末に試す', '試したい, CLI, 試したい')
    expect(readBookmarkNotes(local)[42]).toEqual({ note: '週末に試す', tags: ['試したい', 'CLI'] })
    expect(local.getItem('oss-radar:bookmarks')).toBe('[{"id":42}]')
  })

  it('clears only an empty note entry while preserving notes on other repositories', () => {
    const local = storage()
    writeBookmarkNote(local, 42, 'first', '導入候補')
    writeBookmarkNote(local, 43, 'second', '調査済み')
    writeBookmarkNote(local, 42, '', '')
    expect(readBookmarkNotes(local)).toEqual({ 43: { note: 'second', tags: ['調査済み'] } })
  })

  it('keeps valid notes when other persisted entries are malformed', () => {
    const local = { getItem: () => '{"42":{"note":"safe","tags":["試したい"]},"bad":null,"43":{"note":12,"tags":[]}}' }
    expect(readBookmarkNotes(local)).toEqual({ 42: { note: 'safe', tags: ['試したい'] } })
    expect(readBookmarkNotes({ getItem: () => '{' })).toEqual({})
  })

  it('rejects overlong notes and too many tags without losing saved data', () => {
    const local = storage()
    writeBookmarkNote(local, 42, 'keep', '試したい')
    expect(() => writeBookmarkNote(local, 42, 'x'.repeat(2001), '')).toThrow()
    expect(() => writeBookmarkNote(local, 42, 'keep', Array.from({ length: 9 }, (_, i) => `tag${i}`).join(','))).toThrow()
    expect(readBookmarkNotes(local)[42]?.note).toBe('keep')
  })

  it('propagates storage failures and preserves the previous note', () => {
    const local = storage()
    writeBookmarkNote(local, 42, 'keep', '')
    expect(() => writeBookmarkNote({ ...local, setItem: () => { throw new Error('quota') } }, 42, 'new', '')).toThrow('quota')
    expect(readBookmarkNotes(local)[42]?.note).toBe('keep')
  })
})
