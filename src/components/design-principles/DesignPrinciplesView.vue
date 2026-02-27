<script setup lang="ts">
import { computed } from 'vue'
import principlesRaw from '@/data/content-design-principles.md?raw'
import { renderMarkdown } from '@/utils/renderMarkdown'

const renderedHtml = computed(() => renderMarkdown(principlesRaw))
</script>

<template>
  <div class="design-principles">
    <div class="design-principles__card">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="md-content" v-html="renderedHtml" />
    </div>
  </div>
</template>

<!-- Non-scoped: markdown styles must reach v-html content -->
<style>
@import '@/styles/markdown.css';
</style>

<style scoped>
.design-principles {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: calc(100vh - 96px);
  background: var(--telekom-color-background-surface-subtle, #efeff0);
  margin: -32px -32px 0;
  padding: 40px 32px 64px;
}

.design-principles__card {
  background: var(--telekom-color-background-surface, #fff);
  border: 1px solid var(--telekom-color-ui-border-standard, #ccc);
  border-radius: var(--telekom-radius-standard, 8px);
  padding: 40px 48px;
  width: 100%;
  max-width: 820px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

/* Page-specific overrides: first h1 needs no top margin */
.design-principles__card :deep(.md-h1:first-child) {
  margin-top: 0;
}

/* Tables: vertical-align top for content-heavy cells */
.design-principles__card :deep(.md-table td),
.design-principles__card :deep(.md-table th) {
  vertical-align: top;
}
</style>
