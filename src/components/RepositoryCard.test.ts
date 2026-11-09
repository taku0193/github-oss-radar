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
    expect(html).toContain('aria-label="GitHubで octo/radar を開く（新しいタブ）"')
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

  it('makes the saved state explicit and exposes an accessible toggle', async () => {
    const html = await renderToString(createSSRApp(RepositoryCard, { repository, bookmarked: true }))

    expect(html).toContain('aria-pressed="true"')
    expect(html).toContain('aria-label="octo/radarの保存を解除"')
    expect(html).toContain('保存済み')
  })

  it('shows ranking context without changing the cumulative star count', async () => {
    const html = await renderToString(createSSRApp(RepositoryCard, { repository, position: 2, dailyStars: 123.4 }))

    expect(html).toContain('順位 ')
    expect(html).toContain('2位')
    expect(html).toContain('公開後平均 123 スター / 日')
    expect(html).toContain('スター数 </span>1,234')
  })

  it('keeps the discovery page available when opening a GitHub repository', async () => {
    const html = await renderToString(createSSRApp(RepositoryCard, { repository }))

    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
    expect(html).toContain('（新しいタブ）')
  })

  it('shows dates in the same Japanese timezone as the ranking periods', async () => {
    const html = await renderToString(createSSRApp(RepositoryCard, {
      repository: { ...repository, createdAt: '2026-11-08T18:00:00Z' },
    }))

    expect(html).toContain('datetime="2026-11-08T18:00:00Z">2026/11/09')
  })
})
