<script setup lang="ts">
import { useEventStoryStore } from '@/stores/eventStoryStore'
import { useI18n } from '@/i18n'
import AnalysisStep from './AnalysisStep.vue'
import ConfigureStep from './ConfigureStep.vue'
import TextOutputView from './TextOutputView.vue'

const { t } = useI18n()

const store = useEventStoryStore()

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#d90000',
  HIGH: '#e20074',
  MEDIUM: '#df9b00',
  LOW: '#1a8a3f',
}
</script>

<template>
  <div class="review-phase">
    <div class="review-phase__container">
      <!-- Back link -->
      <button class="review-phase__back" @click="store.backToCollect()">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M10 4l-4 4 4 4" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        {{ t('story.backToDetails') }}
      </button>

      <!-- Header -->
      <div class="review-phase__header">
        <h2 class="review-phase__title">{{ t('story.reviewTitle') }}</h2>
        <p class="review-phase__subtitle">{{ t('story.reviewSubtitle') }}</p>
      </div>

      <!-- Summary tags -->
      <div v-if="store.classification.value" class="review-phase__tags">
        <scale-tag size="small">{{ store.classification.value.type }}</scale-tag>
        <scale-tag
          v-if="store.classification.value.severity"
          size="small"
          :style="{ '--background': SEVERITY_COLORS[store.classification.value.severity] || '#747478', color: '#fff' }"
        >
          {{ store.classification.value.severity }}
        </scale-tag>
        <span class="review-phase__progress-badge">
          {{ store.checklistProgress.value.verified }}/{{ store.checklistProgress.value.total }} {{ t('story.verified') }}
        </span>
      </div>

      <!-- Sub-step dispatch -->
      <AnalysisStep v-if="store.reviewStep.value === 'analyze'" />

      <ConfigureStep v-else-if="store.reviewStep.value === 'configure'" />

      <div v-else-if="store.reviewStep.value === 'generate'" class="review-phase__generating">
        <div class="review-phase__spinner"></div>
        <p>{{ t('story.generating') }}</p>
      </div>

      <TextOutputView v-else-if="store.reviewStep.value === 'output'" />
    </div>
  </div>
</template>

<style scoped>
.review-phase {
  flex: 1;
  min-height: 0;
  height: 100%;
  overflow-y: auto;
  background: var(--telekom-color-background-surface-subtle, #efeff0);
  padding: 32px;
}

.review-phase__container {
  max-width: 720px;
  margin: 0 auto;
}

/* Back button */
.review-phase__back {
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
  margin-bottom: 24px;
  transition: color 0.15s;
}

.review-phase__back:hover {
  color: var(--telekom-color-primary-standard, #e20074);
}

/* Header */
.review-phase__header {
  margin-bottom: 20px;
}

.review-phase__title {
  font-size: 24px;
  font-weight: 700;
  color: var(--telekom-color-text-and-icon-standard, #000000);
  margin: 0 0 8px;
}

.review-phase__subtitle {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.65);
  line-height: 1.5;
  margin: 0;
}

/* Tags row */
.review-phase__tags {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}

.review-phase__progress-badge {
  font-size: 12px;
  font-weight: 600;
  color: var(--telekom-color-functional-success-standard, #00b367);
  background: rgba(0, 179, 103, 0.08);
  padding: 4px 12px;
  border-radius: 12px;
}

/* Generating state */
.review-phase__generating {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 0;
}

.review-phase__generating p {
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6f);
  margin: 0;
}

.review-phase__spinner {
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
</style>
