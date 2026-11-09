<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { Repository } from '../github'
import { languageColor } from '../languageColors'

const props = defineProps<{ open: boolean; repositories: Repository[] }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement>()
const number = new Intl.NumberFormat('ja-JP')
const date = new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium', timeZone: 'Asia/Tokyo' })
const rows: { label: string; value: (repository: Repository) => string }[] = [
  { label: '説明', value: (repo) => repo.description || '説明はありません' },
  { label: 'スター数', value: (repo) => number.format(repo.stars) },
  { label: '言語', value: (repo) => repo.language || '言語未設定' },
  { label: '作成日', value: (repo) => date.format(new Date(repo.createdAt)) },
  { label: '更新日', value: (repo) => date.format(new Date(repo.updatedAt)) },
  { label: 'ライセンス', value: (repo) => repo.license || '情報なし' },
  { label: 'トピック', value: (repo) => repo.topics?.join(' / ') || '情報なし' },
]

function synchronize() {
  if (props.open && !dialog.value?.open) dialog.value?.showModal()
  else if (!props.open && dialog.value?.open) dialog.value.close()
}
onMounted(synchronize)
watch(() => props.open, synchronize, { flush: 'post' })
</script>

<template>
  <dialog ref="dialog" class="compare-dialog" aria-labelledby="compare-title" @cancel.prevent="emit('close')" @close="emit('close')">
    <div class="results-header">
      <div>
        <h2 id="compare-title">リポジトリを比較</h2>
        <p class="results-caption">選択時点の情報を横並びで確認できます。</p>
      </div>
      <button type="button" class="refresh-button" autofocus @click="emit('close')">閉じる</button>
    </div>
    <div class="table-scroll" tabindex="0" aria-label="比較表を横にスクロール">
      <table class="comparison-table">
        <caption class="visually-hidden">選択したリポジトリの比較</caption>
        <thead><tr>
          <th scope="col">項目</th>
          <th v-for="repository in repositories" :key="repository.id" scope="col">
            <a :href="repository.url" target="_blank" rel="noopener noreferrer">{{ repository.owner }}/{{ repository.name }} <span aria-label="新しいタブ">↗</span></a>
          </th>
        </tr></thead>
        <tbody><tr v-for="row in rows" :key="row.label">
          <th scope="row">{{ row.label }}</th>
          <td v-for="repository in repositories" :key="repository.id">
            <span :class="{ 'repo-stars': row.label === 'スター数', 'repo-language': row.label === '言語' }" :style="{ '--language-color': languageColor(repository.language) }">{{ row.value(repository) }}</span>
          </td>
        </tr></tbody>
      </table>
    </div>
  </dialog>
</template>
