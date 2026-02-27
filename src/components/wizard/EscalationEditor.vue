<script setup lang="ts">
import { ref, computed } from 'vue'
import type { EscalationStep } from '@/types/event'
import { getPresets } from '@/data/escalation-presets'

const props = defineProps<{
  steps: EscalationStep[]
  escalationSuggested: boolean
  leadTime: string
}>()

const emit = defineEmits<{
  'update:steps': [steps: EscalationStep[]]
  'applyPreset': [presetId: string]
  'clearEscalation': []
}>()

const expanded = ref(props.escalationSuggested || props.steps.length > 0)
const presets = getPresets()

const activePresetId = computed(() => {
  for (const preset of presets) {
    if (
      preset.steps.length === props.steps.length &&
      preset.steps.every((ps, i) => props.steps[i]?.label === ps.label && props.steps[i]?.relativeDays === ps.relativeDays)
    ) {
      return preset.id
    }
  }
  return props.steps.length > 0 ? 'custom' : null
})

const isEnabled = computed(() => props.steps.length > 0)

function toggle() {
  expanded.value = !expanded.value
}

function selectPreset(presetId: string) {
  emit('applyPreset', presetId)
}

function disableEscalation() {
  emit('clearEscalation')
}

function addStep() {
  const newStep: EscalationStep = {
    id: `step_${Date.now()}`,
    label: '',
    relativeTime: '',
    relativeDays: 0,
    tone: '',
  }
  const updated = [...props.steps, newStep]
  emit('update:steps', updated)
}

function removeStep(index: number) {
  const updated = props.steps.filter((_, i) => i !== index)
  emit('update:steps', updated)
}

function updateStepField(index: number, field: keyof EscalationStep, value: string | number) {
  const updated = props.steps.map((s, i) => {
    if (i === index) return { ...s, [field]: value }
    return s
  })
  emit('update:steps', updated)
}
</script>

<template>
  <div class="escalation-editor">
    <button
      class="escalation-toggle"
      @click="toggle"
      :aria-expanded="expanded"
    >
      <span class="escalation-toggle__icon">{{ expanded ? '▾' : '▸' }}</span>
      <span>Escalation timeline</span>
      <scale-tag v-if="isEnabled" color="cyan" size="small">{{ steps.length }} steps</scale-tag>
      <scale-tag v-else-if="escalationSuggested" color="yellow" size="small">Suggested</scale-tag>
    </button>

    <Transition name="slide">
      <div v-if="expanded" class="escalation-content">
        <p class="escalation-content__note">
          Set up communication steps for this scheduled event. Each step produces its own message.
        </p>

        <!-- Preset selector -->
        <div class="escalation-presets">
          <label class="escalation-presets__label">Presets:</label>
          <div class="card-group card-group--row">
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
            <div
              v-if="isEnabled"
              class="mini-card mini-card--off"
              @click="disableEscalation"
              title="Disable escalation"
            >
              Off
            </div>
          </div>
        </div>

        <!-- Step list -->
        <div v-if="steps.length > 0" class="escalation-steps">
          <div
            v-for="(step, index) in steps"
            :key="step.id"
            class="escalation-step"
          >
            <div class="escalation-step__header">
              <span class="escalation-step__number">{{ index + 1 }}</span>
              <div class="escalation-step__fields">
                <div class="escalation-step__row">
                  <scale-text-field
                    label="Label"
                    :value="step.label"
                    @scaleChange="(e: CustomEvent) => updateStepField(index, 'label', e.detail.value ?? '')"
                    size="small"
                  />
                  <scale-text-field
                    label="Timing"
                    :value="step.relativeTime"
                    @scaleChange="(e: CustomEvent) => updateStepField(index, 'relativeTime', e.detail.value ?? '')"
                    size="small"
                    helper-text="e.g. &quot;7 days before&quot;, &quot;When it starts&quot;"
                  />
                </div>
                <scale-text-field
                  label="Tone guidance"
                  :value="step.tone"
                  @scaleChange="(e: CustomEvent) => updateStepField(index, 'tone', e.detail.value ?? '')"
                  size="small"
                  helper-text="How should the AI write this step?"
                />
              </div>
              <button
                class="escalation-step__remove"
                @click="removeStep(index)"
                title="Remove step"
                :disabled="steps.length <= 1"
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
            + Add step
          </scale-button>
        </div>

        <!-- Empty state when no steps and not suggested -->
        <div v-else class="escalation-empty">
          <p>No escalation steps yet. Select a preset to get started.</p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.escalation-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.escalation-toggle {
  background: none;
  border: none;
  padding: 0;
  font-size: 14px;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  cursor: pointer;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 8px;
}

.escalation-toggle:hover {
  color: var(--telekom-color-primary-standard, #e20074);
}

.escalation-toggle__icon {
  width: 12px;
  text-align: center;
}

.escalation-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: var(--telekom-color-background-surface-subtle, #f9f9f9);
  border-radius: 8px;
}

.escalation-content__note {
  font-size: 13px;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  margin: 0;
}

.escalation-presets {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.escalation-presets__label {
  font-size: 14px;
  font-weight: 500;
}

.card-group--row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.mini-card {
  padding: 8px 16px;
  border: 2px solid var(--telekom-color-ui-border-standard, #ccc);
  border-radius: 8px;
  cursor: pointer;
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

.mini-card--off {
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
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

.escalation-empty {
  font-size: 14px;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
}

.escalation-empty p {
  margin: 0;
}

/* Slide transition */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  max-height: 0;
}

.slide-enter-to,
.slide-leave-from {
  opacity: 1;
  max-height: 1000px;
}
</style>
