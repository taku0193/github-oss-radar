export const topicOptions = [
  { value: 'cli', label: 'CLI' },
  { value: 'developer-tools', label: '開発ツール' },
  { value: 'web-development', label: 'Web開発' },
  { value: 'machine-learning', label: '機械学習' },
  { value: 'artificial-intelligence', label: 'AI' },
  { value: 'data-science', label: 'データ分析' },
  { value: 'automation', label: '自動化' },
  { value: 'security', label: 'セキュリティ' },
  { value: 'database', label: 'データベース' },
  { value: 'self-hosted', label: 'セルフホスト' },
  { value: 'game-development', label: 'ゲーム開発' },
  { value: 'mobile', label: 'モバイル' },
  { value: 'design', label: 'デザイン' },
  { value: 'productivity', label: '仕事効率化' },
]

export function normalizeTopic(value: string | undefined): string {
  const topic = value?.trim().toLowerCase() ?? ''
  return /^[a-z0-9][a-z0-9-]{0,49}$/.test(topic) ? topic : ''
}
