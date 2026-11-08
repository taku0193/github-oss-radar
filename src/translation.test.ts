import { describe, expect, it, vi } from 'vitest'
import { translate } from './bergamot'
import { translateToJapanese } from './translation'

vi.mock('./bergamot', () => ({ translate: vi.fn() }))

describe('translation to Japanese', () => {
  it('translates an English description using the local engine', async () => {
    const description = 'An open-source Markdown editor with real-time preview.'
    vi.mocked(translate).mockResolvedValueOnce('リアルタイムプレビュー付きのオープンソース Markdown エディター。')

    await expect(translateToJapanese(description)).resolves.toContain('リアルタイムプレビュー')
    expect(translate).toHaveBeenCalledWith(description, 'en', undefined)
  })

  it('detects Chinese descriptions without assuming all text is English', async () => {
    const description = '这个开源工具可以用来查看和搜索日志文件。'
    vi.mocked(translate).mockResolvedValueOnce('ログファイルの閲覧や検索に使えるオープンソースツールです。')

    await expect(translateToJapanese(description)).resolves.toContain('ログファイル')
    expect(translate).toHaveBeenCalledWith(description, 'zh', undefined)
  })

  it('reports a model failure to the card', async () => {
    vi.mocked(translate).mockRejectedValueOnce(new Error('Model unavailable'))

    await expect(translateToJapanese('Find new projects.')).rejects.toThrow('Model unavailable')
  })

  it('skips translation when the card is removed before it starts', async () => {
    const description = 'Convert images from the command line.'
    const controller = new AbortController()
    controller.abort()

    await expect(translateToJapanese(description, controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
    expect(translate).not.toHaveBeenCalledWith(description, expect.anything(), expect.anything())
  })
})
