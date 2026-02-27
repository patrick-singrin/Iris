<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import StoryQuestion from './StoryQuestion.vue'
import HistoryIntroCard from './HistoryIntroCard.vue'
import HistoryItem from './HistoryItem.vue'
import AnalysisChoiceCard from './AnalysisChoiceCard.vue'
import AnalysisFinding from './AnalysisFinding.vue'
import { useEventStoryStore } from '@/stores/eventStoryStore'
import { getStoryQuestions } from '@/data/story-questions'
import { useI18n } from '@/i18n'

const { t } = useI18n()
const {
  answers,
  checklist,
  currentQuestion,
  isExtracting,
  interviewComplete,
  analysisError,
  analysisChoice,
  followUpsDone,
  analysisResult,
  isAnalyzing,
  currentFollowUp,
  answerQuestion,
  dismissError,
  retryAnalysis,
  selectAnalysisChoice,
  startFollowUpQueue,
  answerFollowUp,
  skipFollowUps,
  resetSession,
} = useEventStoryStore()

// Track whether follow-up queue has been started (so we only start once)
const followUpQueueStarted = ref(false)

function handleAnswer(selectedOptions: string[], freeformText: string) {
  if (!currentQuestion.value) return
  answerQuestion(currentQuestion.value.id, selectedOptions, freeformText)
}

function handleAnalysisChoice(choice: 'analyze' | 'skip') {
  selectAnalysisChoice(choice)
}

function handleFollowUpAnswer(selectedOptions: string[], freeformText: string) {
  answerFollowUp(selectedOptions, freeformText)
}

function handleFollowUpSkip() {
  skipFollowUps()
}

// Start follow-up queue when analysis results arrive with follow-up questions
watch(
  () => analysisResult.value?.followUpQuestions?.length,
  (len) => {
    if (len && len > 0 && !followUpQueueStarted.value && !followUpsDone.value) {
      followUpQueueStarted.value = true
      startFollowUpQueue()
    }
  },
  { immediate: true },
)

// Format an answer for display
function formatAnswer(selectedOptions: string[], freeformText: string, questionId: string): string {
  // Strip verify_ prefix to find the original question definition
  const baseId = questionId.replace(/^verify_/, '')
  const def = getStoryQuestions().find(q => q.id === baseId)

  if (selectedOptions.length > 0) {
    // For confirmed verifications, show the actual value from the checklist
    if (selectedOptions.includes('__confirm__')) {
      const item = checklist.value.find(i => i.id === baseId)
      if (item?.description) return item.description
      if (item?.value) {
        if (Array.isArray(item.value)) {
          return item.value.map(v => {
            const opt = def?.options.find(o => o.value === v)
            return opt ? opt.label : v
          }).join(', ')
        }
        const opt = def?.options.find(o => o.value === item.value)
        return opt ? opt.label : String(item.value)
      }
      return t('story.confirmed')
    }
    const labels = selectedOptions.map(v => {
      if (def) {
        const opt = def.options.find(o => o.value === v)
        return opt ? opt.label : v
      }
      return v
    })
    const result = labels.join(', ')
    return freeformText ? `${result} — ${freeformText}` : result
  }
  return freeformText || ''
}

// Auto-scroll history to bottom when new answers arrive
const historyRef = ref<HTMLDivElement>()
watch(
  () => answers.value.length,
  async () => {
    await nextTick()
    if (historyRef.value) {
      historyRef.value.scrollTop = historyRef.value.scrollHeight
    }
  },
)
</script>

<template>
  <div class="story-dialog">
    <!-- History area — scrollable list of past answers -->
    <div ref="historyRef" class="story-dialog__history">
      <!-- New Event button — scrolls with history -->
      <div class="story-dialog__toolbar">
        <scale-button variant="secondary" size="small" @click="resetSession">
          {{ t('story.newEvent') }}
        </scale-button>
      </div>
      <HistoryIntroCard />
      <HistoryItem
        v-for="(a, idx) in answers"
        :key="idx"
        :type="a.origin === 'verify' ? 'confirmation' : 'question'"
        :question-text="a.questionText"
        :answer-text="formatAnswer(a.selectedOptions, a.freeformText, a.questionId)"
      />
    </div>

    <!-- Error banner — shown when LLM analysis fails -->
    <div v-if="analysisError" class="story-dialog__error-wrapper">
      <scale-notification
        variant="danger"
        :opened="true"
        @scale-close="dismissError"
      >
        {{ analysisError }}
      </scale-notification>
      <div class="story-dialog__error-actions">
        <scale-button size="small" variant="secondary" @click="retryAnalysis">
          {{ t('story.retry') }}
        </scale-button>
      </div>
    </div>

    <!-- Input area -->
    <div class="story-dialog__input">
      <!-- Thinking card — shown while LLM processes (replaces question panel) -->
      <div v-if="isExtracting" class="thinking-card" role="status" aria-live="polite">
        <div class="thinking-card__dot" />
        <span class="thinking-card__text">{{ t('story.analyzing') }}</span>
      </div>

      <!-- Current question panel -->
      <StoryQuestion
        v-else-if="currentQuestion"
        :key="currentQuestion.id"
        :question="currentQuestion"
        @answer="handleAnswer"
      />

      <!-- Analysis choice (interview complete, no choice yet) -->
      <AnalysisChoiceCard
        v-else-if="interviewComplete && !analysisChoice"
        @select="handleAnalysisChoice"
      />

      <!-- Holistic analysis in progress -->
      <div v-else-if="isAnalyzing" class="thinking-card" role="status" aria-live="polite">
        <div class="thinking-card__dot" />
        <span class="thinking-card__text">{{ t('story.analyzingContext') }}</span>
      </div>

      <!-- Follow-up questions from analysis (one at a time) -->
      <template v-else-if="currentFollowUp">
        <!-- Findings summary above the first follow-up -->
        <div v-if="analysisResult?.findings?.length" class="story-dialog__findings">
          <AnalysisFinding
            v-for="(f, idx) in analysisResult.findings"
            :key="idx"
            :finding="f"
          />
        </div>

        <StoryQuestion
          :key="currentFollowUp.id"
          :question="currentFollowUp"
          @answer="handleFollowUpAnswer"
        />

        <div class="story-dialog__skip-row">
          <scale-button variant="secondary" size="small" @click="handleFollowUpSkip">
            {{ t('story.skipFollowUps') }}
          </scale-button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.story-dialog {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

/* Toolbar — New Event button + product context badge, inside the scroll area */
.story-dialog__toolbar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
}

/* History — scrollable answer list, takes available space */
.story-dialog__history {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  padding-top: 16px;
  padding-bottom: 16px;
  /* Hide scrollbar but allow scrolling */
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.15) transparent;
}

/* Error banner wrapper — constrains width to match content area */
.story-dialog__error-wrapper {
  width: 100%;
  max-width: 640px;
  margin: 0 auto 12px;
}

.story-dialog__error-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

/* Input area — at the bottom, same width constraints as history */
.story-dialog__input {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 0;
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  padding-bottom: 16px;
}

/* Findings summary — shown above follow-up questions */
.story-dialog__findings {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  margin-bottom: 8px;
}

/* Skip row — right-aligned skip button below follow-up question */
.story-dialog__skip-row {
  display: flex;
  justify-content: flex-end;
  width: 100%;
}

/* Thinking card — replaces question panel during LLM analysis */
.thinking-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px;
  width: 100%;
  box-sizing: border-box;
  background: var(--telekom-color-background-surface, #fff);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
}

.thinking-card__dot {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--telekom-color-primary-standard, #e20074);
  animation: pulse-dot 1.2s ease-in-out infinite;
}

.thinking-card__text {
  font-family: 'TeleNeo', sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 22.4px;
  color: var(--telekom-color-text-and-icon-standard, #000000);
}

@keyframes pulse-dot {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}
</style>
