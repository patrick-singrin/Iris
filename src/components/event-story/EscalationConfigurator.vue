<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { TIMING_OPTIONS, DEFAULT_TIMING_ID, getTimingById, createDefaultStep } from '@/data/escalation-timing'
import type { TimingOption } from '@/data/escalation-timing'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useEventStoryStore } from '@/stores/eventStoryStore'
import { useI18n } from '@/i18n'

const { t } = useI18n()
const store = useEventStoryStore()

const collapsed = ref(false)
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
  const usedIds = new Set(store.escalationSteps.value.map(s => s.timingId))
  const firstAvailable = TIMING_OPTIONS.find(opt => !usedIds.has(opt.id))
  if (!firstAvailable) return

  const newStep = createDefaultStep(store.escalationSteps.value.length)
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
  <div class="esc-section" :class="{ 'esc-section--collapsed': collapsed }">
    <!-- Header -->
    <div class="esc-section__header">
      <div class="esc-section__header-text">
        <div class="esc-section__headline">
          <span class="esc-section__title">{{ t('story.escalationTitle') }}</span>
          <span class="esc-section__count">({{ store.escalationSteps.value.length }})</span>
        </div>
        <p class="esc-section__desc">{{ t('story.escalationDesc') }}</p>
      </div>
      <button
        class="esc-section__toggle"
        @click="collapsed = !collapsed"
        :aria-label="collapsed ? t('a11y.expand') : t('a11y.collapse')"
      >
        <AppIcon :name="collapsed ? 'chevron-down' : 'chevron-up'" :size="20" :stroke-width="2" />
      </button>
    </div>

    <!-- Collapsible body -->
    <div v-if="!collapsed" class="esc-section__body">
      <!-- Step tiles -->
      <div class="esc-section__steps">
        <div
          v-for="(step, index) in store.escalationSteps.value"
          :key="step.id"
          class="esc-tile"
        >
          <div class="esc-tile__left">
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

          <div class="esc-tile__right">
            <!-- Delete confirm overlay -->
            <div v-if="confirmingDeleteIndex === index" class="esc-tile__confirm">
              <span class="esc-tile__confirm-text">{{ t('story.escalationDeleteConfirm') }}</span>
              <button class="esc-tile__confirm-cancel" @click="cancelDelete">
                {{ t('story.escalationDeleteNo') }}
              </button>
              <button class="esc-tile__confirm-delete" @click="confirmDelete(index)">
                {{ t('story.escalationDeleteYes') }}
              </button>
            </div>
            <template v-else>
              <button
                class="esc-tile__delete-btn"
                @click="requestDelete(index)"
                :title="t('story.escalationDeleteStep')"
              >
                <AppIcon name="trash-2" :size="20" :stroke-width="1.5" />
              </button>
              <scale-button
                variant="secondary"
                :disabled="generatingStepId === step.id || store.isGeneratingText.value"
                @click="generateStep(step.id)"
              >
                <scale-icon-action-refresh></scale-icon-action-refresh>
                {{ generatingStepId === step.id ? t('story.generating') : t('story.escalationGenerateStep') }}
              </scale-button>
            </template>
          </div>
        </div>
      </div>

      <!-- Add step button -->
      <scale-button
        variant="secondary"
        size="small"
        :disabled="store.escalationSteps.value.length >= TIMING_OPTIONS.length"
        @click="addStep"
      >
        <scale-icon-action-add></scale-icon-action-add>
        {{ t('story.escalationAddStep') }}
      </scale-button>
    </div>
  </div>
</template>

<style scoped>
.esc-section {
  background: var(--telekom-color-background-canvas-subtle, #fbfbfb);
  border: 1px solid var(--telekom-color-ui-faint, #dfdfe1);
  border-radius: 4px;
  padding: 16px;
}

.esc-section__header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.esc-section__header-text {
  flex: 1;
  min-width: 0;
}

.esc-section__headline {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.esc-section__title {
  font-family: 'TeleNeo', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: var(--telekom-color-text-and-icon-standard, #000);
}

.esc-section__count {
  font-family: 'TeleNeo', sans-serif;
  font-size: 16px;
  font-weight: 400;
  color: var(--telekom-color-text-and-icon-standard, #000);
}

.esc-section__desc {
  font-family: 'TeleNeo', sans-serif;
  font-size: 16px;
  font-weight: 400;
  color: var(--telekom-color-text-and-icon-standard, #000);
  margin: 0;
}

.esc-section__toggle {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid rgba(0, 0, 0, 0.44);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}

.esc-section__toggle:hover {
  background: var(--telekom-color-background-surface, #fff);
}

.esc-section__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}

.esc-section__steps {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Escalation tile — single row card (.tile-escalation from Figma) */
.esc-tile {
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  gap: 16px;
  height: 68px;
  background: var(--telekom-color-background-surface, #ffffff);
  border: 1px solid var(--telekom-color-ui-faint, #dfdfe1);
  border-radius: 8px;
  align-self: stretch;
}

.esc-tile__left {
  flex: 0 0 auto;
  min-width: 200px;
}

.esc-tile__right {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.esc-tile__delete-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: var(--telekom-color-functional-danger-standard, #e82010);
  transition: background 0.15s;
}

.esc-tile__delete-btn:hover {
  background: rgba(232, 32, 16, 0.06);
}

/* Delete confirmation inline */
.esc-tile__confirm {
  display: flex;
  align-items: center;
  gap: 8px;
}

.esc-tile__confirm-text {
  font-family: 'TeleNeo', sans-serif;
  font-size: 13px;
  color: var(--telekom-color-functional-danger-standard, #e82010);
}

.esc-tile__confirm-cancel {
  background: none;
  border: 1px solid var(--telekom-color-ui-border-standard, #ccc);
  border-radius: 6px;
  padding: 4px 12px;
  font-family: 'TeleNeo', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6f);
  cursor: pointer;
}

.esc-tile__confirm-delete {
  background: var(--telekom-color-functional-danger-standard, #e82010);
  color: var(--telekom-color-text-and-icon-white-standard, #fff);
  border: none;
  border-radius: 6px;
  padding: 4px 12px;
  font-family: 'TeleNeo', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
</style>
