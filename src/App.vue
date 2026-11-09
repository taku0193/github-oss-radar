<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { readBookmarks, setBookmarked } from './bookmarks'
import RepositoryCard from './components/RepositoryCard.vue'
import RepositorySkeleton from './components/RepositorySkeleton.vue'
import DiscoverySignal from './components/DiscoverySignal.vue'
import RankingSelector from './components/RankingSelector.vue'
import CompareDialog from './components/CompareDialog.vue'
import SearchTools from './components/SearchTools.vue'
import TopicFilter from './components/TopicFilter.vue'
import BookmarkNotes from './components/BookmarkNotes.vue'
import { readBookmarkNotes, writeBookmarkNote, type BookmarkNote } from './bookmarkNotes'
import { initialSearch, parseSearchURL, rememberSearch, searchURL } from './searchPreferences'
import { useComparison } from './comparison'
import {
  fetchRepositoryPage,
  GitHubSearchError,
  SEARCH_KEYWORD_LIMIT,
  SEARCH_MIN_STARS,
  SEARCH_PAGE_SIZE,
  searchRepositories,
  type Repository,
  type SearchResult,
  type SearchFilters,
} from './github'
import { recommendRepositories } from './recommendations'
import { useBrowseNavigation } from './useBrowseNavigation'
import { useSearchFilters } from './useSearchFilters'
import { rankingOptions, risingScore, type RankingMode } from './rankings'
import { languageColor } from './languageColors'

type RequestFailure =
  | { status: 'error' }
  | { status: 'rate-limit'; retryAt: number }

type SearchState = { status: 'loading' } | ({ status: 'ready' } & SearchResult) | RequestFailure
type RecommendationState = { seed: Repository } & (
  | { status: 'loading' }
  | ({ status: 'ready' } & Awaited<ReturnType<typeof recommendRepositories>>)
  | RequestFailure
)

const state = shallowRef<SearchState>({ status: 'loading' })
const recommendation = shallowRef<RecommendationState>()
const moreFailure = shallowRef<RequestFailure>()
const activeRequest = ref<'search' | 'more' | 'recommendations' | null>(null)
const bookmarks = shallowRef<Repository[]>([])
const bookmarkNotes = shallowRef<Record<number, BookmarkNote>>({})
const selectedBookmarkTag = ref('')
const bookmarkTags = computed(() => [...new Set(bookmarks.value.flatMap(({ id }) => bookmarkNotes.value[id]?.tags ?? []))].sort((a, b) => a.localeCompare(b, 'ja')))
const visibleBookmarks = computed(() => selectedBookmarkTag.value
  ? bookmarks.value.filter(({ id }) => bookmarkNotes.value[id]?.tags.includes(selectedBookmarkTag.value)) : bookmarks.value)
const bookmarkNotice = ref('')
watch(bookmarkTags, (tags) => { if (selectedBookmarkTag.value && !tags.includes(selectedBookmarkTag.value)) selectedBookmarkTag.value = '' })
const bookmarkIds = computed(() => new Set(bookmarks.value.map(({ id }) => id)))
const { view, recommendationOrigin, show, openRecommendations, backFromRecommendations, resetSearchPosition, preserveSearchPosition } = useBrowseNavigation()
const bookmarkError = ref('')
const { repositories: comparison, ids: comparisonIds, full: comparisonFull, canCompare, toggle: toggleComparison, clear: clearComparison } = useComparison()
const comparisonOpen = ref(false)
const { keyword, language, activeFilters, ranking, hasAppliedFilters, hasDraftChanges,
  applyDraft, selectRanking, selectTopic, removeCondition, restoreFilters } = useSearchFilters()
const searchMemoryError = ref('')
let pendingNavigation: SearchFilters | undefined
const languages = ['JavaScript', 'TypeScript', 'Python', 'Rust', 'Go', 'Ruby', 'Java', 'C', 'C++', 'C#', 'Dart', 'Kotlin', 'Swift', 'PHP', 'Shell', 'HTML', 'CSS', 'Vue']
const rankingInfo = computed(() => rankingOptions.find(({ value }) => value === ranking.value)!)
const rankingReference = shallowRef(new Date())
const visibleLimit = ref(SEARCH_PAGE_SIZE)
const visibleRepositories = computed(() => state.value.status === 'ready'
  ? state.value.repositories.slice(0, visibleLimit.value) : [])
const hasMore = computed(() => state.value.status === 'ready'
  && (state.value.nextPage !== null || visibleLimit.value < state.value.repositories.length))
const broaderRanking = computed(() => ranking.value === 'all' ? null
  : ranking.value === 'today' || ranking.value === 'week' ? 'month' : 'all')
const retryBlocked = ref(false)
const requestBlocked = computed(() => activeRequest.value !== null || retryBlocked.value)
const retryTimeFormat = new Intl.DateTimeFormat('ja-JP', {
  dateStyle: 'short',
  timeStyle: 'medium',
})
let retryTimer: number | undefined

function requestFailure(error: unknown): RequestFailure {
  if (!(error instanceof GitHubSearchError) || error.kind !== 'rate-limit') return { status: 'error' }

  const now = Date.now()
  const retryAt = error.retryAt ?? now + 60_000
  if (retryAt > now) {
    retryBlocked.value = true
    retryTimer = window.setTimeout(() => { retryBlocked.value = false }, retryAt - now)
  }
  return { status: 'rate-limit', retryAt }
}

function requestErrorText(failure: RequestFailure, fallback: string) {
  if (failure.status === 'rate-limit' && retryBlocked.value) {
    return `GitHub API の利用上限に達しました。${retryTimeFormat.format(failure.retryAt)} 以降に再試行できます。`
  }
  return fallback
}

async function loadRepositories(updateHistory = true) {
  if (requestBlocked.value) return
  try {
    const url = searchURL(window.location.href, activeFilters.value)
    if (updateHistory && url !== window.location.href) window.history.pushState(null, '', url)
    rememberSearch(window.localStorage, activeFilters.value)
    searchMemoryError.value = ''
  } catch { searchMemoryError.value = '検索条件をブラウザに記憶できませんでした。検索は引き続き利用できます。' }
  activeRequest.value = 'search'
  moreFailure.value = undefined
  visibleLimit.value = SEARCH_PAGE_SIZE
  rankingReference.value = new Date()
  resetSearchPosition()
  state.value = { status: 'loading' }

  try {
    const result = await searchRepositories(undefined, rankingReference.value, activeFilters.value)
    state.value = { status: 'ready', ...result }
  } catch (error) {
    state.value = requestFailure(error)
  } finally {
    activeRequest.value = null
  }
}

function submitSearch() {
  if (requestBlocked.value) return
  applyDraft()
  return loadRepositories()
}

function changeRanking(value: RankingMode) {
  if (requestBlocked.value || ranking.value === value) return
  selectRanking(value)
  return loadRepositories()
}

function changeTopic(topic: string) {
  if (requestBlocked.value) return
  selectTopic(topic)
  return loadRepositories()
}

function removeSearchCondition(condition: 'keyword' | 'language' | 'topic' | 'all') {
  if (requestBlocked.value) return
  removeCondition(condition)
  return loadRepositories()
}

async function loadMore() {
  const previous = state.value
  if (requestBlocked.value || previous.status !== 'ready') return
  if (visibleLimit.value < previous.repositories.length) {
    await preserveSearchPosition(() => { visibleLimit.value += SEARCH_PAGE_SIZE })
    return
  }
  if (!previous.nextPage) return

  activeRequest.value = 'more'
  moreFailure.value = undefined
  try {
    const result = await fetchRepositoryPage(previous.nextPage)
    const repositories = new Map(previous.repositories.map((repository) => [repository.id, repository]))
    for (const repository of result.repositories) {
      if (!repositories.has(repository.id)) repositories.set(repository.id, repository)
    }
    await preserveSearchPosition(() => {
      state.value = {
        status: 'ready',
        ...result,
        repositories: [...repositories.values()],
        incomplete: previous.incomplete || result.incomplete,
      }
      visibleLimit.value = repositories.size
    })
  } catch (error) {
    moreFailure.value = requestFailure(error)
  } finally {
    activeRequest.value = null
  }
}

async function loadRecommendations(seed: Repository) {
  if (requestBlocked.value) return

  activeRequest.value = 'recommendations'
  const pending = { status: 'loading', seed } as const
  recommendation.value = pending
  await openRecommendations()
  try {
    const result = await recommendRepositories(seed, bookmarkIds.value)
    if (recommendation.value === pending) recommendation.value = { status: 'ready', seed, ...result }
  } catch (error) {
    const failure = requestFailure(error)
    if (recommendation.value === pending) recommendation.value = { seed, ...failure }
  } finally {
    activeRequest.value = null
  }
}

function toggleBookmark(repository: Repository) {
  try {
    bookmarks.value = setBookmarked(window.localStorage, repository, !bookmarkIds.value.has(repository.id))
    bookmarkError.value = ''
  } catch {
    bookmarkError.value = '保存内容を更新できませんでした。ブラウザの保存設定を確認してください。'
  }
}

function saveBookmarkNote(repository: Repository, note: string, tags: string) {
  try {
    bookmarkNotes.value = writeBookmarkNote(window.localStorage, repository.id, note, tags)
    bookmarkError.value = ''
    bookmarkNotice.value = `「${repository.name}」のメモ・タグを保存しました。`
  } catch (error) { bookmarkError.value = error instanceof Error ? error.message : 'メモを保存できませんでした。' }
}

function showView(saved: boolean) {
  void show(saved ? 'saved' : 'search')
  recommendation.value = undefined
}

function applySavedSearch(filters: SearchFilters, updateHistory = true) {
  if (requestBlocked.value) return
  restoreFilters(filters)
  showView(false)
  return loadRepositories(updateHistory)
}

function restoreHistory() {
  const filters = parseSearchURL(window.location.href)
  if (requestBlocked.value) pendingNavigation = filters
  else void applySavedSearch(filters, false)
}

watch(requestBlocked, (blocked) => {
  if (!blocked && pendingNavigation) {
    const filters = pendingNavigation
    pendingNavigation = undefined
    void applySavedSearch(filters, false)
  }
})

onMounted(() => {
  try { restoreFilters(initialSearch(window.location.href, window.localStorage)) }
  catch { restoreFilters(parseSearchURL(window.location.href)) }
  window.history.replaceState(null, '', searchURL(window.location.href, activeFilters.value))
  window.addEventListener('popstate', restoreHistory)
  try {
    bookmarks.value = readBookmarks(window.localStorage)
    bookmarkNotes.value = readBookmarkNotes(window.localStorage)
  } catch {
    bookmarkError.value = '保存済みリポジトリを読み込めませんでした。'
  }
  void loadRepositories(false)
})
onUnmounted(() => { window.clearTimeout(retryTimer); window.removeEventListener('popstate', restoreHistory) })
</script>

<template>
  <div class="app-layout">
  <header class="topbar">
    <div class="topbar-inner">
      <div class="brand" aria-label="GitHub OSS Radar">
        <span class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="9" />
            <circle cx="14" cy="14" r="4.5" />
            <path d="m14 14 8-8" />
            <circle cx="14" cy="14" r="1" fill="currentColor" />
          </svg>
        </span>
        <span class="brand-text"><strong class="brand-wordmark">OSS Radar</strong></span>
      </div>
      <nav class="view-nav" aria-label="画面切り替え">
        <button type="button" :aria-current="(view === 'search' || view === 'recommendations' && recommendationOrigin === 'search') ? 'page' : undefined" @click="showView(false)">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5"/></svg><span>探す</span>
        </button>
        <button type="button" :aria-current="(view === 'saved' || view === 'recommendations' && recommendationOrigin === 'saved') ? 'page' : undefined" @click="showView(true)">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 4h12v16l-6-4-6 4V4Z"/></svg><span>保存済み</span> <span class="nav-count">{{ bookmarks.length }}</span>
        </button>
      </nav>
      <div class="header-threshold"><span aria-hidden="true">★</span>{{ SEARCH_MIN_STARS }}スター以上の公開OSS</div>
    </div>
    <p v-if="bookmarkError" class="shell bookmark-error" role="alert">{{ bookmarkError }}</p>
  </header>

  <div class="workspace">
  <main class="shell dashboard" :class="[`dashboard--${view}`, { 'dashboard--with-tray': comparison.length }]">
    <section v-if="recommendation" v-show="view === 'recommendations'" class="collection collection--recommendations" aria-labelledby="recommendation-title">
      <div class="results-header">
        <div>
          <h1 id="recommendation-title" class="saved-title">似たリポジトリ</h1>
          <p class="results-caption">「{{ recommendation.seed.name }}」をもとに探した候補</p>
          <p v-if="recommendation.status === 'ready' && recommendation.reason" class="results-caption">{{ recommendation.reason }}</p>
        </div>
        <button type="button" class="refresh-button" @click="backFromRecommendations">
          {{ recommendationOrigin === 'search' ? '検索結果に戻る' : '保存済みに戻る' }}
        </button>
      </div>
      <RepositorySkeleton v-if="recommendation.status === 'loading'" :count="3" message="似たリポジトリを探しています…" />
      <div v-else-if="recommendation.status === 'ready'">
        <p v-if="recommendation.incomplete" class="partial-note" role="status">GitHub から一部の結果のみ返されました。</p>
        <ul v-if="recommendation.repositories.length" class="repository-grid" role="list" aria-label="推薦リポジトリ">
          <li v-for="(repository, index) in recommendation.repositories" :key="repository.id">
            <RepositoryCard
              :repository="repository"
              :reveal-index="index"
              :bookmarked="bookmarkIds.has(repository.id)"
              :compared="comparisonIds.has(repository.id)"
              :compare-disabled="comparisonFull"
              @toggle-compare="toggleComparison(repository)"
              @toggle-bookmark="toggleBookmark(repository)"
            />
          </li>
        </ul>
        <div v-else class="state-panel" role="status">
          <p>似たリポジトリが見つかりませんでした</p>
          <span>{{ recommendation.reason ? '別のリポジトリから探してみてください。' : 'このリポジトリにはトピックや言語の情報がありません。' }}</span>
        </div>
      </div>
      <div v-else class="state-panel state-warning">
        <p role="alert">{{ requestErrorText(recommendation, '似たリポジトリを取得できませんでした。') }}</p>
        <button type="button" class="refresh-button" :disabled="requestBlocked" @click="loadRecommendations(recommendation.seed)">もう一度探す</button>
      </div>
    </section>
    <section v-show="view === 'saved'" class="collection collection--saved" aria-labelledby="saved-title">
      <div class="results-header">
        <div>
          <h1 id="saved-title" class="saved-title">保存済みリポジトリ</h1>
          <p class="results-caption" aria-live="polite">{{ visibleBookmarks.length }} 件を表示 / {{ bookmarks.length }} 件を保存</p>
        </div>
        <label v-if="bookmarkTags.length" class="saved-tag-filter">タグで絞り込み<select v-model="selectedBookmarkTag"><option value="">すべてのタグ</option><option v-for="tag in bookmarkTags" :key="tag" :value="tag">{{ tag }}</option></select></label>
      </div>
      <p v-if="bookmarkNotice" class="utility-message bookmark-notice" role="status">{{ bookmarkNotice }}</p>
      <ul v-if="visibleBookmarks.length" class="repository-grid" role="list" aria-label="保存済みリポジトリ">
        <li v-for="(repository, index) in visibleBookmarks" :key="repository.id" :data-reading-id="`saved-${repository.id}`">
          <RepositoryCard :repository="repository" :reveal-index="index" bookmarked :compared="comparisonIds.has(repository.id)" :compare-disabled="comparisonFull" @toggle-compare="toggleComparison(repository)" @toggle-bookmark="toggleBookmark(repository)">
            <template #notes><BookmarkNotes :name="repository.name" :annotation="bookmarkNotes[repository.id]" @save="(note, tags) => saveBookmarkNote(repository, note, tags)" /></template>
            <template #actions>
              <button type="button" class="similar-button" :disabled="requestBlocked" @click="loadRecommendations(repository)">似たリポジトリを探す <span aria-hidden="true">→</span></button>
            </template>
          </RepositoryCard>
        </li>
      </ul>
      <div v-else class="state-panel">
        <p>{{ selectedBookmarkTag ? 'このタグのリポジトリはありません' : '保存済みのリポジトリはありません' }}</p>
        <span>一覧で気になったカードの「保存」を押すと、ここから見返せます。</span>
      </div>
    </section>
    <div v-show="view === 'search'" class="discovery-header">
      <section class="hero" aria-labelledby="page-title">
        <div class="hero-content">
          <div class="hero-copy">
            <h1 id="page-title">次に使うOSSを<wbr>見つける</h1>
            <p class="hero-description">キーワードや用途から探して、気になるプロジェクトを保存。</p>
          </div>
          <DiscoverySignal />
        </div>
      </section>

      <form class="search-form" :class="{ 'search-form--busy': activeRequest === 'search' }" role="search" aria-label="リポジトリ検索" @submit.prevent="submitSearch">
        <label class="keyword-field">
          <span class="visually-hidden">キーワード</span>
          <span class="search-input">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="5.5" />
              <path d="m15 15 4 4" />
            </svg>
            <input v-model="keyword" type="search" placeholder="リポジトリ名、キーワードで検索…" :maxlength="SEARCH_KEYWORD_LIMIT" />
          </span>
        </label>
        <label>
          <span class="visually-hidden">言語</span>
          <select v-model="language">
            <option value="">すべての言語</option>
            <option v-if="language && !languages.includes(language)" :value="language">{{ language }}</option>
            <option v-for="option in languages" :key="option" :value="option">{{ option }}</option>
          </select>
        </label>
        <button type="submit" class="search-submit" :disabled="requestBlocked">{{ activeRequest === 'search' ? '検索中' : '検索' }} <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" /></svg></button>
      </form>
    </div>

    <div v-show="view === 'search'" class="ranking-toolbar">
      <div class="discovery-controls">
        <RankingSelector :model-value="ranking" :disabled="requestBlocked" @update:model-value="changeRanking" />
        <SearchTools :filters="activeFilters" :disabled="requestBlocked" @apply="applySavedSearch">
          <template #filters><TopicFilter :value="activeFilters.topic" :disabled="requestBlocked" @change="changeTopic" /></template>
        </SearchTools>
      </div>
      <p v-if="searchMemoryError" class="utility-message" role="status">{{ searchMemoryError }}</p>
      <div class="ranking-context">
      <p id="ranking-description" class="ranking-description">{{ rankingInfo.description }}</p>
      <details class="ranking-method">
        <summary>集計について</summary>
        <p>今日・今週・今月は、リポジトリの作成期間で絞り、現在の累計スター数で並べています。期間中に増えたスター数のランキングではありません。日付の区切りは日本時間、週の始まりは月曜日です。</p>
        <p>急上昇は目安です。直近30日間に作成されたスター数上位100件の候補を、累計スター数 ÷ 公開日数（最低1日）で比較します。総合は作成期間を制限しません。いずれも100スター以上の公開リポジトリが対象です。</p>
      </details>
      </div>
    </div>

    <section v-show="view === 'search'" class="results" aria-labelledby="results-title">
      <div class="results-header">
        <div class="results-heading">
          <h2 id="results-title">{{ rankingInfo.title }}</h2>
          <p class="results-caption" aria-live="polite">
            <template v-if="state.status === 'ready'">{{ visibleRepositories.length }} 件を表示</template>
            <template v-else>最大{{ SEARCH_PAGE_SIZE }}件</template>
          </p>
        </div>
        <button
          type="button"
          class="refresh-button"
          :disabled="requestBlocked"
          @click="loadRepositories()"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M20 7v5h-5M20 12a8 8 0 1 0-2.34 5.66" />
          </svg>
          再取得
        </button>
      </div>

      <div v-if="hasAppliedFilters" class="applied-filters" aria-label="適用中の検索条件">
        <span>検索条件</span>
        <button
          v-if="activeFilters.keyword"
          type="button"
          :disabled="requestBlocked"
          :aria-label="`キーワード「${activeFilters.keyword}」を解除`"
          @click="removeSearchCondition('keyword')"
        >{{ activeFilters.keyword }} <span aria-hidden="true">×</span></button>
        <button
          v-if="activeFilters.language"
          type="button"
          class="language-filter"
          :style="{ '--language-color': languageColor(activeFilters.language) }"
          :disabled="requestBlocked"
          :aria-label="`言語「${activeFilters.language}」を解除`"
          @click="removeSearchCondition('language')"
        >{{ activeFilters.language }} <span aria-hidden="true">×</span></button>
        <button v-if="activeFilters.topic" type="button" :disabled="requestBlocked" :aria-label="`トピック「${activeFilters.topic}」を解除`" @click="removeSearchCondition('topic')">#{{ activeFilters.topic }} <span aria-hidden="true">×</span></button>
        <button type="button" class="clear-filters" :disabled="requestBlocked" @click="removeSearchCondition('all')">すべて解除</button>
      </div>
      <p v-if="hasDraftChanges" class="draft-note" role="status">条件を変更しています。「検索」で結果を更新できます。</p>

      <RepositorySkeleton v-if="state.status === 'loading'" />
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
          <template v-if="!state.incomplete && hasAppliedFilters">
            <span>検索条件を広げて探してみてください。</span>
            <button
              v-if="activeFilters.language"
              type="button"
              class="refresh-button"
              :disabled="requestBlocked"
              @click="removeSearchCondition('language')"
            >言語の指定を外して再検索</button>
            <button v-else type="button" class="refresh-button" :disabled="requestBlocked" @click="removeSearchCondition('all')">条件をクリアして探す</button>
          </template>
          <button
            v-if="!state.incomplete && broaderRanking"
            type="button"
            class="refresh-button"
            :disabled="requestBlocked"
            @click="changeRanking(broaderRanking)"
          >{{ broaderRanking === 'month' ? '期間を広げて今月を見る' : '総合ランキングを見る' }}</button>
        </div>
        <ol v-else class="repository-grid" role="list" aria-label="リポジトリ一覧">
          <li v-for="(repository, index) in visibleRepositories" :key="repository.id" :data-reading-id="`search-${repository.id}`">
            <RepositoryCard
              :repository="repository"
              :position="index + 1"
              :daily-stars="ranking === 'rising' ? risingScore(repository, rankingReference) : undefined"
              :compared="comparisonIds.has(repository.id)"
              :compare-disabled="comparisonFull"
              @toggle-compare="toggleComparison(repository)"
              :bookmarked="bookmarkIds.has(repository.id)"
              @toggle-bookmark="toggleBookmark(repository)"
            >
              <template #actions>
                <button type="button" class="similar-button" :disabled="requestBlocked" @click="loadRecommendations(repository)">似たリポジトリを探す <span aria-hidden="true">→</span></button>
              </template>
            </RepositoryCard>
          </li>
        </ol>
        <div v-if="hasMore" class="more-results">
          <p v-if="moreFailure" role="alert">{{ requestErrorText(moreFailure, '続きの結果を取得できませんでした。') }}</p>
          <button type="button" class="refresh-button" :disabled="requestBlocked" @click="loadMore">
            {{ activeRequest === 'more' ? '続きを取得中…' : 'もっと見る' }}
          </button>
        </div>
      </template>
    </section>
  </main>

  <footer class="shell footer">
    <span>GitHub OSS Radar <span class="footer-separator">/</span> あなたの、次の発見。</span>
    <span>データ提供元 GitHub</span>
  </footer>
  </div>
  </div>

  <Transition name="tray">
  <aside v-if="comparison.length" class="comparison-tray" aria-label="比較候補">
    <div class="shell comparison-tray-inner">
      <div class="comparison-selection">
        <strong aria-live="polite">比較候補 {{ comparison.length }} / 3</strong>
        <button v-for="repository in comparison" :key="repository.id" type="button" class="selection-chip" :aria-label="`${repository.name}を比較から外す`" @click="toggleComparison(repository)">{{ repository.name }} <span aria-hidden="true">×</span></button>
      </div>
      <div class="toolbar-actions">
        <button type="button" class="text-button" @click="clearComparison">選択をクリア</button>
        <button type="button" class="search-submit" :disabled="!canCompare" @click="comparisonOpen = true">{{ canCompare ? '選択したOSSを比較' : 'あと1件選択' }}</button>
      </div>
    </div>
  </aside>
  </Transition>
  <CompareDialog :open="comparisonOpen" :repositories="comparison" @close="comparisonOpen = false" />

</template>
