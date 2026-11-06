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
    <span class="repo-rank" aria-hidden="true">{{ String(rank).padStart(2, '0') }}</span>

    <div class="repo-identity">
      <h3>
        <a
          :href="repository.url"
          :aria-label="`GitHubで ${repository.owner}/${repository.name} を開く`"
        >
          <span class="repo-owner">{{ repository.owner }}/</span>{{ repository.name }}
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M7 17 17 7M7 7h10v10" />
          </svg>
        </a>
      </h3>
      <p class="repo-description" :class="{ 'repo-missing': !repository.description }">
        {{ repository.description || '説明はありません' }}
      </p>
    </div>

    <div class="repo-stats">
      <span class="repo-stars">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m12 3 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3-4.6-4.5 6.3-.9L12 3Z" />
        </svg>
        <span class="visually-hidden">スター数 </span>{{ numberFormat.format(repository.stars) }}
      </span>
      <span class="repo-language">{{ repository.language || '言語未設定' }}</span>
    </div>

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
  </article>
</template>
