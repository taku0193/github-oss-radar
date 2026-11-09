import { describe, expect, it } from 'vitest'
import { useSearchFilters } from './useSearchFilters'

describe('search filters', () => {
  it('combines a selected topic with submitted text and preserves it across ranking changes', () => {
    const filters = useSearchFilters()
    filters.selectTopic('cli')
    filters.keyword.value = 'editor'
    filters.applyDraft()
    filters.selectRanking('week')
    expect(filters.activeFilters.value).toEqual({ ranking: 'week', keyword: 'editor', language: '', topic: 'cli' })
    expect(filters.hasAppliedFilters.value).toBe(true)
    filters.removeCondition('topic')
    expect(filters.activeFilters.value.topic).toBeUndefined()
    expect(filters.activeFilters.value.keyword).toBe('editor')
  })

  it('restores a shared topic and clears it with all conditions', () => {
    const filters = useSearchFilters()
    filters.restoreFilters({ ranking: 'all', topic: 'developer-tools', language: 'Rust' })
    filters.removeCondition('all')
    expect(filters.activeFilters.value.topic).toBeUndefined()
    expect(filters.ranking.value).toBe('all')
  })

  it('starts with rising discovery and no text or language restriction', () => {
    const filters = useSearchFilters()
    expect(filters.ranking.value).toBe('rising')
    expect(filters.hasAppliedFilters.value).toBe(false)
    expect(filters.hasDraftChanges.value).toBe(false)
  })

  it('combines submitted keywords and language with the selected ranking', () => {
    const filters = useSearchFilters()
    filters.selectRanking('week')
    filters.keyword.value = '  editor  '
    filters.language.value = 'TypeScript'
    filters.applyDraft()

    expect(filters.activeFilters.value).toEqual({ ranking: 'week', keyword: 'editor', language: 'TypeScript' })
    expect(filters.hasDraftChanges.value).toBe(false)
  })

  it('keeps applied conditions when switching ranking without submitting a draft', () => {
    const filters = useSearchFilters()
    filters.keyword.value = 'markdown'
    filters.language.value = 'Rust'
    filters.applyDraft()
    filters.keyword.value = 'agent'
    filters.selectRanking('all')

    expect(filters.activeFilters.value).toEqual({ ranking: 'all', keyword: 'markdown', language: 'Rust' })
    expect(filters.keyword.value).toBe('agent')
    expect(filters.hasDraftChanges.value).toBe(true)
  })

  it('clears a language restriction using the applied keyword and keeps the ranking', () => {
    const filters = useSearchFilters()
    filters.selectRanking('today')
    filters.keyword.value = 'editor'
    filters.language.value = 'Ruby'
    filters.applyDraft()
    filters.keyword.value = 'unsubmitted'
    filters.removeCondition('language')

    expect(filters.activeFilters.value).toEqual({ ranking: 'today', keyword: 'editor', language: '' })
    expect(filters.keyword.value).toBe('editor')
  })

  it('clears text and language while retaining the explicitly selected ranking', () => {
    const filters = useSearchFilters()
    filters.selectRanking('month')
    filters.keyword.value = 'editor'
    filters.language.value = 'Python'
    filters.applyDraft()
    filters.removeCondition('all')

    expect(filters.activeFilters.value).toEqual({ ranking: 'month', keyword: '', language: '' })
    expect(filters.hasAppliedFilters.value).toBe(false)
    expect(filters.hasDraftChanges.value).toBe(false)
  })
})
