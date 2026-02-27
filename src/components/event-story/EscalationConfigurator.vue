<script setup lang="ts">
import { computed } from 'vue'
import type { EscalationStep } from '@/types/event'
import { getPresets } from '@/data/escalation-presets'
import { useEventStoryStore } from '@/stores/eventStoryStore'
import { useI18n } from '@/i18n'

const { t } = useI18n()
const store = useEventStoryStore()

const presets = getPresets()

const activePresetId = computed(() => {
  const steps = store.escalationSteps.value
  if (steps.length === 0) return null
  for (const preset of presets) {
    if (
      preset.steps.length === steps.length &&
      preset.steps.every((ps, i) => steps[i]?.label === ps.label && steps[i]?.relativeDays === ps.relativeDays)
    ) {
      return preset.id
    }
  }
  return 'custom'
})

const isEnabled = computed(() => store.escalationSteps.value.length > 0)

function selectPreset(presetId: string) {
  const preset = presets.find(p => p.id === presetId)
  if (preset) {
    store.setEscalationSteps(preset.steps.map(s => ({ ...s })))
  }
}

function disableEscalation() {
  store.setEscalationSteps([])
}

function addStep() {
  const newStep: EscalationStep = {
    id: `step_${Date.now()}`,
    label: '',
    relativeTime: '',
    relativeDays: 0,
    tone: '',
  }
  store.setEscalationSteps([...store.escalationSteps.value, newStep])
}

function removeStep(index: number) {
  store.setEscalationSteps(store.escalationSteps.value.filter((_, i) => i !== index))
}

function updateStepField(index: number, field: keyof EscalationStep, value: string | number) {
  const updated = store.escalationSteps.value.map((s, i) => {
    if (i === index) return { ...s, [field]: value }
    return s
  })
  store.setEscalationSteps(updated)
}
</script>

<template>
  <div class="escalation-config">
    <h3 class="escalation-config__title">{{ t('story.escalationTitle') }}</h3>
    <p class="escalation-config__desc">{{ t('story.escalationDesc') }}</p>

    <!-- Preset selector -->
    <div class="escalation-presets">
      <label class="escalation-presets__label">{{ t('story.escalationPresets') }}</label>
      <div class="card-group">
        <div
          class="mini-card"
          :class="{ 'mini-card--selected': !isEnabled }"
          @click="disableEscalation"
        >
          {{ t('story.escalationOff') }}
        </div>
        <div
          v-for="preset in presets"
          :key="preset.id"
          class="mini-card"
          :class="{ 'mini-card--selected': activePresetId === preset.id }"
          @click="selectPreset(preset.id)"
          :title="preset.description"
        >
          {{ preset.name }} ({{ preset.steps.length }})
        </div>
      </div>
    </div>

    <!-- Step list -->
    <div v-if="isEnabled" class="escalation-steps">
      <div
        v-for="(step, index) in store.escalationSteps.value"
        :key="step.id"
        class="escalation-step"
      >
        <div class="escalation-step__header">
          <span class="escalation-step__number">{{ index + 1 }}</span>
          <div class="escalation-step__fields">
            <div class="escalation-step__row">
              <scale-text-field
                :label="t('story.escalationStepLabel')"
                :value="step.label"
                @scaleChange="(e: CustomEvent) => updateStepField(index, 'label', e.detail.value ?? '')"
                size="small"
              />
              <scale-text-field
                :label="t('story.escalationStepTiming')"
                :value="step.relativeTime"
                @scaleChange="(e: CustomEvent) => updateStepField(index, 'relativeTime', e.detail.value ?? '')"
                size="small"
              />
            </div>
            <scale-text-field
              :label="t('story.escalationStepTone')"
              :value="step.tone"
              @scaleChange="(e: CustomEvent) => updateStepField(index, 'tone', e.detail.value ?? '')"
              size="small"
            />
          </div>
          <button
            class="escalation-step__remove"
            @click="removeStep(index)"
            :title="t('story.escalationRemoveStep')"
            :disabled="store.escalationSteps.value.length <= 1"
          >
            ✕
          </button>
        </div>
      </div>

      <scale-button
        variant="secondary"
        size="small"
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

.escalation-presets {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.escalation-presets__label {
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
  font-weight: 500;
}

.card-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.mini-card {
  padding: 8px 16px;
  border: 2px solid var(--telekom-color-ui-border-standard, #ccc);
  border-radius: 8px;
  cursor: pointer;
  font-family: 'TeleNeo', sans-serif;
  font-size: 13px;
  font-weight: 700;
  transition: border-color 0.15s, background 0.15s;
}

.mini-card:hover {
  border-color: var(--telekom-color-primary-standard, #e20074);
  background: rgba(226, 0, 116, 0.06);
}

.mini-card--selected {
  border-color: var(--telekom-color-primary-standard, #e20074);
  background: rgba(226, 0, 116, 0.08);
  color: var(--telekom-color-primary-standard, #e20074);
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
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.escalation-step__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.escalation-step__remove {
  background: none;
  border: none;
  font-size: 16px;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  flex-shrink: 0;
}

.escalation-step__remove:hover:not(:disabled) {
  color: var(--telekom-color-functional-danger-standard, #e82010);
  background: rgba(232, 32, 16, 0.06);
}

.escalation-step__remove:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
</style>
