<script setup lang="ts">
import { useId } from 'vue'
import { rankingOptions, type RankingMode } from '../rankings'

defineProps<{ modelValue: RankingMode; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: RankingMode] }>()
const name = useId()
</script>

<template>
  <fieldset class="ranking-selector" :style="{ '--active-ranking': rankingOptions.findIndex((option) => option.value === modelValue) }" :disabled="disabled" aria-describedby="ranking-description">
    <legend class="visually-hidden">ランキングの種類</legend>
    <span class="ranking-underline" aria-hidden="true"></span>
    <label v-for="option in rankingOptions" :key="option.value" class="ranking-option">
      <input
        class="visually-hidden"
        type="radio"
        :name="name"
        :value="option.value"
        :checked="modelValue === option.value"
        :disabled="disabled"
        @change="emit('update:modelValue', option.value)"
      />
      <span>{{ option.label }}</span>
    </label>
  </fieldset>
</template>
