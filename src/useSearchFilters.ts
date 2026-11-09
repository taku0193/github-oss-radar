import { computed, ref, shallowRef } from 'vue'
import type { SearchFilters } from './github'
import type { RankingMode } from './rankings'
import { normalizeTopic } from './topics'

export function useSearchFilters() {
  const keyword = ref('')
  const language = ref('')
  const activeFilters = shallowRef<SearchFilters>({ ranking: 'rising' })
  const ranking = computed(() => activeFilters.value.ranking ?? 'rising')
  const hasAppliedFilters = computed(() => Boolean(activeFilters.value.keyword || activeFilters.value.language || activeFilters.value.topic))
  const hasDraftChanges = computed(() => keyword.value.trim() !== (activeFilters.value.keyword ?? '')
    || language.value !== (activeFilters.value.language ?? ''))

  function applyDraft() {
    activeFilters.value = { ranking: ranking.value, keyword: keyword.value.trim(), language: language.value,
      ...(activeFilters.value.topic ? { topic: activeFilters.value.topic } : {}) }
  }

  function selectRanking(value: RankingMode) {
    activeFilters.value = { ...activeFilters.value, ranking: value }
  }

  function restoreFilters(filters: SearchFilters) {
    activeFilters.value = { ...filters, ranking: filters.ranking ?? 'rising' }
    keyword.value = filters.keyword ?? ''
    language.value = filters.language ?? ''
  }

  function selectTopic(value: string) {
    const next = { ...activeFilters.value }
    delete next.topic
    const topic = normalizeTopic(value)
    activeFilters.value = { ...next, ...(topic ? { topic } : {}) }
  }

  function removeCondition(condition: 'keyword' | 'language' | 'topic' | 'all') {
    if (condition === 'topic' || condition === 'all') selectTopic('')
    keyword.value = condition === 'keyword' || condition === 'all' ? '' : activeFilters.value.keyword ?? ''
    language.value = condition === 'language' || condition === 'all' ? '' : activeFilters.value.language ?? ''
    applyDraft()
  }

  return { keyword, language, activeFilters, ranking, hasAppliedFilters, hasDraftChanges, applyDraft, selectRanking, selectTopic, removeCondition, restoreFilters }
}
