import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'
import RepositorySkeleton from './RepositorySkeleton.vue'

describe('RepositorySkeleton', () => {
  it('announces loading once while keeping placeholder cards out of the accessibility tree', async () => {
    const html = await renderToString(createSSRApp(RepositorySkeleton))
    expect(html.match(/role="status"/g)).toHaveLength(1)
    expect(html).toContain('GitHub からリポジトリを取得中…')
    expect(html).toContain('aria-hidden="true"')
    expect(html).not.toMatch(/<(a|button|input)\b/)
  })

  it('supports a smaller placeholder collection for related repositories', async () => {
    const html = await renderToString(createSSRApp(RepositorySkeleton, { count: 3, message: '似たリポジトリを探しています…' }))
    expect(html.match(/class="skeleton-card"/g)).toHaveLength(3)
    expect(html).toContain('似たリポジトリを探しています…')
  })
})
