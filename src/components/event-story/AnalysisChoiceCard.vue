<script setup lang="ts">
import { ref } from 'vue'
import RadioTile from './RadioTile.vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const emit = defineEmits<{
  select: [choice: 'analyze' | 'skip']
}>()

type Choice = 'analyze' | 'skip' | null
const selected = ref<Choice>(null)

function selectOption(value: string) {
  selected.value = value as Choice
}

function handleContinue() {
  if (!selected.value) return
  emit('select', selected.value)
}
</script>

<template>
  <div class="analysis-choice-card">
    <div class="analysis-choice-card__header">
      <h3 class="analysis-choice-card__title">{{ t('story.analysisChoiceTitle') }}</h3>
      <p class="analysis-choice-card__subtitle">{{ t('story.analysisChoiceSubtitle') }}</p>
    </div>

    <div class="analysis-choice-card__options" role="radiogroup">
      <RadioTile
        value="analyze"
        :label="t('story.analyzeOption')"
        :description="t('story.analyzeOptionDesc')"
        :selected="selected === 'analyze'"
        name="analysis-choice"
        hotkey-label="1"
        @select="selectOption"
      />
      <RadioTile
        value="skip"
        :label="t('story.skipOption')"
        :description="t('story.skipOptionDesc')"
        :selected="selected === 'skip'"
        name="analysis-choice"
        hotkey-label="2"
        @select="selectOption"
      />
    </div>

    <div class="analysis-choice-card__actions">
      <scale-button
        :disabled="!selected"
        @click="handleContinue"
      >
        {{ t('story.continue') }}
      </scale-button>
    </div>
  </div>
</template>

<style scoped>
.analysis-choice-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  width: 100%;
  box-sizing: border-box;
  background: var(--telekom-color-background-surface, #fff);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
}

.analysis-choice-card__header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.analysis-choice-card__title {
  font-family: 'TeleNeo', sans-serif;
  font-size: 18px;
  font-weight: 800;
  color: var(--telekom-color-text-and-icon-standard, #000);
  margin: 0;
}

.analysis-choice-card__subtitle {
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.5;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6f);
  margin: 0;
}

.analysis-choice-card__options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.analysis-choice-card__actions {
  display: flex;
  justify-content: flex-end;
}
</style>
