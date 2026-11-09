<script setup lang="ts">
withDefaults(defineProps<{ count?: number; message?: string }>(), {
  count: 6,
  message: 'GitHub からリポジトリを取得中…',
})
</script>

<template>
  <div class="repository-loading" role="status">
    <span class="visually-hidden">{{ message }}</span>
    <div class="repository-grid" aria-hidden="true">
      <div v-for="index in count" :key="index" class="skeleton-card">
        <div class="skeleton-identity"><span class="skeleton-avatar"></span><div><span class="skeleton-line skeleton-line--title"></span><span class="skeleton-line skeleton-line--short"></span></div></div>
        <div class="skeleton-facts"><span></span><span></span></div>
        <span class="skeleton-line"></span><span class="skeleton-line"></span><span class="skeleton-line skeleton-line--short"></span>
        <div class="skeleton-footer"><span class="skeleton-line"></span></div>
      </div>
    </div>
  </div>
</template>
