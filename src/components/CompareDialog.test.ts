import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'
import CompareDialog from './CompareDialog.vue'
import { readBookmarks } from '../bookmarks'

describe('CompareDialog', () => {
  it('can compare an existing bookmark whose optional metadata is damaged', async () => {
    const repositories = readBookmarks({ getItem: () => JSON.stringify([{
      id: 1, owner: 'octo', name: 'legacy', url: 'https://github.com/octo/legacy',
      description: null, stars: 200, language: null,
      createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-09T00:00:00Z',
      topics: 'cli', license: { invalid: true },
    }]) })
    const html = await renderToString(createSSRApp(CompareDialog, { open: true, repositories }))

    expect(html).toContain('octo/legacy')
    expect(html).toContain('情報なし')
    expect(repositories[0]).toMatchObject({ topics: [], license: null })
  })

  it('compares the selected repositories and distinguishes missing license information', async () => {
    const repository = { id: 1, owner: 'octo', name: 'one', url: 'https://github.com/octo/one',
      description: '<script>unsafe</script>', stars: 1234, language: 'TypeScript',
      createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-09T00:00:00Z', license: 'MIT' }
    const html = await renderToString(createSSRApp(CompareDialog, { open: true,
      repositories: [repository, { ...repository, id: 2, name: 'two', license: null }] }))
    expect(html).toContain('選択したリポジトリの比較')
    expect(html).toContain('octo/one')
    expect(html).toContain('octo/two')
    expect(html).toContain('1,234')
    expect(html).toContain('MIT')
    expect(html).toContain('情報なし')
    expect(html).toContain('&lt;script&gt;unsafe&lt;/script&gt;')
    expect(html).not.toContain('<script>unsafe</script>')
  })
})
