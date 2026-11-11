<h1><img src="./docs/images/cover.svg" alt="GitHub OSS Radar" width="100%" /></h1>

**次に使うOSSを、日本語で探す。** 100スター以上の公開リポジトリを用途や言語で絞り込み、気になる候補を比較・保存できます。

[ローカルで起動する](#クイックスタート) · [ランキングとデータ](#ランキングとデータ) · [開発](#開発)

## できること

| 操作 | 使い方 |
| --- | --- |
| **探す** | キーワード・言語・トピックで絞り込み。用途の選択肢や、閲覧中のリポジトリに似た候補からも探せます。 |
| **比べる** | 2〜3件を選び、スター数、言語、ライセンス、作成日・更新日を横並びで確認できます。 |
| **保存する** | 気になるOSSにメモとタグを添えて保存。検索条件も保存でき、URLで共有できます。 |

説明は日本語に翻訳され、原文にも切り替えられます。「もっと見る」で結果を追加しても、読んでいた位置を保ちます。

## クイックスタート

Node.js 22.12以降とnpmで起動できます。GitHub APIトークンの設定は不要です。

```sh
git clone https://github.com/taku0193/github-oss-radar.git
cd github-oss-radar
npm ci
npm run dev
```

Viteが表示するローカルURLを開きます。

## ランキングとデータ

| ランキング | 集計方法 |
| --- | --- |
| **急上昇** | 直近30日間の新着からスター数上位100件を取得し、作成後1日あたりの平均スター数で並べます。 |
| **今日・今週・今月** | 日本時間で各期間内に作成されたリポジトリを、現在の累計スター数順に並べます。 |
| **総合** | 作成日に関係なく、現在の累計スター数順に並べます。 |

GitHub REST APIからリポジトリを取得し、説明の翻訳はBergamotとWebAssemblyでブラウザ内で処理します。ブックマーク、メモ、タグ、検索条件はブラウザの `localStorage` に保存されます。

<details>
<summary>検索と保存の仕様</summary>

- 検索対象は100スター以上の公開リポジトリです。フォークは除外します。
- 急上昇は `累計スター数 ÷ 作成後の日数（最低1日）` を使った目安です。結果は24件ずつ追加表示します。
- 認証なしのリポジトリ検索は1分あたり10回までです。上限に達すると再試行できる時刻を案内します。 [GitHub Search APIの制限](https://docs.github.com/en/rest/search/search#rate-limit)
- 翻訳モデルは初回利用時に取得します。翻訳できない説明は原文を表示します。
- 共有URLに含めるのは検索条件です。ブックマークやメモ、タグはブラウザごとに保存されます。

</details>

## 開発

**Vue 3 · TypeScript · Vite · Vitest**

| コマンド | 内容 |
| --- | --- |
| `npm test` | GitHub APIをモックし、検索・ランキング・比較・保存を検証 |
| `npm run build` | 型チェックと本番ビルド |
| `npm run preview` | ビルド結果をローカルで確認 |

<details>
<summary>ソースコードとデザイン</summary>

- GitHub検索とエラー処理は [src/github.ts](./src/github.ts)、ランキングの集計は [src/rankings.ts](./src/rankings.ts)。
- 検索条件とURLの復元は [src/useSearchFilters.ts](./src/useSearchFilters.ts)、検索条件の保存は [src/searchPreferences.ts](./src/searchPreferences.ts)。
- 比較と保存は [src/comparison.ts](./src/comparison.ts)、[src/bookmarks.ts](./src/bookmarks.ts)、[src/bookmarkNotes.ts](./src/bookmarkNotes.ts)。
- 翻訳は [src/translation.ts](./src/translation.ts)、翻訳Workerは [src/bergamot.ts](./src/bergamot.ts)。
- UIの設計と参考サイトは [DESIGN.md](./DESIGN.md)。

モーションにはAstryxの時間尺度とイージングを、余白にはOpen DesignのWarm Editorialのトークンを使用しています。 [Astryxの取り込み元](./src/astryx/NOTICE.md) · [Astryxのライセンス](./public/licenses/astryx.txt) · [Open Designのライセンス](./public/licenses/open-design.txt)

</details>
