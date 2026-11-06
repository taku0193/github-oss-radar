<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
import RepositoryCard from './components/RepositoryCard.vue'
import {
  GitHubSearchError,
  SEARCH_PAGE_SIZE,
  SEARCH_WINDOW_DAYS,
  searchRepositories,
  type Repository,
} from './github'

type SearchState =
  | { status: 'loading' }
  | { status: 'ready'; repositories: Repository[]; incomplete: boolean }
  | { status: 'error' }
  | { status: 'rate-limit'; retryAt: number }

const state = shallowRef<SearchState>({ status: 'loading' })
const retryBlocked = ref(false)
const retryTimeFormat = new Intl.DateTimeFormat('ja-JP', {
  dateStyle: 'short',
  timeStyle: 'medium',
})
let retryTimer: number | undefined

async function loadRepositories() {
  state.value = { status: 'loading' }

  try {
    const result = await searchRepositories()
    state.value = { status: 'ready', ...result }
  } catch (error) {
    if (error instanceof GitHubSearchError && error.kind === 'rate-limit') {
      const now = Date.now()
      const retryAt = error.retryAt ?? now + 60_000
      state.value = { status: 'rate-limit', retryAt }
      if (retryAt > now) {
        retryBlocked.value = true
        retryTimer = window.setTimeout(() => { retryBlocked.value = false }, retryAt - now)
      }
    } else {
      state.value = { status: 'error' }
    }
  }
}

onMounted(loadRepositories)
onUnmounted(() => window.clearTimeout(retryTimer))
</script>

<template>
  <header class="topbar">
    <div class="shell topbar-inner">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="9" />
            <circle cx="14" cy="14" r="4.5" />
            <path d="m14 14 8-8" />
            <circle cx="14" cy="14" r="1" fill="currentColor" />
          </svg>
        </span>
        <span>GitHub OSS Radar</span>
      </div>
      <span class="source-label"><span aria-hidden="true"></span> GitHub Search API</span>
    </div>
  </header>

  <main class="shell dashboard">
    <section class="hero" aria-labelledby="page-title">
      <div class="hero-content">
        <p class="eyebrow hero-kicker">OPEN SOURCE DISCOVERY</p>
        <h1 id="page-title">注目の新着リポジトリ</h1>
        <p class="hero-description">直近{{ SEARCH_WINDOW_DAYS }}日間に作成された GitHub の公開リポジトリを、スター数順に表示します。</p>
      </div>

      <svg class="hero-radar" viewBox="0 0 460 340" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="radar-sweep" x1="294" y1="175" x2="385" y2="80" gradientUnits="userSpaceOnUse">
            <stop stop-color="#dcff8b" stop-opacity=".06" />
            <stop offset="1" stop-color="#dcff8b" stop-opacity=".30" />
          </linearGradient>
        </defs>
        <g stroke="#b9e39a" stroke-opacity=".18">
          <path d="M40 175h416M280 4v332M155 50l250 250M155 300 405 50" />
          <circle cx="280" cy="175" r="155" stroke-dasharray="2 5" />
          <circle cx="280" cy="175" r="126" />
          <circle cx="280" cy="175" r="94" />
          <circle cx="280" cy="175" r="62" />
          <circle cx="280" cy="175" r="31" />
        </g>
        <path d="m280 175 87-91a126 126 0 0 1 37 111Z" fill="url(#radar-sweep)" />
        <path d="m280 175 87-91" stroke="#dcff8b" stroke-opacity=".75" />
        <g fill="#dcff8b">
          <circle cx="280" cy="175" r="3" />
          <circle cx="351" cy="127" r="4" />
          <circle cx="315" cy="217" r="3" opacity=".64" />
          <circle cx="217" cy="104" r="2.5" opacity=".64" />
          <circle cx="400" cy="206" r="2" opacity=".64" />
        </g>
        <circle cx="351" cy="127" r="10" stroke="#dcff8b" stroke-opacity=".32" />
      </svg>
    </section>

    <section class="results" aria-labelledby="results-title">
      <div class="results-header">
        <div>
          <p class="eyebrow section-kicker">REPOSITORIES</p>
          <h2 id="results-title">リポジトリ一覧</h2>
          <p class="results-caption" aria-live="polite">
            <template v-if="state.status === 'ready'">{{ state.repositories.length }} 件を表示</template>
            <template v-else>最大{{ SEARCH_PAGE_SIZE }}件</template>
            <span aria-hidden="true"> · </span>スター数が多い順
          </p>
        </div>
        <button
          type="button"
          class="refresh-button"
          :disabled="state.status === 'loading' || retryBlocked"
          @click="loadRepositories"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M20 7v5h-5M20 12a8 8 0 1 0-2.34 5.66" />
          </svg>
          再取得
        </button>
      </div>

      <div v-if="state.status === 'loading'" class="state-panel" role="status">
        <span class="spinner" aria-hidden="true"></span>
        <p>GitHub からリポジトリを取得中…</p>
      </div>
      <div v-else-if="state.status === 'rate-limit'" class="state-panel state-warning" role="alert">
        <p>GitHub API の利用上限に達しました</p>
        <span v-if="retryBlocked">{{ retryTimeFormat.format(state.retryAt) }} 以降に再取得できます。</span>
        <span v-else>再取得ボタンから検索をやり直せます。</span>
      </div>
      <div v-else-if="state.status === 'error'" class="state-panel state-warning" role="alert">
        <p>リポジトリを取得できませんでした</p>
        <span>通信環境を確認し、再取得してください。</span>
      </div>
      <template v-else>
        <p v-if="state.incomplete" class="partial-note" role="status">GitHub から一部の結果のみ返されました。</p>
        <div v-if="state.repositories.length === 0" class="state-panel" role="status">
          <p>{{ state.incomplete ? '表示できるリポジトリがありません' : '該当するリポジトリがありません' }}</p>
        </div>
        <ol v-else class="repository-grid" role="list">
          <li v-for="(repository, index) in state.repositories" :key="repository.id">
            <RepositoryCard :repository="repository" :rank="index + 1" />
          </li>
        </ol>
      </template>
    </section>
  </main>

  <footer class="shell footer">
    <span>GitHub OSS Radar</span>
    <span>データ提供元 GitHub</span>
  </footer>
</template>
