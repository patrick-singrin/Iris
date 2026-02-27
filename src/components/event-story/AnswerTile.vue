<script setup lang="ts">
defineProps<{
  questionText: string
  answerText: string
  origin: 'default' | 'verify' | 'text_edit'
}>()
</script>

<template>
  <div class="answer-tile">
    <div class="answer-tile__icon">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M3 7l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </div>
    <div class="answer-tile__content">
      <span class="answer-tile__question">{{ questionText }}</span>
      <span class="answer-tile__answer">{{ answerText }}</span>
    </div>
  </div>
</template>

<style scoped>
.answer-tile {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
  background: var(--telekom-color-background-surface, #fff);
  border-radius: 8px;
  width: 100%;
  box-sizing: border-box;
}

.answer-tile__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: var(--telekom-color-functional-success-standard, #00b367);
  margin-top: 1px;
}

.answer-tile__content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.answer-tile__question {
  font-family: 'TeleNeo', sans-serif;
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
  color: rgba(0, 0, 0, 0.65);
}

.answer-tile__answer {
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
  font-weight: 655;
  line-height: 20px;
  color: var(--telekom-color-text-and-icon-standard, #000000);
}
</style>
