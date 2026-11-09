import type { Repository } from './github'

export type RankingMode = 'rising' | 'today' | 'week' | 'month' | 'all'
export const RISING_CANDIDATE_LIMIT = 100
export const RISING_WINDOW_DAYS = 30
const day = 86_400_000
const japanOffset = 9 * 3_600_000

export const rankingOptions: { value: RankingMode; label: string; title: string; description: string }[] = [
  { value: 'rising', label: '急上昇', title: '急上昇のリポジトリ', description: '直近30日の新着候補を、公開後1日あたりのスター数で比較' },
  { value: 'today', label: '今日', title: '今日のランキング', description: '今日0時以降に作成されたリポジトリを、スター数順に表示' },
  { value: 'week', label: '今週', title: '今週のランキング', description: '今週月曜日以降に作成されたリポジトリを、スター数順に表示' },
  { value: 'month', label: '今月', title: '今月のランキング', description: '今月1日以降に作成されたリポジトリを、スター数順に表示' },
  { value: 'all', label: '総合', title: '総合ランキング', description: '作成期間を問わず、累計スター数順に表示' },
]

export function rankingSince(mode: RankingMode, now: Date): Date | null {
  if (mode === 'all') return null
  if (mode === 'rising') return new Date(now.getTime() - RISING_WINDOW_DAYS * day)

  const local = new Date(now.getTime() + japanOffset)
  local.setUTCHours(0, 0, 0, 0)
  if (mode === 'week') local.setUTCDate(local.getUTCDate() - (local.getUTCDay() + 6) % 7)
  if (mode === 'month') local.setUTCDate(1)
  return new Date(local.getTime() - japanOffset)
}

export function risingScore(repository: Repository, now: Date): number {
  const created = Date.parse(repository.createdAt)
  if (!Number.isFinite(created)) return 0
  return repository.stars / Math.max(1, (now.getTime() - created) / day)
}

export function sortRising(repositories: Repository[], now: Date): Repository[] {
  return [...repositories].sort((a, b) => risingScore(b, now) - risingScore(a, now)
    || b.stars - a.stars || a.id - b.id)
}
