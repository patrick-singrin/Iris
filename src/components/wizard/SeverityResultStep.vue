<script setup lang="ts">
import { ref, computed } from 'vue'
import type { SeverityResult } from '@/services/severityMatrix'
import type { EscalationStep } from '@/types/event'
import EscalationEditor from './EscalationEditor.vue'

const props = defineProps<{
  severityResult: SeverityResult
  effectiveSeverity: string | null
  severityOverride: { originalSeverity: string; overriddenSeverity: string; justification: string } | null
  escalationSteps: EscalationStep[]
  escalationSuggested: boolean
  leadTime: string
  isScheduled: boolean
}>()

const emit = defineEmits<{
  override: [severity: string, justification: string]
  clearOverride: []
  updateEscalationSteps: [steps: EscalationStep[]]
  applyPreset: [presetId: string]
  clearEscalation: []
}>()

const showOverride = ref(false)
const overrideSeverity = ref('')
const overrideJustification = ref('')

const defaultConfig = { color: 'var(--telekom-color-functional-warning-standard, #f97012)', iconColor: '#f97012', tagColor: 'yellow' }

const severityConfig = computed(() => {
  const sev = props.effectiveSeverity || props.severityResult.severity
  const configs: Record<string, { color: string; iconColor: string; tagColor: string }> = {
    CRITICAL: { color: 'var(--telekom-color-functional-danger-standard, #e82010)', iconColor: '#e82010', tagColor: 'red' },
    HIGH: { color: 'var(--telekom-color-functional-warning-standard, #f97012)', iconColor: '#f97012', tagColor: 'orange' },
    MEDIUM: defaultConfig,
    LOW: { color: 'var(--telekom-color-functional-success-standard, #00b367)', iconColor: '#00b367', tagColor: 'green' },
  }
  return configs[sev] || defaultConfig
})

const severityOptions = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

function submitOverride() {
  if (overrideSeverity.value && overrideJustification.value.trim()) {
    emit('override', overrideSeverity.value, overrideJustification.value.trim())
    showOverride.value = false
  }
}

function removeOverride() {
  emit('clearOverride')
  overrideSeverity.value = ''
  overrideJustification.value = ''
  showOverride.value = false
}
</script>

<template>
  <div class="severity-result">
    <div class="severity-card" :style="{ borderLeftColor: severityConfig.color }">
      <div class="severity-card__header">
        <span class="severity-card__icon" :style="{ background: severityConfig.iconColor }"></span>
        <scale-tag :type="'strong'" :color="severityConfig.tagColor" size="small">
          {{ effectiveSeverity || severityResult.severity }}
        </scale-tag>
        <span v-if="severityOverride" class="severity-card__overridden">
          (overridden from {{ severityOverride.originalSeverity }})
        </span>
      </div>

      <p class="severity-card__explanation">
        {{ severityResult.explanation }}
      </p>

      <div class="severity-card__channels">
        <label class="severity-card__channels-label">Communication channels:</label>
        <div class="severity-card__channel-list">
          <scale-tag
            v-for="channel in severityResult.channels"
            :key="channel"
            size="small"
            color="cyan"
          >
            {{ channel }}
          </scale-tag>
        </div>
      </div>

      <div v-if="severityResult.trigger" class="severity-card__trigger">
        <strong>Trigger:</strong> {{ severityResult.trigger }}
      </div>
    </div>

    <!-- Override Section -->
    <div class="override-section">
      <div v-if="severityOverride" class="override-active">
        <scale-notification variant="warning" heading="Severity override active" opened>
          Changed from {{ severityOverride.originalSeverity }} to {{ severityOverride.overriddenSeverity }}.
          Reason: {{ severityOverride.justification }}
        </scale-notification>
        <scale-button variant="secondary" size="small" @click="removeOverride">
          Remove override
        </scale-button>
      </div>

      <div v-else>
        <button
          class="override-toggle"
          @click="showOverride = !showOverride"
          :aria-expanded="showOverride"
        >
          {{ showOverride ? '▾ Hide override' : '▸ Override severity' }}
        </button>

        <Transition name="slide">
          <div v-if="showOverride" class="override-form">
            <p class="override-form__note">
              Choose a different severity if the situation requires it.
              A justification is required.
            </p>
            <div class="override-form__fields">
              <div class="override-form__select">
                <label>New severity:</label>
                <div class="card-group card-group--row">
                  <div
                    v-for="sev in severityOptions"
                    :key="sev"
                    class="mini-card"
                    :class="{ 'mini-card--selected': overrideSeverity === sev }"
                    @click="overrideSeverity = sev"
                  >
                    {{ sev }}
                  </div>
                </div>
              </div>
              <scale-textarea
                label="Justification"
                :value="overrideJustification"
                @scaleChange="(e: CustomEvent) => overrideJustification = e.detail.value ?? ''"
                rows="2"
                helper-text="Why are you changing the severity?"
              ></scale-textarea>
              <scale-button
                variant="secondary"
                size="small"
                :disabled="!overrideSeverity || !overrideJustification.trim()"
                @click="submitOverride"
              >
                Apply override
              </scale-button>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Escalation Timeline (only for scheduled events) -->
    <EscalationEditor
      v-if="isScheduled"
      :steps="escalationSteps"
      :escalation-suggested="escalationSuggested"
      :lead-time="leadTime"
      @update:steps="emit('updateEscalationSteps', $event)"
      @apply-preset="emit('applyPreset', $event)"
      @clear-escalation="emit('clearEscalation')"
    />
  </div>
</template>

<style scoped>
.severity-result {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.severity-card {
  background: var(--telekom-color-background-surface, #fff);
  border: 1px solid var(--telekom-color-ui-border-standard, #ccc);
  border-left: 4px solid;
  border-radius: 8px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.severity-card__header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.severity-card__icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  flex-shrink: 0;
}

.severity-card__overridden {
  font-size: 13px;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  font-style: italic;
}

.severity-card__explanation {
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
  color: var(--telekom-color-text-and-icon-standard, #191919);
}

.severity-card__channels {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.severity-card__channels-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
}

.severity-card__channel-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.severity-card__trigger {
  font-size: 13px;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
}

/* Override section */
.override-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.override-active {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.override-toggle {
  background: none;
  border: none;
  padding: 0;
  font-size: 14px;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  cursor: pointer;
  text-align: left;
}

.override-toggle:hover {
  color: var(--telekom-color-primary-standard, #e20074);
}

.override-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: var(--telekom-color-background-surface-subtle, #f9f9f9);
  border-radius: 8px;
}

.override-form__note {
  font-size: 13px;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  margin: 0;
}

.override-form__fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.override-form__select {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.override-form__select label {
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
  max-height: 500px;
}
</style>
