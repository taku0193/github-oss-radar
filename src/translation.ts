const translations = new Map<string, string>()

export async function translateToJapanese(description: string, signal?: AbortSignal) {
  signal?.throwIfAborted()
  const cached = translations.get(description)
  if (cached !== undefined) return cached

  const { detect } = await import('tinyld/light')
  const from = detect(description) || 'en'
  if (from === 'ja') return description

  const { translate } = await import('./bergamot')
  const translated = await translate(description, from, signal)
  translations.set(description, translated)
  return translated
}
