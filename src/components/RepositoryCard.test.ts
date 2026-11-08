import { renderToString } from 'vue/server-renderer'
import { createSSRApp } from 'vue'
import { describe, expect, it } from 'vitest'
import type { Repository } from '../github'
import RepositoryCard from './RepositoryCard.vue'

const repository: Repository = {
  id: 42,
  owner: 'octo',
  name: 'radar',
  url: 'https://github.com/octo/radar',
  description: 'Find new projects.',
  stars: 1234,
  language: 'TypeScript',
  createdAt: '2026-10-21T10:30:00Z',
  updatedAt: '2026-11-05T09:00:00Z',
}

describe('RepositoryCard', () => {
  it('shows repository details and links to the GitHub page', async () => {
    const html = await renderToString(createSSRApp(RepositoryCard, { repository }))

    expect(html).toContain('href="https://github.com/octo/radar"')
    expect(html).toContain('aria-label="GitHubで octo/radar を開く"')
    expect(html).toContain('Find new projects.')
    expect(html).toContain('1,234')
    expect(html).toContain('TypeScript')
    expect(html).toContain('datetime="2026-10-21T10:30:00Z"')
    expect(html).toContain('datetime="2026-11-05T09:00:00Z"')
    expect(html).not.toContain('repo-rank')
  })

  it('shows fallback labels when GitHub has no description or language', async () => {
    const html = await renderToString(createSSRApp(RepositoryCard, {
      repository: { ...repository, description: null, language: null },
    }))

    expect(html).toContain('説明はありません')
    expect(html).toContain('言語未設定')
  })

  it('applies the repository language accent while keeping the language label readable', async () => {
    const html = await renderToString(createSSRApp(RepositoryCard, { repository }))

    expect(html).toContain('--language-color:#3178c6')
    expect(html).toContain('TypeScript')
  })

  it('keeps repositories without a language visually neutral', async () => {
    const html = await renderToString(createSSRApp(RepositoryCard, {
      repository: { ...repository, language: null },
    }))

    expect(html).toContain('--language-color:#8b949e')
    expect(html).toContain('言語未設定')
  })
})
