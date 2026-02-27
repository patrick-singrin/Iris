<script setup lang="ts">
import TextOutputView from './TextOutputView.vue'
import { useEventStoryStore } from '@/stores/eventStoryStore'
import { useI18n } from '@/i18n'

const { t } = useI18n()
const store = useEventStoryStore()
</script>

<template>
  <div class="text-gen-panel">
    <!-- Back link -->
    <button class="text-gen-panel__back" @click="store.backToCollect()">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M10 4l-4 4 4 4" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      {{ t('story.backToDetails') }}
    </button>

    <!-- Loading state -->
    <div v-if="store.isGeneratingText.value" class="text-gen-panel__loading">
      <div class="text-gen-panel__spinner" />
      <p>{{ t('story.generating') }}</p>
    </div>

    <!-- Error state -->
    <div v-else-if="store.generationError.value" class="text-gen-panel__error">
      <p>{{ store.generationError.value }}</p>
      <div class="text-gen-panel__error-actions">
        <scale-button size="small" variant="secondary" @click="store.generationError.value = null">
          {{ t('story.dismiss') }}
        </scale-button>
        <scale-button size="small" @click="store.proceedToGenerate()">
          {{ t('story.retry') }}
        </scale-button>
      </div>
    </div>

    <!-- Generated text output -->
    <TextOutputView v-else />
  </div>
</template>

<style scoped>
.text-gen-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.text-gen-panel__back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  padding: 0;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  color: rgba(0, 0, 0, 0.65);
  cursor: pointer;
  margin-bottom: 16px;
  transition: color 0.15s;
  flex-shrink: 0;
}

.text-gen-panel__back:hover {
  color: var(--telekom-color-primary-standard, #e20074);
}

.text-gen-panel__loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.text-gen-panel__loading p {
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6f);
  margin: 0;
}

.text-gen-panel__spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--telekom-color-ui-faint, #dfdfe1);
  border-top-color: var(--telekom-color-primary-standard, #e20074);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.text-gen-panel__error {
  padding: 24px;
  background: rgba(232, 32, 16, 0.06);
  border: 1px solid var(--telekom-color-functional-danger-standard, #e82010);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.text-gen-panel__error p {
  margin: 0;
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
  color: var(--telekom-color-functional-danger-standard, #e82010);
}

.text-gen-panel__error-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
