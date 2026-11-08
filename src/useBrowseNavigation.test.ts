import { describe, expect, it } from 'vitest'
import { useBrowseNavigation, type ReadingPosition } from './useBrowseNavigation'

function navigation() {
  let position = 0
  return {
    ...useBrowseNavigation(() => ({ top: position }), ({ top }) => { position = top }),
    position: () => position,
    scroll: (next: number) => { position = next },
  }
}

describe('browse navigation', () => {
  it('restores each list to its previous reading position', async () => {
    const browse = navigation()
    browse.scroll(1240)
    await browse.show('saved')
    expect(browse.position()).toBe(0)
    browse.scroll(360)

    await browse.show('search')
    expect(browse.position()).toBe(1240)
    await browse.show('saved')
    expect(browse.position()).toBe(360)
  })

  it('returns recommendations to the search list or saved list they came from', async () => {
    const browse = navigation()
    browse.scroll(800)
    await browse.openRecommendations()
    expect(browse.view.value).toBe('recommendations')
    expect(browse.recommendationOrigin.value).toBe('search')
    await browse.backFromRecommendations()
    expect(browse.view.value).toBe('search')
    expect(browse.position()).toBe(800)

    await browse.show('saved')
    browse.scroll(240)
    await browse.openRecommendations()
    await browse.openRecommendations()
    await browse.backFromRecommendations()
    expect(browse.view.value).toBe('saved')
    expect(browse.position()).toBe(240)
  })

  it('resets the search position for a new search without losing the saved-list position', async () => {
    const browse = navigation()
    browse.scroll(800)
    await browse.show('saved')
    browse.scroll(240)
    browse.resetSearchPosition()
    expect(browse.position()).toBe(240)

    await browse.show('search')
    expect(browse.position()).toBe(0)
    await browse.show('saved')
    expect(browse.position()).toBe(240)
  })

  it('retains the reading anchor so translated card heights can change while away', async () => {
    const reading = { top: 800, anchorId: 'search-42', offset: -24 }
    const restored: ReadingPosition[] = []
    const browse = useBrowseNavigation(
      () => reading,
      (position) => { restored.push(position) },
    )

    await browse.openRecommendations()
    await browse.backFromRecommendations()

    expect(restored.at(-1)).toEqual(reading)
  })
})
