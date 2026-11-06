# GitHub OSS Radar

直近30日間に作成された GitHub の公開リポジトリを、スター数が多い順に最大24件表示するダッシュボードです。フォークは検索対象から除外します。ブラウザから [GitHub Search API](https://docs.github.com/en/rest/search/search#search-repositories) に認証なしで接続します。

## ローカルで起動

Node.js 22.12 以降を使用します。

```sh
npm ci
npm run dev
```

## テストとビルド

```sh
npm test
npm run build
```

Vitest では `fetch` をモックし、検索条件、取得結果、エラー時の処理を確認します。カードの表示内容とリンク先も検証します。
