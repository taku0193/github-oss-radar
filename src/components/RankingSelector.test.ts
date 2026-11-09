import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'
import RankingSelector from './RankingSelector.vue'

describe('RankingSelector', () => {
  it('offers five mutually exclusive ranking choices with the applied choice selected', async () => {
    const html = await renderToString(createSSRApp(RankingSelector, { modelValue: 'week' }))
    const inputs = [...html.matchAll(/<input\b[^>]*>/g)].map(([input]) => input)

    expect(html).toContain('ランキングの種類')
    for (const label of ['急上昇', '今日', '今週', '今月', '総合']) expect(html).toContain(label)
    expect(inputs).toHaveLength(5)
    expect(inputs.filter((input) => input.includes('checked'))).toHaveLength(1)
    expect(inputs.find((input) => input.includes('value="week"'))).toContain('checked')
    expect(inputs.every((input) => input.includes('type="radio"'))).toBe(true)
  })

  it('blocks switching all five choices while a request is running', async () => {
    const html = await renderToString(createSSRApp(RankingSelector, { modelValue: 'today', disabled: true }))
    const inputs = [...html.matchAll(/<input\b[^>]*>/g)].map(([input]) => input)

    expect(inputs).toHaveLength(5)
    expect(inputs.every((input) => input.includes('disabled'))).toBe(true)
  })
})
