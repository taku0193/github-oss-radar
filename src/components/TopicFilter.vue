<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { normalizeTopic, topicOptions } from '../topics'

const props = defineProps<{ value?: string; disabled?: boolean }>()
const emit = defineEmits<{ change: [topic: string] }>()
const open = ref(false)
const draft = ref(props.value ?? '')
const label = computed(() => topicOptions.find(({ value }) => value === props.value)?.label ?? props.value)
watch(() => props.value, (value) => { draft.value = value ?? '' })
function choose(topic: string) { emit('change', normalizeTopic(topic)); open.value = false }
</script>

<template>
  <div class="topic-picker">
    <button type="button" class="utility-button" :disabled="disabled" :aria-expanded="open" @click="open = !open">用途・トピック<span v-if="value" class="active-topic">{{ label }}</span><span aria-hidden="true">⌄</span></button>
    <Transition name="panel">
    <div v-if="open" class="topic-panel search-panel" :inert="!open">
      <div class="results-header"><strong>何に使いたいですか？</strong><button type="button" class="text-button" @click="open = false">閉じる</button></div>
      <div class="topic-choices">
        <button type="button" :aria-pressed="!value" :disabled="disabled" @click="choose('')">すべて</button>
        <button v-for="option in topicOptions" :key="option.value" type="button" :aria-pressed="value === option.value" :disabled="disabled" @click="choose(option.value)">{{ option.label }}</button>
      </div>
      <form class="custom-topic-form" @submit.prevent="choose(draft)">
        <label>トピックを直接指定<input v-model="draft" placeholder="例 terminal / markdown" maxlength="50" pattern="[a-zA-Z0-9][a-zA-Z0-9-]{0,49}" required /></label>
        <button type="submit" class="refresh-button" :disabled="disabled">このトピックで探す</button>
      </form>
      <p class="results-caption">GitHubのトピックが付いているリポジトリに絞り込みます。</p>
    </div>
    </Transition>
  </div>
</template>
