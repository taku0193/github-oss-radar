<script lang="ts">
const dateFormat = new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium' })
const numberFormat = new Intl.NumberFormat('ja-JP')
</script>

<script setup lang="ts">
import type { Repository } from '../github'

defineProps<{ repository: Repository; rank: number }>()
</script>

<template>
  <article class="repo-card">
    <div class="repo-card-top">
      <span class="repo-rank" aria-hidden="true">{{ String(rank).padStart(2, '0') }}</span>
      <span class="repo-stars">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m12 3 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3-4.6-4.5 6.3-.9L12 3Z" />
        </svg>
        <span class="visually-hidden">スター数 </span>{{ numberFormat.format(repository.stars) }}
      </span>
    </div>

    <div class="repo-identity">
      <p class="repo-owner">{{ repository.owner }}</p>
      <h3>
        <a
          :href="repository.url"
          :aria-label="`GitHubで ${repository.owner}/${repository.name} を開く`"
        >
          {{ repository.name }}
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M7 17 17 7M7 7h10v10" />
          </svg>
        </a>
      </h3>
    </div>

    <p class="repo-description" :class="{ 'repo-missing': !repository.description }">
      {{ repository.description || '説明はありません' }}
    </p>

    <div class="repo-meta">
      <span class="repo-language" :class="{ 'repo-missing': !repository.language }">
        {{ repository.language || '言語未設定' }}
      </span>
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
  </article>
</template>
