<script setup lang="ts">
import type { StoryChecklistItem } from '@/data/story-questions'
import ChecklistItem from './ChecklistItem.vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()

defineProps<{
  checklist: StoryChecklistItem[]
  expanded: boolean
}>()

defineEmits<{
  toggle: []
}>()
</script>

<template>
  <div class="tile-reasoning">
    <button class="tile-reasoning__header" @click="$emit('toggle')">
      <!-- Help icon -->
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" class="tile-reasoning__icon">
        <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" />
        <path d="M6 6a2 2 0 1 1 2 2v1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        <circle cx="8" cy="12" r="0.75" fill="currentColor" />
      </svg>
      <span class="tile-reasoning__label">{{ t('story.showReasoning') }}</span>
      <!-- Collapse icon (rotates when expanded) -->
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        :class="['tile-reasoning__chevron', { 'tile-reasoning__chevron--expanded': expanded }]"
      >
        <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <div v-if="expanded" class="tile-reasoning__items">
      <ChecklistItem
        v-for="item in checklist"
        :key="item.id"
        :item="item"
      />
    </div>
  </div>
</template>

<style scoped>
.tile-reasoning {
  background: var(--telekom-color-background-canvas-subtle, #fbfbfb);
  border: 1px solid var(--telekom-color-ui-faint, #dfdfe1);
  border-radius: 8px;
  padding: 0;
  overflow: hidden;
}

.tile-reasoning__header {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 16px;
  min-height: 36px;
  background: none;
  border: none;
  cursor: pointer;
  font-family: 'TeleNeo', sans-serif;
  color: var(--telekom-color-text-and-icon-standard, #000000);
  transition: background 0.15s;
}

.tile-reasoning__header:hover {
  background: rgba(0, 0, 0, 0.03);
}

.tile-reasoning__icon {
  flex-shrink: 0;
}

.tile-reasoning__label {
  flex: 1;
  text-align: left;
  font-size: 14px;
  font-weight: 700;
  line-height: 19.6px;
}

.tile-reasoning__chevron {
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.tile-reasoning__chevron--expanded {
  transform: rotate(180deg);
}

.tile-reasoning__items {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 16px 16px;
}
</style>
