import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'
import CompareDialog from './CompareDialog.vue'

describe('CompareDialog', () => {
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
