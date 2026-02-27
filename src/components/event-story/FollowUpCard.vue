<script setup lang="ts">
import { ref, computed } from 'vue'
import AnalysisFinding from './AnalysisFinding.vue'
import type { AnalysisFinding as FindingType, AnalysisFollowUp } from '@/composables/useReviewPhase'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = defineProps<{
  followUps: AnalysisFollowUp[]
  findings: FindingType[]
}>()

const emit = defineEmits<{
  submit: [answers: Record<string, string>]
  skip: []
}>()

const answers = ref<Record<string, string>>({})

const allAnswered = computed(() => {
  return props.followUps.every(q => answers.value[q.id]?.trim())
})

function handleInput(qId: string, event: Event) {
  const ce = event as CustomEvent
  answers.value[qId] = ce.detail?.value ?? ''
}

function handleSubmit() {
  if (!allAnswered.value) return
  emit('submit', { ...answers.value })
}

function handleSkip() {
  emit('skip')
}
</script>

<template>
  <div class="followup-card">
    <div class="followup-card__header">
      <h3 class="followup-card__title">{{ t('story.followUpTitle') }}</h3>
      <p class="followup-card__subtitle">{{ t('story.followUpSubtitle') }}</p>
    </div>

    <!-- Findings summary -->
    <div v-if="findings.length > 0" class="followup-card__findings">
      <AnalysisFinding
        v-for="finding in findings"
        :key="finding.message"
        :finding="finding"
      />
    </div>

    <!-- Follow-up questions -->
    <div class="followup-card__questions">
      <div
        v-for="q in followUps"
        :key="q.id"
        class="followup-card__question"
      >
        <scale-text-field
          :input-id="q.id"
          :label="q.question"
          :value="answers[q.id] || ''"
          @scaleChange="handleInput(q.id, $event)"
        />
      </div>
    </div>

    <!-- Actions -->
    <div class="followup-card__actions">
      <scale-button
        variant="secondary"
        @click="handleSkip"
      >
        {{ t('story.skipFollowUps') }}
      </scale-button>
      <scale-button
        :disabled="!allAnswered"
        @click="handleSubmit"
      >
        {{ t('story.continue') }}
      </scale-button>
    </div>
  </div>
</template>

<style scoped>
.followup-card {
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

.followup-card__header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.followup-card__title {
  font-family: 'TeleNeo', sans-serif;
  font-size: 18px;
  font-weight: 800;
  color: var(--telekom-color-text-and-icon-standard, #000);
  margin: 0;
}

.followup-card__subtitle {
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.5;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6f);
  margin: 0;
}

.followup-card__findings {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.followup-card__questions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.followup-card__question {
  display: flex;
  flex-direction: column;
}

.followup-card__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
