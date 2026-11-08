import { describe, expect, it } from 'vitest'
import { languageColor } from './languageColors'

describe('languageColor', () => {
  it('gives familiar languages distinct accents', () => {
    expect(languageColor('TypeScript')).toBe('#3178c6')
    expect(languageColor('JavaScript')).toBe('#f1e05a')
    expect(languageColor('Python')).toBe('#3572a5')
    expect(languageColor('Rust')).toBe('#dea584')
  })

  it('uses the same accent despite casing or surrounding whitespace', () => {
    expect(languageColor(' typescript ')).toBe(languageColor('TypeScript'))
  })

  it('keeps unlisted language accents stable and distinct', () => {
    const color = languageColor('New Language')

    expect(color).toMatch(/^hsl\(\d+ 45% 45%\)$/)
    expect(languageColor('new language')).toBe(color)
    expect(languageColor('Another Language')).not.toBe(color)
    expect(languageColor('__proto__')).toMatch(/^hsl\(\d+ 45% 45%\)$/)
  })

  it('uses a neutral accent when no language is available', () => {
    expect(languageColor(null)).toBe('#8b949e')
    expect(languageColor('')).toBe('#8b949e')
    expect(languageColor('  ')).toBe('#8b949e')
  })
})
