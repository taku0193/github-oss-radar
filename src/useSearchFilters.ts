import { computed, ref, shallowRef } from 'vue'
import type { SearchFilters } from './github'
import type { RankingMode } from './rankings'

export function useSearchFilters() {
  const keyword = ref('')
  const language = ref('')
  const activeFilters = shallowRef<SearchFilters>({ ranking: 'rising' })
  const ranking = computed(() => activeFilters.value.ranking ?? 'rising')
  const hasAppliedFilters = computed(() => Boolean(activeFilters.value.keyword || activeFilters.value.language))
  const hasDraftChanges = computed(() => keyword.value.trim() !== (activeFilters.value.keyword ?? '')
    || language.value !== (activeFilters.value.language ?? ''))

  function applyDraft() {
    activeFilters.value = { ranking: ranking.value, keyword: keyword.value.trim(), language: language.value }
  }

  function selectRanking(value: RankingMode) {
    activeFilters.value = { ...activeFilters.value, ranking: value }
  }

  function restoreFilters(filters: SearchFilters) {
    activeFilters.value = { ...filters, ranking: filters.ranking ?? 'rising' }
    keyword.value = filters.keyword ?? ''
    language.value = filters.language ?? ''
  }

  function removeCondition(condition: 'keyword' | 'language' | 'all') {
    keyword.value = condition === 'keyword' || condition === 'all' ? '' : activeFilters.value.keyword ?? ''
    language.value = condition === 'language' || condition === 'all' ? '' : activeFilters.value.language ?? ''
    applyDraft()
  }

  return { keyword, language, activeFilters, ranking, hasAppliedFilters, hasDraftChanges, applyDraft, selectRanking, removeCondition, restoreFilters }
}
