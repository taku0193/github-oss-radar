<script setup lang="ts">
import { ref, useId, watch } from 'vue'
import type { BookmarkNote } from '../bookmarkNotes'

const props = defineProps<{ name: string; annotation?: BookmarkNote }>()
const emit = defineEmits<{ save: [note: string, tags: string] }>()
const editing = ref(false)
const note = ref(props.annotation?.note ?? '')
const tags = ref(props.annotation?.tags.join(', ') ?? '')
const editorId = useId()
const presets = ['試したい', '導入候補', '調査済み']
watch(() => props.annotation, (value) => { note.value = value?.note ?? ''; tags.value = value?.tags.join(', ') ?? '' })
function toggleTag(tag: string) {
  const selected = tags.value.split(/[,、\n]/).map((value) => value.trim()).filter(Boolean)
  tags.value = (selected.includes(tag) ? selected.filter((value) => value !== tag) : [...selected, tag]).join(', ')
}
</script>

<template>
  <div class="bookmark-annotation">
    <div v-if="annotation?.tags.length" class="bookmark-tags"><span v-for="tag in annotation.tags" :key="tag">{{ tag }}</span></div>
    <p v-if="annotation?.note" class="bookmark-note">{{ annotation.note }}</p>
    <button type="button" class="utility-button" :aria-label="`${name}のメモ・タグを編集`" :aria-expanded="editing" :aria-controls="editorId" @click="editing = !editing">{{ editing ? '編集を閉じる' : 'メモ・タグを編集' }}</button>
    <form v-if="editing" :id="editorId" class="bookmark-editor" @submit.prevent="emit('save', note, tags)">
      <label>メモ<textarea v-model="note" rows="3" maxlength="2000" placeholder="気になった理由や、試したい使い方" /></label>
      <label>タグ（カンマ区切り）<input v-model="tags" placeholder="例 試したい, CLI" maxlength="175" /></label>
      <div class="tag-presets"><button v-for="tag in presets" :key="tag" type="button" :aria-pressed="tags.split(/[,、\n]/).some((value) => value.trim() === tag)" @click="toggleTag(tag)">{{ tag }}</button></div>
      <p class="results-caption">メモは2,000文字、タグは8個まで。このブラウザに保存されます。</p>
      <button type="submit" class="refresh-button">メモを保存</button>
    </form>
  </div>
</template>
