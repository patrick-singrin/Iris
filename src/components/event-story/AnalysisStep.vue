<script setup lang="ts">
import { ref, computed } from 'vue'
import RadioTile from './RadioTile.vue'
import AnalysisFinding from './AnalysisFinding.vue'
import { useEventStoryStore } from '@/stores/eventStoryStore'
import { useI18n } from '@/i18n'

const { t } = useI18n()
const store = useEventStoryStore()

type Choice = 'analyze' | 'skip' | null
const choice = ref<Choice>(null)
const followUpAnswers = ref<Record<string, string>>({})

const hasResults = computed(() => store.analysisResult.value !== null)
const hasFollowUps = computed(() => {
  if (!store.analysisResult.value) return false
  return store.analysisResult.value.followUpQuestions.length > 0
})
const allFollowUpsAnswered = computed(() => {
  if (!hasFollowUps.value) return true
  return store.analysisResult.value!.followUpQuestions.every(
    q => followUpAnswers.value[q.id]?.trim(),
  )
})
function selectChoice(val: string) {
  choice.value = val as Choice
  if (val === 'skip') {
    store.skipAnalysis()
  } else {
    store.startHolisticAnalysis()
  }
}

function submitFollowUps() {
  if (!store.analysisResult.value) return
  for (const q of store.analysisResult.value.followUpQuestions) {
    const answer = followUpAnswers.value[q.id]
    if (answer?.trim()) {
      store.applyFollowUpAnswer(q.targetChecklistItem, answer.trim())
    }
  }
  store.proceedToConfigure()
}

function continueWithoutFollowUps() {
  store.proceedToConfigure()
}
</script>

<template>
  <div class="analysis-step">
    <div class="analysis-step__header">
      <h2 class="analysis-step__title">{{ t('story.analysisTitle') }}</h2>
      <p class="analysis-step__subtitle">{{ t('story.analysisSubtitle') }}</p>
    </div>

    <!-- Choice phase -->
    <div v-if="!choice && !store.isAnalyzing.value && !hasResults" class="analysis-step__choices" role="radiogroup">
      <RadioTile
        value="analyze"
        :label="t('story.analyzeOption')"
        :description="t('story.analyzeOptionDesc')"
        :selected="false"
        name="analysis-choice"
        hotkey-label="1"
        @select="selectChoice"
      />
      <RadioTile
        value="skip"
        :label="t('story.skipOption')"
        :description="t('story.skipOptionDesc')"
        :selected="false"
        name="analysis-choice"
        hotkey-label="2"
        @select="selectChoice"
      />
    </div>

    <!-- Loading -->
    <div v-if="store.isAnalyzing.value" class="analysis-step__loading">
      <div class="analysis-step__spinner" />
      <p>{{ t('story.analyzingContext') }}</p>
    </div>

    <!-- Results -->
    <div v-if="hasResults && !store.isAnalyzing.value" class="analysis-step__results">
      <div v-if="store.analysisResult.value!.assessment === 'good' && store.analysisResult.value!.findings.length === 0" class="analysis-step__good">
        <span class="analysis-step__good-icon">✓</span>
        <p>{{ t('story.analysisGood') }}</p>
      </div>

      <div v-if="store.analysisResult.value!.findings.length > 0" class="analysis-step__findings">
        <h3 class="analysis-step__section-title">{{ t('story.analysisFindings') }}</h3>
        <AnalysisFinding
          v-for="finding in store.analysisResult.value!.findings"
          :key="finding.message"
          :finding="finding"
        />
      </div>

      <!-- Follow-up questions -->
      <div v-if="hasFollowUps" class="analysis-step__followups">
        <h3 class="analysis-step__section-title">{{ t('story.analysisFollowUps') }}</h3>
        <div
          v-for="q in store.analysisResult.value!.followUpQuestions"
          :key="q.id"
          class="analysis-step__followup"
        >
          <label :for="q.id" class="analysis-step__followup-label">{{ q.question }}</label>
          <scale-text-field
            :input-id="q.id"
            :value="followUpAnswers[q.id] || ''"
            @scaleChange="followUpAnswers[q.id] = ($event as CustomEvent).detail.value"
          />
        </div>
      </div>

      <!-- Actions -->
      <div class="analysis-step__actions">
        <scale-button
          v-if="hasFollowUps"
          :disabled="!allFollowUpsAnswered"
          @click="submitFollowUps"
        >
          {{ t('story.continue') }}
        </scale-button>
        <scale-button
          v-else
          @click="continueWithoutFollowUps"
        >
          {{ t('story.continue') }}
        </scale-button>
        <scale-button
          v-if="hasFollowUps"
          variant="secondary"
          @click="continueWithoutFollowUps"
        >
          {{ t('story.skipFollowUps') }}
        </scale-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.analysis-step {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  background: var(--telekom-color-background-surface, #fff);
  border-radius: 12px;
  border: 1px solid var(--telekom-color-ui-faint, #dfdfe1);
}

.analysis-step__header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.analysis-step__title {
  font-family: 'TeleNeo', sans-serif;
  font-size: 20px;
  font-weight: 800;
  color: var(--telekom-color-text-and-icon-standard, #000);
  margin: 0;
}

.analysis-step__subtitle {
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6f);
  margin: 0;
}

.analysis-step__choices {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.analysis-step__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px 0;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6f);
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
}

.analysis-step__spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--telekom-color-ui-faint, #dfdfe1);
  border-top-color: var(--telekom-color-primary-standard, #e20074);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.analysis-step__results {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.analysis-step__good {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--telekom-color-functional-success-subtle, #cce6d3);
  border-radius: 8px;
}

.analysis-step__good-icon {
  font-size: 18px;
  color: var(--telekom-color-functional-success-standard, #2c8646);
}

.analysis-step__good p {
  margin: 0;
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
  color: var(--telekom-color-text-and-icon-standard, #000);
}

.analysis-step__section-title {
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: var(--telekom-color-text-and-icon-standard, #000);
  margin: 0 0 8px;
}

.analysis-step__findings {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.analysis-step__followups {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.analysis-step__followup {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.analysis-step__followup-label {
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
  font-weight: 655;
  color: var(--telekom-color-text-and-icon-standard, #000);
}

.analysis-step__actions {
  display: flex;
  gap: 8px;
  padding-top: 8px;
}
</style>
