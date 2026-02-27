<script setup lang="ts">
import { ref, computed, watch, nextTick, provide } from 'vue'
import { useWizardStore } from '@/stores/wizardStore'
import type { WizardPhase } from '@/stores/wizardStore'
import { useAppStore } from '@/stores/appStore'
import TreeQuestionStep from './TreeQuestionStep.vue'
import ImpactAssessmentStep from './ImpactAssessmentStep.vue'
import SeverityResultStep from './SeverityResultStep.vue'
import EventDescriptionEditor from './EventDescriptionEditor.vue'
import ContextAndDescribeStep from './ContextAndDescribeStep.vue'
import WizardSummary from './WizardSummary.vue'
import WizardPhaseCard from './WizardPhaseCard.vue'

const {
  state,
  currentTypeNode,
  isNotification,
  effectiveSeverity,
  classification,
  wizardSteps,
  currentStepIndex,
  selectTypeOption,
  goBackInTypeTree,
  confirmClassification,
  reclassify,
  completeImpactAssessment,
  goBackFromImpactAssessment,
  overrideSeverity,
  clearSeverityOverride,
  setEscalationSteps,
  applyEscalationPreset,
  clearEscalation,
  completeSeverityResult,
  goBackFromSeverityResult,
  completeEventDescription,
  goBackFromEventDescription,
  completeContextAndDescribe,
  goBackFromContextAndDescribe,
  goBackFromSummary,
  navigateToStep,
  resetWizard,
} = useWizardStore()

const { setView } = useAppStore()

// Provide typeResult to WizardPhaseCard for the result tile
provide('typeResult', computed(() => state.typeResult))

function cancelWizard() {
  resetWizard()
  setView('documentation')
}

const stepHeading = ref<HTMLElement | null>(null)
const liveAnnouncement = ref('')

/** Returns the label for the "Continue" button based on the next step. */
function nextStepLabel(): string {
  const nextIndex = currentStepIndex.value + 1
  const nextStep = wizardSteps.value[nextIndex]
  if (nextStep) {
    return `Continue to ${nextStep.label}`
  }
  return 'Continue'
}

/** Returns the label for the "Back" button based on the previous step. */
function previousStepLabel(): string {
  const prevIndex = currentStepIndex.value - 1
  const prevStep = wizardSteps.value[prevIndex]
  return prevStep ? `Back to ${prevStep.label}` : 'Back'
}

// Focus step heading on phase change + reset validation state
watch(() => state.phase, (newPhase) => {
  showValidationHint.value = false
  showContextValidationHint.value = false
  const step = wizardSteps.value.find(s => s.id === newPhase)
  if (step) {
    liveAnnouncement.value = `Step ${currentStepIndex.value + 1} of ${wizardSteps.value.length}: ${step.label}`
  }
  nextTick(() => {
    stepHeading.value?.focus()
  })
})

/** Handle edit-step navigation from WizardSummary */
function handleEditStep(phase: string) {
  navigateToStep(phase as WizardPhase)
}

/** Compute validation issues for Impact Assessment */
const impactValidationHint = computed(() => {
  const desc = state.eventDescription
  // Severity drivers first
  if (!desc.userImpact) return 'Select user impact level'
  if ((desc.userImpact === 'blocked' || desc.userImpact === 'degraded') && !desc.userScope) return 'Select user scope'
  if (!desc.actionRequired) return 'Select whether action is required'
  if (isNotification.value && !desc.timing) return 'Select event timing'
  if (isNotification.value && desc.timing === 'scheduled' && !desc.leadTime) return 'Select lead time'
  if (desc.securityCompliance === null) return 'Answer security/compliance question'
  // Audience & context last
  if (desc.whoAffected.length === 0) return 'Select who is affected'
  return ''
})

const isImpactComplete = computed(() => impactValidationHint.value === '')

const showValidationHint = ref(false)

function handleContinueImpact() {
  if (isImpactComplete.value) {
    showValidationHint.value = false
    completeImpactAssessment()
  } else {
    showValidationHint.value = true
  }
}

/** Compute validation issues for Context & Describe step (non-notifications) */
const contextValidationHint = computed(() => {
  if (!state.typeContext) return 'Missing type context'
  const ctx = state.typeContext
  switch (ctx.kind) {
    case 'error_warning':
      if (!ctx.whatWentWrong) return 'Describe what went wrong'
      if (!ctx.recoveryAction) return 'Describe the recovery action'
      break
    case 'validation':
      if (!ctx.fieldName) return 'Specify the field name'
      if (!ctx.constraint) return 'Describe the validation constraint'
      break
    case 'transactional_confirmation':
      if (!ctx.actionCompleted) return 'Describe the completed action'
      break
    case 'feedback':
      if (!ctx.actionCompleted) return 'Describe the completed action'
      break
    case 'status_display':
      if (!ctx.systemComponent) return 'Specify the system component'
      break
  }
  if (!state.eventDescription.whatHappened.trim()) return 'Write an event description'
  return ''
})

const isContextComplete = computed(() => contextValidationHint.value === '')

const showContextValidationHint = ref(false)

function handleContinueContext() {
  if (isContextComplete.value) {
    showContextValidationHint.value = false
    completeContextAndDescribe()
  } else {
    showContextValidationHint.value = true
  }
}

/** Step tags for classification phase (Figma design) */
const classificationStepTags = computed(() => [
  { label: 'Classification', active: true },
  { label: 'Context', active: false },
  { label: 'Summary', active: false },
])

</script>

<template>
  <div class="wizard">
    <!-- Screen reader announcements -->
    <div class="sr-only" aria-live="polite" aria-atomic="true">
      {{ liveAnnouncement }}
    </div>

    <scale-grid>
      <scale-grid-item size="4,8,8" offset=",,5,5,5">

        <!-- Step 1: Classification — Information Type (Tree Walk) -->
        <template v-if="state.phase === 'CLASSIFICATION_TYPE'">
          <h2 ref="stepHeading" class="sr-only" tabindex="-1">Event Classification</h2>

          <!-- Tree walk (active questions) — uses its own internal layout -->
          <div v-if="currentTypeNode && currentTypeNode.type === 'question' && !state.typeResult" class="wizard__card wizard__card--classification">
            <TreeQuestionStep
              :node="currentTypeNode"
              :step-tags="classificationStepTags"
              @select="selectTypeOption"
              @back="goBackInTypeTree"
              @cancel="cancelWizard"
              :show-back="state.typePath.length > 0"
              :show-cancel="state.typePath.length === 0"
            />
          </div>

          <!-- Classification confirmation (tree walk complete) — uses WizardPhaseCard -->
          <WizardPhaseCard
            v-else-if="state.typeResult"
            active-tab="Classification"
            :show-result-tile="false"
            back-label="Re-Classify"
            next-label="Continue"
            @back="reclassify"
            @next="confirmClassification"
          >
            <!-- Result tile -->
            <div class="classification-confirm__result">
              <div class="classification-confirm__top">
                <scale-tag color="teal">{{ state.typeResult.classification }}</scale-tag>
                <p v-if="state.typeResult.purpose" class="classification-confirm__purpose">
                  {{ state.typeResult.purpose }}
                </p>
              </div>
              <div v-if="state.typeResult.channels && state.typeResult.channels.length > 0" class="classification-confirm__channels">
                <span class="classification-confirm__channels-label">Channel:</span>
                <div class="classification-confirm__channel-tags">
                  <scale-tag v-for="ch in state.typeResult.channels" :key="ch" color="standard" size="small">{{ ch }}</scale-tag>
                </div>
              </div>
            </div>

            <!-- Path tile -->
            <div class="classification-confirm__path">
              <div
                v-for="(entry, i) in state.typePath"
                :key="i"
                class="classification-confirm__path-set"
              >
                <div class="classification-confirm__path-question">
                  <span class="classification-confirm__path-num">{{ i + 1 }}.</span>
                  <span>{{ entry.questionText }}</span>
                </div>
                <div class="classification-confirm__path-answer">
                  <span class="classification-confirm__path-arrow">→</span>
                  <span>{{ entry.selectedLabel }}</span>
                </div>
              </div>
            </div>
          </WizardPhaseCard>
        </template>

        <!-- Step 2: Impact Assessment (Notifications) -->
        <WizardPhaseCard
          v-else-if="state.phase === 'IMPACT_ASSESSMENT'"
          active-tab="Context"
          :back-label="previousStepLabel()"
          :next-label="nextStepLabel()"
          :validation-hint="impactValidationHint"
          :show-validation-hint="showValidationHint"
          @back="goBackFromImpactAssessment"
          @next="handleContinueImpact"
        >
          <h2 ref="stepHeading" class="sr-only" tabindex="-1">Impact Assessment</h2>
          <ImpactAssessmentStep
            :description="state.eventDescription"
            :is-notification="isNotification"
          />
        </WizardPhaseCard>

        <!-- Step 2 (non-notification): Context & Describe -->
        <WizardPhaseCard
          v-else-if="state.phase === 'CONTEXT_AND_DESCRIBE'"
          active-tab="Context"
          :back-label="previousStepLabel()"
          :next-label="nextStepLabel()"
          :validation-hint="contextValidationHint"
          :show-validation-hint="showContextValidationHint"
          @back="goBackFromContextAndDescribe"
          @next="handleContinueContext"
        >
          <h2 ref="stepHeading" class="sr-only" tabindex="-1">Context &amp; Description</h2>
          <ContextAndDescribeStep
            v-if="state.typeContext"
            :type-context="state.typeContext"
            :description="state.eventDescription"
            :classification-type="state.typeResult?.classification || ''"
          />
        </WizardPhaseCard>

        <!-- Step 3: Severity Result (Notifications only) -->
        <WizardPhaseCard
          v-else-if="state.phase === 'SEVERITY_RESULT'"
          active-tab="Context"
          :back-label="previousStepLabel()"
          :next-label="nextStepLabel()"
          @back="goBackFromSeverityResult"
          @next="completeSeverityResult"
        >
          <h2 ref="stepHeading" class="sr-only" tabindex="-1">Notification Severity</h2>
          <SeverityResultStep
            v-if="state.severityResult"
            :severity-result="state.severityResult"
            :effective-severity="effectiveSeverity"
            :severity-override="state.severityOverride"
            :escalation-steps="state.escalationSteps"
            :escalation-suggested="state.severityResult.escalationSuggested"
            :lead-time="state.eventDescription.leadTime"
            :is-scheduled="state.eventDescription.timing === 'scheduled'"
            @override="overrideSeverity"
            @clear-override="clearSeverityOverride"
            @update-escalation-steps="setEscalationSteps"
            @apply-preset="applyEscalationPreset"
            @clear-escalation="clearEscalation"
          />
        </WizardPhaseCard>

        <!-- Step 4: Event Description (AI-Assisted) -->
        <WizardPhaseCard
          v-else-if="state.phase === 'EVENT_DESCRIPTION'"
          active-tab="Context"
          :back-label="previousStepLabel()"
          :next-label="nextStepLabel()"
          :next-disabled="!state.eventDescription.whatHappened.trim()"
          @back="goBackFromEventDescription"
          @next="completeEventDescription"
        >
          <h2 ref="stepHeading" class="sr-only" tabindex="-1">Event Description</h2>
          <EventDescriptionEditor
            :description="state.eventDescription"
            :classification="classification"
          />
        </WizardPhaseCard>

        <!-- Step 5: Summary — has its own buttons, so hide WizardPhaseCard nav -->
        <WizardPhaseCard
          v-else-if="state.phase === 'SUMMARY'"
          active-tab="Summary"
          :show-back-button="false"
          :show-next-button="false"
        >
          <WizardSummary
            v-if="classification"
            :description="state.eventDescription"
            :classification="classification"
            :is-notification="isNotification"
            :type-context="state.typeContext"
            @reset="resetWizard"
            @back="goBackFromSummary"
            @edit-step="handleEditStep"
          />
        </WizardPhaseCard>

      </scale-grid-item>
    </scale-grid>
  </div>
</template>

<style scoped>
.wizard {
  display: flex;
  flex-direction: column;
  gap: 24px;
  background: var(--telekom-color-background-surface-subtle, #efeff0);
  min-height: calc(100vh - 96px);
  margin: -32px -32px 0;
  padding: 32px;
}

/* ── Classification card (tree walk only — confirmation uses WizardPhaseCard) ── */
.wizard__card {
  background: var(--telekom-color-background-surface, #fff);
  border: 1px solid #dfdfe1;
  border-radius: 8px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.wizard__card--classification {
  /* No max-width — grid handles width */
}

/* ── Screen reader only ── */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* ── Classification Confirmation — content inside WizardPhaseCard slot ── */
.classification-confirm__result {
  background: var(--telekom-color-background-surface, #fff);
  border: 1px solid #dfdfe1;
  border-radius: 8px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.classification-confirm__top {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.classification-confirm__purpose {
  margin: 0;
  font-family: 'TeleNeo', sans-serif;
  font-weight: 400;
  font-size: 16px;
  line-height: 22.4px;
  color: #000;
}

.classification-confirm__channels {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.classification-confirm__channels-label {
  font-family: 'TeleNeo', sans-serif;
  font-weight: 400;
  font-size: 16px;
  line-height: 22.4px;
  color: #000;
  flex-shrink: 0;
}

.classification-confirm__channel-tags {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.classification-confirm__path {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: #efeff0;
  border: 1px solid #dfdfe1;
  border-radius: 8px;
  padding: 8px 20px;
}

.classification-confirm__path-set {
  display: flex;
  flex-direction: column;
}

.classification-confirm__path-question {
  display: flex;
  gap: 4px;
  font-family: 'TeleNeo', sans-serif;
  font-weight: 400;
  font-size: 14px;
  line-height: 19.6px;
  color: #000;
}

.classification-confirm__path-num {
  flex-shrink: 0;
}

.classification-confirm__path-answer {
  display: flex;
  gap: 4px;
  padding-left: 13px;
  font-family: 'TeleNeo', sans-serif;
  font-weight: 700;
  font-size: 14px;
  line-height: 19.6px;
  color: #000;
}

.classification-confirm__path-arrow {
  flex-shrink: 0;
}

/* ── Focus styles for step heading ── */
.wizard__title:focus {
  outline: none;
}
</style>
