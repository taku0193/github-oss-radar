<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import type { SearchFilters } from '../github'
import { rankingOptions } from '../rankings'
import { readSavedSearches, saveSearch, removeSavedSearch, searchURL, type SavedSearch } from '../searchPreferences'

const props = defineProps<{ filters: SearchFilters; disabled?: boolean }>()
const emit = defineEmits<{ apply: [filters: SearchFilters] }>()
const saved = shallowRef<SavedSearch[]>([])
const panel = ref<'save' | 'list' | null>(null)
const name = ref('')
const message = ref('')
const manualURL = ref('')
const suggestedName = computed(() => [rankingOptions.find(({ value }) => value === props.filters.ranking)?.label ?? '急上昇', props.filters.language, props.filters.topic, props.filters.keyword].filter(Boolean).join('・'))

function openSave() {
  panel.value = panel.value === 'save' ? null : 'save'
  name.value = suggestedName.value.slice(0, 40)
}
function save() {
  try {
    saved.value = saveSearch(window.localStorage, name.value, props.filters)
    panel.value = null
    message.value = '検索条件を保存しました。'
  } catch (error) { message.value = error instanceof Error ? error.message : '検索条件を保存できませんでした。' }
}
function remove(id: string) {
  try { saved.value = removeSavedSearch(window.localStorage, id); message.value = '保存した検索条件を削除しました。' }
  catch { message.value = '検索条件を削除できませんでした。' }
}
async function share() {
  const url = searchURL(window.location.href, props.filters)
  try {
    await navigator.clipboard.writeText(url)
    manualURL.value = ''
    message.value = '検索条件のURLをコピーしました。'
  } catch { manualURL.value = url; message.value = '下のURLを選択してコピーできます。' }
}
onMounted(() => {
  try { saved.value = readSavedSearches(window.localStorage) }
  catch { message.value = '保存した検索条件を読み込めませんでした。' }
})
</script>

<template>
  <div class="search-tools">
    <div class="toolbar-actions">
      <slot name="filters" />
      <button type="button" class="utility-button" :aria-expanded="panel === 'save'" :disabled="disabled" @click="openSave">条件を保存</button>
      <button type="button" class="utility-button" :aria-expanded="panel === 'list'" :disabled="disabled" @click="panel = panel === 'list' ? null : 'list'">保存した条件 <span class="nav-count">{{ saved.length }}</span></button>
      <button type="button" class="utility-button" @click="share">URLをコピー <span aria-hidden="true">↗</span></button>
    </div>
    <Transition name="panel" mode="out-in">
    <form v-if="panel === 'save'" class="search-panel save-search-form" :inert="panel !== 'save'" @submit.prevent="save">
      <label>検索条件の名前<input v-model="name" maxlength="40" required /></label>
      <button type="submit" class="refresh-button" :disabled="disabled">この条件を保存</button>
      <p class="results-caption">表示中の結果に適用した条件を、このブラウザに保存します。</p>
    </form>
    <div v-else-if="panel === 'list'" class="search-panel" :inert="panel !== 'list'">
      <p v-if="!saved.length" class="results-caption">保存した検索条件はありません。「条件を保存」から追加できます。</p>
      <ul v-else class="saved-searches">
        <li v-for="item in saved" :key="item.id">
          <button type="button" class="saved-search-link" :disabled="disabled" @click="emit('apply', item.filters); panel = null">{{ item.name }}</button>
          <button type="button" class="text-button" :aria-label="`検索条件「${item.name}」を削除`" @click="remove(item.id)">削除</button>
        </li>
      </ul>
    </div>
    </Transition>
    <p v-if="message" class="utility-message" role="status">{{ message }}</p>
    <input v-if="manualURL" class="share-url" aria-label="共有用URL" :value="manualURL" readonly />
  </div>
</template>
