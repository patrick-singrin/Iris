<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { TIMING_OPTIONS, DEFAULT_TIMING_ID, getTimingById, createDefaultStep } from '@/data/escalation-timing'
import type { TimingOption } from '@/data/escalation-timing'
import { useEventStoryStore } from '@/stores/eventStoryStore'
import { useI18n } from '@/i18n'

const { t } = useI18n()
const store = useEventStoryStore()

const confirmingDeleteIndex = ref<number | null>(null)
const generatingStepId = ref<string | null>(null)

// Ensure at least one default step exists on mount
onMounted(() => {
  if (store.escalationSteps.value.length === 0) {
    store.setEscalationSteps([createDefaultStep(0)])
  }
})

/** Return timing options not yet used by other steps. */
function availableTimings(currentIndex: number): TimingOption[] {
  const usedIds = new Set(
    store.escalationSteps.value
      .filter((_, i) => i !== currentIndex)
      .map(s => s.timingId),
  )
  return TIMING_OPTIONS.filter(opt => !usedIds.has(opt.id))
}

function addStep() {
  // Pick the first unused timing option
  const usedIds = new Set(store.escalationSteps.value.map(s => s.timingId))
  const firstAvailable = TIMING_OPTIONS.find(opt => !usedIds.has(opt.id))
  if (!firstAvailable) return // All timings used

  const newStep = createDefaultStep(store.escalationSteps.value.length)
  // Override with first available timing
  newStep.label = firstAvailable.label
  newStep.timingId = firstAvailable.id
  newStep.relativeTime = firstAvailable.relativeTime
  newStep.relativeDays = firstAvailable.relativeDays
  newStep.tone = firstAvailable.tone
  store.setEscalationSteps([...store.escalationSteps.value, newStep])
}

function updateTiming(index: number, timingId: string) {
  const timing = getTimingById(timingId)
  if (!timing) return
  const updated = store.escalationSteps.value.map((s, i) => {
    if (i === index) {
      return {
        ...s,
        label: timing.label,
        timingId: timing.id,
        relativeTime: timing.relativeTime,
        relativeDays: timing.relativeDays,
        tone: timing.tone,
      }
    }
    return s
  })
  store.setEscalationSteps(updated)
}

function requestDelete(index: number) {
  confirmingDeleteIndex.value = index
}

function confirmDelete(index: number) {
  const step = store.escalationSteps.value[index]
  if (step) {
    store.deleteStep(step.id)
  }
  confirmingDeleteIndex.value = null
}

function cancelDelete() {
  confirmingDeleteIndex.value = null
}

async function generateStep(stepId: string) {
  generatingStepId.value = stepId
  try {
    await store.regenerateForStep(stepId)
  } finally {
    generatingStepId.value = null
  }
}
</script>

<template>
  <div class="escalation-config">
    <h3 class="escalation-config__title">{{ t('story.escalationTitle') }}</h3>
    <p class="escalation-config__desc">{{ t('story.escalationDesc') }}</p>

    <!-- Step list -->
    <div class="escalation-steps">
      <div
        v-for="(step, index) in store.escalationSteps.value"
        :key="step.id"
        class="escalation-step"
      >
        <div class="escalation-step__header">
          <span class="escalation-step__number">{{ index + 1 }}</span>
          <div class="escalation-step__fields">
            <scale-dropdown-select
              :label="t('story.escalationStepTiming')"
              :value="step.timingId || DEFAULT_TIMING_ID"
              @scale-change="(e: Event) => updateTiming(index, (e as CustomEvent).detail?.value)"
            >
              <scale-dropdown-select-item
                v-for="opt in availableTimings(index)"
                :key="opt.id"
                :value="opt.id"
                :selected="(step.timingId || DEFAULT_TIMING_ID) === opt.id"
              >
                {{ opt.label }}
              </scale-dropdown-select-item>
            </scale-dropdown-select>
          </div>
        </div>

        <!-- Step actions -->
        <div class="escalation-step__actions">
          <scale-button
            variant="secondary"
            size="small"
            :disabled="generatingStepId === step.id || store.isGeneratingText.value"
            @click="generateStep(step.id)"
          >
            {{ generatingStepId === step.id ? t('story.generating') : t('story.escalationGenerateStep') }}
          </scale-button>
          <button
            class="escalation-step__delete-btn"
            @click="requestDelete(index)"
            :title="t('story.escalationDeleteStep')"
          >
            {{ t('story.escalationDeleteStep') }}
          </button>
        </div>

        <!-- Delete confirmation -->
        <div v-if="confirmingDeleteIndex === index" class="escalation-step__confirm">
          <span class="escalation-step__confirm-text">{{ t('story.escalationDeleteConfirm') }}</span>
          <div class="escalation-step__confirm-actions">
            <scale-button
              variant="secondary"
              size="small"
              @click="cancelDelete"
            >
              {{ t('story.escalationDeleteNo') }}
            </scale-button>
            <button
              class="escalation-step__confirm-delete"
              @click="confirmDelete(index)"
            >
              {{ t('story.escalationDeleteYes') }}
            </button>
          </div>
        </div>
      </div>

      <scale-button
        variant="secondary"
        size="small"
        :disabled="store.escalationSteps.value.length >= TIMING_OPTIONS.length"
        @click="addStep"
      >
        {{ t('story.escalationAddStep') }}
      </scale-button>
    </div>
  </div>
</template>

<style scoped>
.escalation-config {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.escalation-config__title {
  font-family: 'TeleNeo', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: var(--telekom-color-text-and-icon-standard, #000);
  margin: 0;
}

.escalation-config__desc {
  font-family: 'TeleNeo', sans-serif;
  font-size: 13px;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6f);
  margin: 0;
}

.escalation-steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.escalation-step {
  background: var(--telekom-color-background-surface, #fff);
  border: 1px solid var(--telekom-color-ui-border-standard, #ccc);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.escalation-step__header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.escalation-step__number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--telekom-color-primary-standard, #e20074);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
  margin-top: 4px;
}

.escalation-step__fields {
  flex: 1;
}

.escalation-step__actions {
  display: flex;
  gap: 8px;
  padding-left: 36px;
}

.escalation-step__delete-btn {
  background: none;
  border: 1px solid var(--telekom-color-ui-border-standard, #ccc);
  border-radius: 6px;
  padding: 6px 14px;
  font-family: 'TeleNeo', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6f);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}

.escalation-step__delete-btn:hover {
  color: var(--telekom-color-functional-danger-standard, #e82010);
  border-color: var(--telekom-color-functional-danger-standard, #e82010);
  background: rgba(232, 32, 16, 0.06);
}

.escalation-step__confirm {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  margin-left: 36px;
  background: rgba(232, 32, 16, 0.04);
  border: 1px solid rgba(232, 32, 16, 0.2);
  border-radius: 6px;
}

.escalation-step__confirm-text {
  flex: 1;
  font-family: 'TeleNeo', sans-serif;
  font-size: 13px;
  color: var(--telekom-color-functional-danger-standard, #e82010);
}

.escalation-step__confirm-actions {
  display: flex;
  gap: 8px;
}

.escalation-step__confirm-delete {
  background: var(--telekom-color-functional-danger-standard, #e82010);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 6px 14px;
  font-family: 'TeleNeo', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.escalation-step__confirm-delete:hover {
  background: #c91a0d;
}
</style>
