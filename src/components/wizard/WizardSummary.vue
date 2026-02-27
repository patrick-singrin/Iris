<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { EventDescription, Classification, TypeContext, GeneratedText } from '@/types/event'
import { hasEscalationSteps, isEscalationEnabled } from '@/types/event'
import { useEventStore } from '@/stores/eventStore'
import { useTextGenerationStore } from '@/stores/textGenerationStore'
import { useAppStore } from '@/stores/appStore'
import TextGenerationContainer from '@/components/text-generation/TextGenerationContainer.vue'

const props = defineProps<{
  description: EventDescription
  classification: Classification
  isNotification: boolean
  typeContext?: TypeContext | null
}>()

const emit = defineEmits<{
  reset: []
  back: []
  editStep: [phase: string]
}>()

const { createEvent } = useEventStore()
const { getGeneratedText, reset: resetTextGen } = useTextGenerationStore()
const { setView } = useAppStore()

const showTextGeneration = ref(false)
const saved = ref(false)
const confirmingSave = ref(false)

// Auto-trigger text generation for non-notification types (simpler templates)
onMounted(() => {
  if (!props.isNotification) {
    showTextGeneration.value = true
  }
})

function startTextGeneration() {
  showTextGeneration.value = true
}

function requestSave() {
  confirmingSave.value = true
}

function cancelSave() {
  confirmingSave.value = false
}

function handleSaveEvent() {
  const text: GeneratedText | null = showTextGeneration.value ? getGeneratedText() : null
  createEvent(props.description, props.classification, text, props.typeContext || null)
  confirmingSave.value = false
  saved.value = true
}

function handleStartNew() {
  resetTextGen()
  saved.value = false
  showTextGeneration.value = false
  emit('reset')
}

function handleViewEvents() {
  setView('documentation')
}

// ── Impact Assessment labels (Notification only) ──

const impactLabels: Record<string, string> = {
  blocked: 'Blocked — users cannot complete tasks',
  degraded: 'Degraded — reduced service quality',
  no_impact: 'No direct impact',
}

const scopeLabels: Record<string, string> = {
  widespread: 'Widespread (significant portion of users)',
  limited: 'Limited (specific users or teams)',
}

const workaroundLabels: Record<string, string> = {
  yes_documented: 'Yes, documented',
  yes_complex: 'Yes, but complex',
  no: 'No workaround available',
}

const actionLabels: Record<string, string> = {
  mandatory: 'Yes, mandatory',
  recommended: 'Yes, recommended',
  no: 'No action required',
}

const leadTimeLabels: Record<string, string> = {
  less_than_24h: 'Less than 24 hours',
  '1_to_7_days': '1–7 days',
  more_than_7_days: 'More than 7 days',
}

// ── Type Context labels (Non-notification) ──

const errorTypeLabels: Record<string, string> = {
  system_error: 'System/server error',
  permission_error: 'Permission/access error',
  resource_error: 'Resource unavailable or exceeded',
  network_error: 'Network/connection error',
  input_error: 'Invalid user input',
}

const validationTypeLabels: Record<string, string> = {
  format: 'Format validation',
  required: 'Required field',
  range: 'Value range',
  dependency: 'Field dependency',
  uniqueness: 'Uniqueness check',
}

const toneLabels: Record<string, string> = {
  neutral: 'Neutral, factual',
  apologetic: 'Apologetic',
  urgent: 'Urgent',
}

const typeContextTitle: Record<string, string> = {
  error_warning: 'Error & Warning Context',
  validation: 'Validation Context',
  transactional_confirmation: 'Confirmation Context',
  feedback: 'Feedback Context',
  status_display: 'Status Display Context',
}
</script>

<template>
  <div class="summary">
    <h2>Event Summary</h2>

    <!-- Classification Result Banner -->
    <div class="summary__result">
      <div class="summary__result-type">
        <scale-tag color="teal">{{ classification.type }}</scale-tag>
        <scale-tag
          v-if="classification.severity"
          :color="classification.severity === 'CRITICAL' ? 'red' : classification.severity === 'HIGH' ? 'orange' : classification.severity === 'MEDIUM' ? 'yellow' : 'green'"
          type="strong"
        >
          {{ classification.severity }}
        </scale-tag>
        <scale-tag
          v-if="isEscalationEnabled(classification.escalation)"
          color="yellow"
        >
          Escalation: {{ hasEscalationSteps(classification.escalation) ? classification.escalation.length + ' steps' : 'Yes' }}
        </scale-tag>
      </div>
      <div v-if="classification.channels.length > 0" class="summary__channels">
        <strong>Channels:</strong>
        <span class="summary__channel-list">
          <scale-tag v-for="ch in classification.channels" :key="ch" color="standard" size="small" :title="ch">
            {{ ch }}
          </scale-tag>
        </span>
      </div>
      <div v-if="classification.trigger" class="summary__trigger">
        <strong>Trigger:</strong> {{ classification.trigger }}
      </div>
      <div v-if="classification.severityExplanation" class="summary__explanation">
        {{ classification.severityExplanation }}
      </div>
      <div v-if="classification.severityOverride" class="summary__override">
        <scale-tag color="yellow" size="small">Overridden</scale-tag>
        <span>
          from {{ classification.severityOverride.originalSeverity }} to {{ classification.severityOverride.overriddenSeverity }}
          — {{ classification.severityOverride.justification }}
        </span>
      </div>
    </div>

    <!-- ═══ Notification: Impact Assessment ═══ -->
    <details v-if="isNotification" class="summary__section" open>
      <summary>
        <strong>Impact Assessment</strong>
        <button v-if="!saved" class="summary__edit-btn" @click.prevent="emit('editStep', 'IMPACT_ASSESSMENT')">Edit</button>
      </summary>
      <div class="summary__content">
        <dl>
          <dt>Who is affected</dt>
          <dd>
            {{ description.whoAffected.join(', ') || 'N/A' }}
            <span v-if="description.whoAffectedCustom"> ({{ description.whoAffectedCustom }})</span>
          </dd>

          <dt>User impact</dt>
          <dd>{{ impactLabels[description.userImpact] || 'N/A' }}</dd>

          <template v-if="description.userImpact && description.userImpact !== 'no_impact'">
            <dt>Scope</dt>
            <dd>{{ scopeLabels[description.userScope] || 'N/A' }}</dd>

            <dt>Workaround</dt>
            <dd>{{ workaroundLabels[description.workaroundAvailable] || 'N/A' }}</dd>
          </template>

          <dt>Action required</dt>
          <dd>
            {{ actionLabels[description.actionRequired] || 'N/A' }}
            <span v-if="description.actionDescription && description.actionRequired !== 'no'">
              — {{ description.actionDescription }}
            </span>
          </dd>

          <dt>Timing</dt>
          <dd>
            {{ description.timing === 'now' ? 'Happening now' : description.timing === 'scheduled' ? 'Scheduled' : 'N/A' }}
          </dd>

          <template v-if="description.timing === 'scheduled' && description.leadTime">
            <dt>Lead time</dt>
            <dd>{{ leadTimeLabels[description.leadTime] || 'N/A' }}</dd>
          </template>

          <dt>Security / compliance</dt>
          <dd>
            <template v-if="description.securityCompliance === true">Yes</template>
            <template v-else-if="description.securityCompliance === false">No</template>
            <template v-else>N/A</template>
          </dd>
        </dl>
      </div>
    </details>

    <!-- ═══ Notification: Escalation Timeline ═══ -->
    <details
      v-if="isNotification && hasEscalationSteps(classification.escalation)"
      class="summary__section"
      open
    >
      <summary>
        <strong>Escalation Timeline</strong>
        <button v-if="!saved" class="summary__edit-btn" @click.prevent="emit('editStep', 'SEVERITY_RESULT')">Edit</button>
      </summary>
      <div class="summary__content">
        <div class="summary__escalation-steps">
          <div
            v-for="(step, i) in classification.escalation"
            :key="step.id"
            class="summary__escalation-step"
          >
            <span class="summary__escalation-number">{{ i + 1 }}</span>
            <div class="summary__escalation-info">
              <strong>{{ step.label }}</strong>
              <span class="summary__escalation-timing">{{ step.relativeTime }}</span>
              <span v-if="step.tone" class="summary__escalation-tone">Tone: {{ step.tone }}</span>
            </div>
          </div>
        </div>
      </div>
    </details>

    <!-- ═══ Non-notification: Type Context ═══ -->
    <details v-if="!isNotification && typeContext" class="summary__section" open>
      <summary>
        <strong>{{ typeContextTitle[typeContext.kind] || 'Type Context' }}</strong>
        <button v-if="!saved" class="summary__edit-btn" @click.prevent="emit('editStep', 'CONTEXT_AND_DESCRIBE')">Edit</button>
      </summary>
      <div class="summary__content">
        <dl>
          <!-- Error & Warning -->
          <template v-if="typeContext.kind === 'error_warning'">
            <template v-if="typeContext.errorType">
              <dt>Error type</dt>
              <dd>{{ errorTypeLabels[typeContext.errorType] || typeContext.errorType }}</dd>
            </template>
            <template v-if="typeContext.userAction">
              <dt>User was trying to</dt>
              <dd>{{ typeContext.userAction }}</dd>
            </template>
            <dt>What went wrong</dt>
            <dd>{{ typeContext.whatWentWrong || 'N/A' }}</dd>
            <dt>Recovery action</dt>
            <dd>{{ typeContext.recoveryAction || 'N/A' }}</dd>
            <template v-if="typeContext.tone">
              <dt>Tone</dt>
              <dd>{{ toneLabels[typeContext.tone] || typeContext.tone }}</dd>
            </template>
          </template>

          <!-- Validation -->
          <template v-if="typeContext.kind === 'validation'">
            <dt>Field name</dt>
            <dd>{{ typeContext.fieldName || 'N/A' }}</dd>
            <template v-if="typeContext.validationType">
              <dt>Validation type</dt>
              <dd>{{ validationTypeLabels[typeContext.validationType] || typeContext.validationType }}</dd>
            </template>
            <dt>Constraint</dt>
            <dd>{{ typeContext.constraint || 'N/A' }}</dd>
            <template v-if="typeContext.exampleValid">
              <dt>Valid example</dt>
              <dd>{{ typeContext.exampleValid }}</dd>
            </template>
          </template>

          <!-- Transactional Confirmation -->
          <template v-if="typeContext.kind === 'transactional_confirmation'">
            <dt>Action completed</dt>
            <dd>{{ typeContext.actionCompleted || 'N/A' }}</dd>
            <template v-if="typeContext.keyDetails">
              <dt>Key details</dt>
              <dd>{{ typeContext.keyDetails }}</dd>
            </template>
            <template v-if="typeContext.nextStep">
              <dt>Next step</dt>
              <dd>{{ typeContext.nextStep }}</dd>
            </template>
            <dt>Secondary CTA</dt>
            <dd>{{ typeContext.hasSecondaryAction ? 'Yes' : 'No' }}</dd>
          </template>

          <!-- Feedback -->
          <template v-if="typeContext.kind === 'feedback'">
            <dt>User action</dt>
            <dd>{{ typeContext.actionCompleted || 'N/A' }}</dd>
            <dt>Undo action</dt>
            <dd>{{ typeContext.hasUndo ? 'Yes' : 'No' }}</dd>
          </template>

          <!-- Status Display -->
          <template v-if="typeContext.kind === 'status_display'">
            <dt>System component</dt>
            <dd>{{ typeContext.systemComponent || 'N/A' }}</dd>
            <template v-if="typeContext.possibleStates">
              <dt>Possible states</dt>
              <dd>{{ typeContext.possibleStates }}</dd>
            </template>
            <dt>Tooltip</dt>
            <dd>{{ typeContext.hasTooltip ? 'Yes' : 'No' }}</dd>
          </template>
        </dl>
      </div>
    </details>

    <!-- Event Description -->
    <details class="summary__section" open>
      <summary>
        <strong>Event Description</strong>
        <button
          v-if="!saved"
          class="summary__edit-btn"
          @click.prevent="emit('editStep', isNotification ? 'EVENT_DESCRIPTION' : 'CONTEXT_AND_DESCRIBE')"
        >
          Edit
        </button>
      </summary>
      <div class="summary__content">
        <div class="summary__description-text">
          {{ description.whatHappened || 'N/A' }}
        </div>
        <div v-if="description.additionalNotes" class="summary__notes">
          <strong>Additional notes:</strong>
          {{ description.additionalNotes }}
        </div>
      </div>
    </details>

    <!-- Decision Path -->
    <details class="summary__section">
      <summary>
        <strong>Classification Path</strong>
        <button v-if="!saved" class="summary__edit-btn" @click.prevent="emit('editStep', 'CLASSIFICATION_TYPE')">Edit</button>
      </summary>
      <div class="summary__content">
        <div v-if="classification.typePath.length > 0">
          <ol class="summary__path">
            <li v-for="(entry, i) in classification.typePath" :key="'t' + i">
              <em>{{ entry.questionText }}</em> → <strong>{{ entry.selectedLabel }}</strong>
            </li>
          </ol>
        </div>
      </div>
    </details>

    <!-- Text Generation -->
    <div v-if="!saved" class="summary__text-gen">
      <scale-button
        v-if="!showTextGeneration"
        @click="startTextGeneration"
      >
        Generate messages
      </scale-button>

      <TextGenerationContainer
        v-if="showTextGeneration"
        :description="description"
        :classification="classification"
        :type-context="typeContext"
      />
    </div>

    <!-- Actions -->
    <div class="summary__actions">
      <template v-if="!saved">
        <!-- Save confirmation -->
        <Transition name="slide-confirm">
          <div v-if="confirmingSave" class="summary__confirm">
            <scale-notification variant="informational" heading="Save this event?" opened>
              This saves the event. View it in the events overview.
            </scale-notification>
            <div class="summary__confirm-actions">
              <scale-button variant="secondary" size="small" @click="cancelSave">
                Cancel
              </scale-button>
              <scale-button size="small" @click="handleSaveEvent">
                Confirm &amp; save
              </scale-button>
            </div>
          </div>
        </Transition>

        <div v-if="!confirmingSave" class="summary__nav">
          <scale-button variant="secondary" @click="$emit('back')">
            Back
          </scale-button>
          <scale-button @click="requestSave">
            Save event
          </scale-button>
        </div>
      </template>
      <template v-else>
        <scale-notification
          variant="success"
          heading="Event saved"
          opened
        >
          Event documented.
        </scale-notification>
        <div class="summary__post-save">
          <scale-button @click="handleViewEvents">
            View events
          </scale-button>
          <scale-button variant="secondary" @click="handleStartNew">
            Create new event
          </scale-button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.summary {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.summary__result {
  background: var(--telekom-color-background-surface, #fff);
  border: 1px solid var(--telekom-color-ui-border-standard, #ccc);
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary__result-type {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.summary__channels,
.summary__trigger,
.summary__explanation {
  font-size: 14px;
}

.summary__explanation {
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  font-style: italic;
}

.summary__override {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
}

.summary__section {
  background: var(--telekom-color-background-surface, #fff);
  border: 1px solid var(--telekom-color-ui-border-standard, #ccc);
  border-radius: 8px;
  padding: 16px;
}

.summary__section summary {
  cursor: pointer;
  user-select: none;
}

.summary__content {
  margin-top: 12px;
}

.summary__content dl {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 8px 16px;
  margin: 0;
}

.summary__content dt {
  font-weight: 600;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  font-size: 14px;
}

.summary__content dd {
  margin: 0;
  font-size: 14px;
}

.summary__description-text {
  font-size: 15px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.summary__notes {
  margin-top: 12px;
  font-size: 14px;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
}

.summary__path {
  padding-left: 20px;
}

.summary__path li {
  margin-bottom: 6px;
  font-size: 14px;
}

.summary__text-gen {
  margin-top: 8px;
}

.summary__actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.summary__nav {
  display: flex;
  gap: 12px;
}

.summary__post-save {
  display: flex;
  gap: 12px;
}

/* Edit buttons in section headers */
.summary__section summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.summary__edit-btn {
  background: none;
  border: none;
  font-size: 13px;
  color: var(--telekom-color-primary-standard, #e20074);
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.summary__edit-btn:hover {
  background: rgba(226, 0, 116, 0.06);
}

/* Channel list with tags */
.summary__channel-list {
  display: inline-flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-left: 4px;
}

/* Save confirmation */
.summary__confirm {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.summary__confirm-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

/* Escalation timeline */
.summary__escalation-steps {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary__escalation-step {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 8px 0;
}

.summary__escalation-number {
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
}

.summary__escalation-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 14px;
}

.summary__escalation-timing {
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  font-size: 13px;
}

.summary__escalation-tone {
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  font-size: 12px;
  font-style: italic;
}

/* Slide confirm transition */
.slide-confirm-enter-active,
.slide-confirm-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.slide-confirm-enter-from,
.slide-confirm-leave-to {
  opacity: 0;
  max-height: 0;
}

.slide-confirm-enter-to,
.slide-confirm-leave-from {
  opacity: 1;
  max-height: 200px;
}
</style>
