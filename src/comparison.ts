import { computed, shallowRef } from 'vue'
import type { Repository } from './github'

export function useComparison() {
  const repositories = shallowRef<Repository[]>([])
  const ids = computed(() => new Set(repositories.value.map(({ id }) => id)))
  const full = computed(() => repositories.value.length >= 3)
  const canCompare = computed(() => repositories.value.length >= 2)

  function toggle(repository: Repository) {
    if (ids.value.has(repository.id)) {
      repositories.value = repositories.value.filter(({ id }) => id !== repository.id)
    } else if (!full.value) {
      repositories.value = [...repositories.value, repository]
    }
  }

  return { repositories, ids, full, canCompare, toggle, clear: () => { repositories.value = [] } }
}
