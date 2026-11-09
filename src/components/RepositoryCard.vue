<script lang="ts">
const dateFormat = new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium', timeZone: 'Asia/Tokyo' })
const numberFormat = new Intl.NumberFormat('ja-JP')
</script>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, useId, watch } from 'vue'
import type { Repository } from '../github'
import { translateToJapanese } from '../translation'
import { languageColor } from '../languageColors'

const props = defineProps<{ repository: Repository; bookmarked?: boolean; position?: number; dailyStars?: number; compared?: boolean; compareDisabled?: boolean }>()
const emit = defineEmits<{ toggleBookmark: []; toggleCompare: [] }>()
const card = ref<HTMLElement>()
const descriptionElement = ref<HTMLElement>()
const descriptionExpanded = ref(false)
const descriptionOverflows = ref(false)
const original = computed(() => props.repository.description?.trim() ?? '')
const translation = ref('')
const showOriginal = ref(false)
const avatarFailed = ref(false)
const descriptionId = useId()
const description = computed(() => (showOriginal.value ? original.value : translation.value || original.value) || '説明はありません')
const controller = new AbortController()
let observer: IntersectionObserver | undefined
let resizeObserver: ResizeObserver | undefined

function measureDescription() {
  const element = descriptionElement.value
  if (!element || !element.getClientRects().length) return
  const threeLines = Number.parseFloat(window.getComputedStyle(element).lineHeight) * 3
  descriptionOverflows.value = element.scrollHeight > threeLines + 1
}

watch(description, async () => {
  descriptionExpanded.value = false
  await nextTick()
  measureDescription()
})

async function loadTranslation() {
  const text = original.value
  try {
    const translated = await translateToJapanese(text, controller.signal)
    if (!controller.signal.aborted && translated !== text) translation.value = translated
  } catch {
    // Keep the GitHub description readable when a translation is unavailable.
  }
}

onMounted(() => {
  void nextTick(measureDescription)
  if (descriptionElement.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(measureDescription)
    resizeObserver.observe(descriptionElement.value)
  }
  if (!original.value) return
  if (!card.value || typeof IntersectionObserver === 'undefined') {
    void loadTranslation()
    return
  }

  observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return
    observer?.disconnect()
    void loadTranslation()
  })
  observer.observe(card.value)
})

onUnmounted(() => {
  observer?.disconnect()
  resizeObserver?.disconnect()
  controller.abort()
})
</script>

<template>
  <article ref="card" class="repo-card">
    <div class="repo-card-top">
      <div class="repo-identity">
        <span class="repo-avatar" aria-hidden="true">
          {{ repository.owner.slice(0, 2).toUpperCase() }}
          <img
            v-if="!avatarFailed"
            :src="repository.avatarUrl || `https://avatars.githubusercontent.com/${encodeURIComponent(repository.owner)}?s=80`"
            alt=""
            width="40"
            height="40"
            loading="lazy"
            decoding="async"
            referrerpolicy="no-referrer"
            @error="avatarFailed = true"
          />
        </span>
        <div class="repo-name">
          <h3>
            <a
              :href="repository.url"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="`GitHubで ${repository.owner}/${repository.name} を開く（新しいタブ）`"
            >
              {{ repository.name }}
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M7 17 17 7M7 7h10v10" />
              </svg>
            </a>
          </h3>
          <p class="repo-owner">{{ repository.owner }}</p>
        </div>
      </div>
      <button
        type="button"
        class="repo-bookmark"
        :aria-label="`${repository.owner}/${repository.name}の${bookmarked ? '保存を解除' : '保存'}`"
        :aria-pressed="Boolean(bookmarked)"
        :class="{ 'repo-bookmark--saved': bookmarked }"
        @click="emit('toggleBookmark')"
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 4h12v16l-6-4-6 4V4Z" /></svg>
        {{ bookmarked ? '保存済み' : '保存' }}
      </button>
    </div>

    <div>
      <p
        :id="descriptionId"
        ref="descriptionElement"
        class="repo-description"
        :class="{ 'repo-missing': !original, 'repo-description--collapsed': !descriptionExpanded }"
      >{{ description }}</p>
      <div v-if="descriptionOverflows || translation" class="description-tools">
        <button
          v-if="descriptionOverflows"
          type="button"
          class="description-toggle"
          :aria-expanded="descriptionExpanded"
          :aria-controls="descriptionId"
          :aria-label="`${repository.name}の説明を${descriptionExpanded ? '折りたたむ' : '全文表示'}`"
          @click="descriptionExpanded = !descriptionExpanded"
        >{{ descriptionExpanded ? '折りたたむ' : '続きを読む' }}</button>
        <button
          v-if="translation"
          type="button"
          class="translation-toggle"
          :aria-controls="descriptionId"
          @click="showOriginal = !showOriginal"
        >{{ showOriginal ? '日本語訳を表示' : '原文を表示' }}</button>
      </div>
    </div>

    <slot name="notes" />

    <div class="repo-card-bottom">
      <div class="repo-actions">
        <slot name="actions" />
        <button type="button" class="compare-toggle" :aria-pressed="Boolean(compared)" :disabled="compareDisabled && !compared" :aria-label="`${repository.owner}/${repository.name}を比較${compared ? 'から外す' : 'に追加'}`" @click="emit('toggleCompare')">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 4h7v16H3V4Zm11 0h7v16h-7V4Z" /></svg>
          {{ compared ? '比較中' : '比較' }}
        </button>
      </div>

      <div class="repo-meta">
        <div class="repo-facts">
          <span v-if="position" class="repo-position"><span class="visually-hidden">順位 </span>{{ position }}位</span>
          <span
            class="repo-language"
            :class="{ 'repo-missing': !repository.language }"
            :style="{ '--language-color': languageColor(repository.language) }"
          >
            {{ repository.language || '言語未設定' }}
          </span>
          <span class="repo-stars">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m12 3 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3-4.6-4.5 6.3-.9L12 3Z" />
            </svg>
            <span class="visually-hidden">スター数 </span>{{ numberFormat.format(repository.stars) }}
          </span>
        </div>
        <p v-if="dailyStars !== undefined" class="repo-growth">公開後平均 {{ numberFormat.format(Math.round(dailyStars)) }} スター / 日</p>
        <dl class="repo-dates">
          <div>
            <dt>作成</dt>
            <dd><time :datetime="repository.createdAt">{{ dateFormat.format(new Date(repository.createdAt)) }}</time></dd>
          </div>
          <div>
            <dt>更新</dt>
            <dd><time :datetime="repository.updatedAt">{{ dateFormat.format(new Date(repository.updatedAt)) }}</time></dd>
          </div>
        </dl>
      </div>
    </div>
  </article>
</template>
