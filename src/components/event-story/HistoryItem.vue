<script setup lang="ts">
import { useI18n } from '@/i18n'

const { t } = useI18n()

defineProps<{
  /** 'question' for default/text_edit answers, 'confirmation' for verified answers */
  type: 'question' | 'confirmation'
  questionText: string
  answerText: string
}>()
</script>

<template>
  <div class="history-item">
    <!-- Top row: icon + question (+ confirmed tag) -->
    <div class="history-item__top">
      <div class="history-item__left">
        <div class="history-item__icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M2.667 3.333A1.333 1.333 0 0 1 4 2h8a1.333 1.333 0 0 1 1.333 1.333v6A1.333 1.333 0 0 1 12 10.667H5.333L2.667 13.333V3.333Z"
              stroke="currentColor"
              stroke-width="1.2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <span class="history-item__question">{{ questionText }}</span>
      </div>
      <span v-if="type === 'confirmation'" class="history-item__tag">
        {{ t('story.confirmed') }}
      </span>
    </div>

    <!-- Info row: answer text (with optional bar for confirmation) -->
    <div class="history-item__info">
      <div v-if="type === 'confirmation'" class="history-item__answer-confirmed">
        <div class="history-item__bar" aria-hidden="true" />
        <span class="history-item__answer">{{ answerText }}</span>
      </div>
      <span v-else class="history-item__answer history-item__answer--plain">{{ answerText }}</span>
    </div>
  </div>
</template>

<style scoped>
.history-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
  background: var(--telekom-color-background-canvas-subtle, #fbfbfb);
  border: 1px solid var(--telekom-color-ui-faint, #dfdfe1);
  border-radius: 4px;
  box-sizing: border-box;
}

/* Top row ------------------------------------------------------------ */
.history-item__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.history-item__left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.history-item__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  background: #efeff0;
  border-radius: 4px;
  color: var(--telekom-color-text-and-icon-standard, #000000);
}

.history-item__question {
  font-family: 'TeleNeo', sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 22.4px;
  color: var(--telekom-color-text-and-icon-standard, #000000);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Confirmed tag ------------------------------------------------------ */
.history-item__tag {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  background: #ccf0e1;
  border-radius: 4px;
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
  font-weight: 655;
  line-height: 17.5px;
  letter-spacing: -0.14px;
  color: #00774b;
}

/* Info row ------------------------------------------------------------ */
.history-item__info {
  padding-left: 40px; /* 32px icon + 8px gap — aligns with question text */
}

.history-item__answer-confirmed {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.history-item__bar {
  width: 2px;
  flex-shrink: 0;
  align-self: stretch;
  background: var(--telekom-color-ui-faint, #dfdfe1);
  border-radius: 1px;
}

.history-item__answer {
  font-family: 'TeleNeo', sans-serif;
  font-size: 16px;
  font-weight: 700;
  line-height: 22.4px;
  color: var(--telekom-color-text-and-icon-standard, #000000);
}

.history-item__answer--plain {
  display: block;
}
</style>
