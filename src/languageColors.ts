const accents = new Map([
  ['typescript', '#3178c6'],
  ['javascript', '#f1e05a'],
  ['python', '#3572a5'],
  ['rust', '#dea584'],
  ['go', '#00add8'],
  ['ruby', '#701516'],
  ['java', '#b07219'],
  ['c', '#555555'],
  ['c++', '#f34b7d'],
  ['c#', '#178600'],
  ['html', '#e34c26'],
  ['css', '#663399'],
  ['scss', '#c6538c'],
  ['shell', '#89e051'],
  ['powershell', '#012456'],
  ['php', '#4f5d95'],
  ['swift', '#f05138'],
  ['kotlin', '#a97bff'],
  ['dart', '#00b4ab'],
  ['vue', '#41b883'],
  ['svelte', '#ff3e00'],
  ['jupyter notebook', '#da5b0b'],
  ['dockerfile', '#384d54'],
  ['lua', '#000080'],
  ['zig', '#ec915c'],
  ['elixir', '#6e4a7e'],
  ['haskell', '#5e5086'],
  ['r', '#198ce7'],
  ['julia', '#a270ba'],
  ['nix', '#7e7eff'],
])

export function languageColor(language: string | null): string {
  const key = language?.trim().toLowerCase()
  if (!key) return '#8b949e'

  const accent = accents.get(key)
  if (accent) return accent

  // Give unlisted languages a consistent accent without fetching a color catalog.
  let hue = 0
  for (const character of key) hue = (hue * 31 + character.codePointAt(0)!) % 360
  return `hsl(${hue} 45% 45%)`
}
