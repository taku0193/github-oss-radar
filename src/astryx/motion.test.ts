import { describe, expect, it } from 'vitest'
import { expandMotionScale } from './expandMotionScale'
import { cardRevealDelay } from './motion'

describe('Astryx motion integration', () => {
  it('keeps feedback quicker than entrances when the motion scale is customized', () => {
    for (const config of [{ fast: 125, medium: 300 }, { fast: 175, medium: 500 }, { fast: 200, medium: 600 }]) {
      const tokens = expandMotionScale({ ...config, ratio: 0.75 })
      const milliseconds = (name: string) => Number.parseFloat(tokens[name]!)
      expect(milliseconds('--duration-fast-max')).toBeLessThan(milliseconds('--duration-medium-min'))
      expect(milliseconds('--duration-medium-min')).toBeLessThan(milliseconds('--duration-medium'))
      expect(milliseconds('--duration-medium')).toBeLessThan(milliseconds('--duration-medium-max'))
    }
  })

  it('keeps later pages responsive instead of delaying every repository in a long list', () => {
    const delays = Array.from({ length: 1000 }, (_, index) => cardRevealDelay(index))
    expect(delays.every((delay) => delay >= 0 && delay <= 325)).toBe(true)
    expect(new Set(delays).size).toBeGreaterThan(1)
    expect(cardRevealDelay(999)).toBeLessThan(400)
  })
})
