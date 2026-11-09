import { nextTick, ref } from 'vue'

type ListView = 'search' | 'saved'
type BrowseView = ListView | 'recommendations'

export interface ReadingPosition {
  top: number
  anchorId?: string
  offset?: number
}

function readReadingPosition(): ReadingPosition {
  const position: ReadingPosition = { top: window.scrollY }
  if (!position.top) return position

  const cards = document.querySelectorAll<HTMLElement>('[data-reading-id]')
  for (const card of cards) {
    const bounds = card.getBoundingClientRect()
    if (bounds.height && bounds.bottom > 72 && bounds.top < window.innerHeight) {
      return { ...position, anchorId: card.dataset.readingId, offset: bounds.top }
    }
  }
  return position
}

function restoreReadingPosition(position: ReadingPosition) {
  const card = position.anchorId
    ? document.querySelector<HTMLElement>(`[data-reading-id="${position.anchorId}"]`)
    : null
  const top = card && position.offset !== undefined
    ? window.scrollY + card.getBoundingClientRect().top - position.offset
    : position.top
  window.scrollTo({ top, behavior: 'instant' })
}

export function useBrowseNavigation(
  readPosition = readReadingPosition,
  scrollTo = restoreReadingPosition,
) {
  const view = ref<BrowseView>('search')
  const recommendationOrigin = ref<ListView>('search')
  const positions: Record<ListView, ReadingPosition> = { search: { top: 0 }, saved: { top: 0 } }

  async function show(next: ListView) {
    if (view.value === next) return
    if (view.value !== 'recommendations') positions[view.value] = readPosition()
    view.value = next
    await nextTick()
    if (view.value === next) scrollTo(positions[next])
  }

  async function openRecommendations() {
    if (view.value !== 'recommendations') {
      recommendationOrigin.value = view.value
      positions[view.value] = readPosition()
    }
    view.value = 'recommendations'
    await nextTick()
    if (view.value === 'recommendations') scrollTo({ top: 0 })
  }

  function resetSearchPosition() {
    positions.search = { top: 0 }
    if (view.value === 'search') scrollTo({ top: 0 })
  }

  async function preserveSearchPosition(update: () => void) {
    const position = view.value === 'search' ? readPosition() : undefined
    update()
    await nextTick()
    if (position && view.value === 'search') scrollTo(position)
  }

  return {
    view,
    recommendationOrigin,
    show,
    openRecommendations,
    backFromRecommendations: () => show(recommendationOrigin.value),
    resetSearchPosition,
    preserveSearchPosition,
  }
}
