<script setup lang="ts">
import { computed } from 'vue'
import { useEventStore } from '@/stores/eventStore'
import { useAppStore } from '@/stores/appStore'
import { useI18n } from '@/i18n'
import { downloadMarkdown } from '@/services/markdownExport'
import { hasEscalationSteps, isEscalationEnabled } from '@/types/event'

const { t } = useI18n()
const { events } = useEventStore()
const { selectedEventId, setView } = useAppStore()

const event = computed(() =>
  events.value.find((e) => e.id === selectedEventId.value) ?? null
)

const isNotification = computed(() => event.value?.classification.type === 'Notification')

const impactLabels = computed<Record<string, string>>(() => ({
  blocked: t('detail.impact.blocked'),
  degraded: t('detail.impact.degraded'),
  no_impact: t('detail.impact.noImpact'),
}))

const scopeLabels = computed<Record<string, string>>(() => ({
  widespread: t('detail.scope.widespread'),
  limited: t('detail.scope.limited'),
}))

const actionLabels = computed<Record<string, string>>(() => ({
  mandatory: t('detail.action.mandatory'),
  recommended: t('detail.action.recommended'),
  no: t('detail.action.noRequired'),
}))

const workaroundLabels = computed<Record<string, string>>(() => ({
  yes_documented: t('detail.workaround.yesDocumented'),
  yes_complex: t('detail.workaround.yesComplex'),
  no: t('detail.workaround.none'),
}))

const leadTimeLabels = computed<Record<string, string>>(() => ({
  less_than_24h: t('detail.leadTime.lessThan24h'),
  '1_to_7_days': t('detail.leadTime.1to7days'),
  more_than_7_days: t('detail.leadTime.moreThan7days'),
}))

const errorTypeLabels = computed<Record<string, string>>(() => ({
  system_error: t('detail.errorType.system'),
  permission_error: t('detail.errorType.permission'),
  resource_error: t('detail.errorType.resource'),
  network_error: t('detail.errorType.network'),
  input_error: t('detail.errorType.input'),
}))

const validationTypeLabels = computed<Record<string, string>>(() => ({
  format: t('detail.validationType.format'),
  required: t('detail.validationType.required'),
  range: t('detail.validationType.range'),
  dependency: t('detail.validationType.dependency'),
  uniqueness: t('detail.validationType.uniqueness'),
}))

const toneLabels = computed<Record<string, string>>(() => ({
  neutral: t('detail.toneValue.neutral'),
  apologetic: t('detail.toneValue.apologetic'),
  urgent: t('detail.toneValue.urgent'),
}))

const typeContextTitle = computed<Record<string, string>>(() => ({
  error_warning: t('detail.typeContext.errorWarning'),
  validation: t('detail.typeContext.validation'),
  transactional_confirmation: t('detail.typeContext.confirmation'),
  feedback: t('detail.typeContext.feedback'),
  status_display: t('detail.typeContext.statusDisplay'),
}))

function getChannelShortName(channel: string): string {
  return channel.replace(/\s*\(.*\)$/, '').trim()
}

function goBack() {
  setView('documentation')
}
</script>

<template>
  <div class="event-detail">
    <div class="event-detail__nav">
      <button class="event-detail__back" @click="goBack">
        <scale-icon-navigation-left size="16" />
        {{ t('action.back') }}
      </button>
      <button
        v-if="event"
        class="event-detail__export"
        @click="downloadMarkdown(event)"
      >
        <scale-icon-action-download size="16" />
        {{ t('action.export') }}
      </button>
    </div>

    <div v-if="!event" class="event-detail__empty">
      {{ t('detail.notFound') }}
    </div>

    <template v-else>
      <div class="event-detail__header">
        <h1 class="event-detail__title">{{ event.id }}</h1>
        <div class="event-detail__tags">
          <scale-tag :color="event.classification.type === 'Notification' ? 'teal' : 'cyan'">
            {{ event.classification.type }}
          </scale-tag>
          <scale-tag v-if="event.classification.severity">
            {{ event.classification.severity }}
          </scale-tag>
        </div>
        <span class="event-detail__date">
          {{ new Date(event.createdAt).toLocaleDateString() }}
          {{ new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
        </span>
      </div>

      <div class="event-detail__section">
        <h2>{{ t('detail.description') }}</h2>
        <p>{{ event.description.whatHappened || t('detail.noDescription') }}</p>
        <p v-if="event.description.additionalNotes">
          {{ event.description.additionalNotes }}
        </p>
      </div>

      <div class="event-detail__section">
        <h2>{{ t('detail.classification') }}</h2>
        <div class="event-detail__grid">
          <div class="event-detail__field">
            <span class="event-detail__label">{{ t('detail.type') }}</span>
            <span>{{ event.classification.type }}</span>
          </div>
          <div class="event-detail__field">
            <span class="event-detail__label">{{ t('detail.severity') }}</span>
            <span>{{ event.classification.severity || t('detail.na') }}</span>
          </div>
          <div v-if="event.classification.severityExplanation" class="event-detail__field">
            <span class="event-detail__label">{{ t('detail.severityExplanation') }}</span>
            <span>{{ event.classification.severityExplanation }}</span>
          </div>
          <div class="event-detail__field">
            <span class="event-detail__label">{{ t('detail.purpose') }}</span>
            <span>{{ event.classification.purpose }}</span>
          </div>
          <div v-if="event.classification.trigger" class="event-detail__field">
            <span class="event-detail__label">{{ t('detail.trigger') }}</span>
            <span>{{ event.classification.trigger }}</span>
          </div>
          <div class="event-detail__field">
            <span class="event-detail__label">{{ t('detail.escalation') }}</span>
            <span v-if="hasEscalationSteps(event.classification.escalation)">
              {{ event.classification.escalation.length }} {{ t('detail.steps') }}
            </span>
            <span v-else>{{ isEscalationEnabled(event.classification.escalation) ? t('detail.yes') : t('detail.no') }}</span>
          </div>
        </div>
      </div>

      <!-- Escalation Timeline -->
      <div v-if="hasEscalationSteps(event.classification.escalation)" class="event-detail__section">
        <h2>{{ t('detail.escalationTimeline') }}</h2>
        <div class="event-detail__escalation-timeline">
          <div
            v-for="(step, i) in event.classification.escalation"
            :key="step.id"
            class="event-detail__escalation-step"
          >
            <span class="event-detail__escalation-number">{{ i + 1 }}</span>
            <div class="event-detail__escalation-info">
              <strong>{{ step.label }}</strong>
              <span class="event-detail__escalation-timing">{{ step.relativeTime }}</span>
              <span v-if="step.tone" class="event-detail__escalation-tone">{{ t('detail.tone') }}: {{ step.tone }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="event-detail__section">
        <h2>{{ t('detail.channels') }}</h2>
        <div class="event-detail__channel-tags">
          <scale-tag
            v-for="channel in event.classification.channels"
            :key="channel"
            color="standard"
          >{{ getChannelShortName(channel) }}</scale-tag>
        </div>
      </div>

      <!-- Impact Assessment (Notification only) -->
      <div v-if="isNotification" class="event-detail__section">
        <h2>{{ t('detail.impactAssessment') }}</h2>
        <div class="event-detail__grid">
          <div class="event-detail__field">
            <span class="event-detail__label">{{ t('detail.userImpact') }}</span>
            <span>{{ impactLabels[event.description.userImpact] || event.description.userImpact || t('detail.na') }}</span>
          </div>
          <div v-if="event.description.userImpact && event.description.userImpact !== 'no_impact'" class="event-detail__field">
            <span class="event-detail__label">{{ t('detail.userScope') }}</span>
            <span>{{ scopeLabels[event.description.userScope] || event.description.userScope || t('detail.na') }}</span>
          </div>
          <div v-if="event.description.whoAffected.length > 0" class="event-detail__field">
            <span class="event-detail__label">{{ t('detail.whoAffected') }}</span>
            <span>{{ event.description.whoAffected.join(', ') }}{{ event.description.whoAffectedCustom ? ' (' + event.description.whoAffectedCustom + ')' : '' }}</span>
          </div>
          <div v-if="event.description.actionRequired" class="event-detail__field">
            <span class="event-detail__label">{{ t('detail.actionRequired') }}</span>
            <span>{{ actionLabels[event.description.actionRequired] || event.description.actionRequired }}</span>
          </div>
          <div v-if="event.description.actionDescription && event.description.actionRequired !== 'no'" class="event-detail__field">
            <span class="event-detail__label">{{ t('detail.actionDescription') }}</span>
            <span>{{ event.description.actionDescription }}</span>
          </div>
          <div v-if="event.description.userImpact && event.description.userImpact !== 'no_impact' && event.description.workaroundAvailable" class="event-detail__field">
            <span class="event-detail__label">{{ t('detail.workaround') }}</span>
            <span>{{ workaroundLabels[event.description.workaroundAvailable] || event.description.workaroundAvailable }}</span>
          </div>
          <div v-if="event.description.timing" class="event-detail__field">
            <span class="event-detail__label">{{ t('detail.timing') }}</span>
            <span>{{ event.description.timing === 'now' ? t('detail.happeningNow') : event.description.timing === 'scheduled' ? t('detail.scheduled') : event.description.timing }}</span>
          </div>
          <div v-if="event.description.timing === 'scheduled' && event.description.leadTime" class="event-detail__field">
            <span class="event-detail__label">{{ t('detail.leadTime') }}</span>
            <span>{{ leadTimeLabels[event.description.leadTime] || event.description.leadTime }}</span>
          </div>
          <div class="event-detail__field">
            <span class="event-detail__label">{{ t('detail.securityCompliance') }}</span>
            <span>{{ event.description.securityCompliance === true ? t('detail.yes') : event.description.securityCompliance === false ? t('detail.no') : t('detail.na') }}</span>
          </div>
        </div>
      </div>

      <!-- Type Context (Non-notification) -->
      <div v-if="!isNotification && event.typeContext" class="event-detail__section">
        <h2>{{ typeContextTitle[event.typeContext.kind] || t('detail.type') }}</h2>
        <div class="event-detail__grid">
          <!-- Error & Warning -->
          <template v-if="event.typeContext.kind === 'error_warning'">
            <div v-if="event.typeContext.errorType" class="event-detail__field">
              <span class="event-detail__label">{{ t('detail.errorTypeLabel') }}</span>
              <span>{{ errorTypeLabels[event.typeContext.errorType] || event.typeContext.errorType }}</span>
            </div>
            <div v-if="event.typeContext.userAction" class="event-detail__field">
              <span class="event-detail__label">{{ t('detail.userWasTryingTo') }}</span>
              <span>{{ event.typeContext.userAction }}</span>
            </div>
            <div class="event-detail__field">
              <span class="event-detail__label">{{ t('detail.whatWentWrong') }}</span>
              <span>{{ event.typeContext.whatWentWrong || t('detail.na') }}</span>
            </div>
            <div class="event-detail__field">
              <span class="event-detail__label">{{ t('detail.recoveryAction') }}</span>
              <span>{{ event.typeContext.recoveryAction || t('detail.na') }}</span>
            </div>
            <div v-if="event.typeContext.tone" class="event-detail__field">
              <span class="event-detail__label">{{ t('detail.tone') }}</span>
              <span>{{ toneLabels[event.typeContext.tone] || event.typeContext.tone }}</span>
            </div>
          </template>

          <!-- Validation -->
          <template v-if="event.typeContext.kind === 'validation'">
            <div class="event-detail__field">
              <span class="event-detail__label">{{ t('detail.fieldName') }}</span>
              <span>{{ event.typeContext.fieldName || t('detail.na') }}</span>
            </div>
            <div v-if="event.typeContext.validationType" class="event-detail__field">
              <span class="event-detail__label">{{ t('detail.validationTypeLabel') }}</span>
              <span>{{ validationTypeLabels[event.typeContext.validationType] || event.typeContext.validationType }}</span>
            </div>
            <div class="event-detail__field">
              <span class="event-detail__label">{{ t('detail.constraint') }}</span>
              <span>{{ event.typeContext.constraint || t('detail.na') }}</span>
            </div>
            <div v-if="event.typeContext.exampleValid" class="event-detail__field">
              <span class="event-detail__label">{{ t('detail.validExample') }}</span>
              <span>{{ event.typeContext.exampleValid }}</span>
            </div>
          </template>

          <!-- Transactional Confirmation -->
          <template v-if="event.typeContext.kind === 'transactional_confirmation'">
            <div class="event-detail__field">
              <span class="event-detail__label">{{ t('detail.actionCompleted') }}</span>
              <span>{{ event.typeContext.actionCompleted || t('detail.na') }}</span>
            </div>
            <div v-if="event.typeContext.keyDetails" class="event-detail__field">
              <span class="event-detail__label">{{ t('detail.keyDetails') }}</span>
              <span>{{ event.typeContext.keyDetails }}</span>
            </div>
            <div v-if="event.typeContext.nextStep" class="event-detail__field">
              <span class="event-detail__label">{{ t('detail.nextStep') }}</span>
              <span>{{ event.typeContext.nextStep }}</span>
            </div>
            <div class="event-detail__field">
              <span class="event-detail__label">{{ t('detail.secondaryCta') }}</span>
              <span>{{ event.typeContext.hasSecondaryAction ? t('detail.yes') : t('detail.no') }}</span>
            </div>
          </template>

          <!-- Feedback -->
          <template v-if="event.typeContext.kind === 'feedback'">
            <div class="event-detail__field">
              <span class="event-detail__label">{{ t('detail.userActionLabel') }}</span>
              <span>{{ event.typeContext.actionCompleted || t('detail.na') }}</span>
            </div>
            <div class="event-detail__field">
              <span class="event-detail__label">{{ t('detail.undoAction') }}</span>
              <span>{{ event.typeContext.hasUndo ? t('detail.yes') : t('detail.no') }}</span>
            </div>
          </template>

          <!-- Status Display -->
          <template v-if="event.typeContext.kind === 'status_display'">
            <div class="event-detail__field">
              <span class="event-detail__label">{{ t('detail.systemComponent') }}</span>
              <span>{{ event.typeContext.systemComponent || t('detail.na') }}</span>
            </div>
            <div v-if="event.typeContext.possibleStates" class="event-detail__field">
              <span class="event-detail__label">{{ t('detail.possibleStates') }}</span>
              <span>{{ event.typeContext.possibleStates }}</span>
            </div>
            <div class="event-detail__field">
              <span class="event-detail__label">{{ t('detail.hasTooltip') }}</span>
              <span>{{ event.typeContext.hasTooltip ? t('detail.yes') : t('detail.no') }}</span>
            </div>
          </template>
        </div>
      </div>

      <div v-if="event.generatedText" class="event-detail__section">
        <h2>{{ t('detail.generatedText') }}</h2>
        <div
          v-for="(fields, componentId) in event.generatedText"
          :key="componentId"
          class="event-detail__text-block"
        >
          <h3>{{ componentId }}</h3>
          <scale-table>
            <table>
              <thead>
                <tr>
                  <th>{{ t('detail.field') }}</th>
                  <th>{{ t('detail.english') }}</th>
                  <th>{{ t('detail.german') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(text, fieldId) in fields" :key="fieldId">
                  <td>{{ fieldId }}</td>
                  <td>{{ text.en }}</td>
                  <td>{{ text.de }}</td>
                </tr>
              </tbody>
            </table>
          </scale-table>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.event-detail {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.event-detail__nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.event-detail__back,
.event-detail__export {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
  color: var(--telekom-color-text-and-icon-standard, #191919);
}

.event-detail__back:hover,
.event-detail__export:hover {
  background: var(--telekom-color-ui-state-fill-hovered, #e8e8e8);
}

.event-detail__header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.event-detail__title {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
}

.event-detail__tags {
  display: flex;
  gap: 6px;
}

.event-detail__date {
  margin-left: auto;
  font-size: 13px;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
}

.event-detail__section h2 {
  font-size: 16px;
  font-weight: 700;
  margin: 0 0 12px;
}

.event-detail__section h3 {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 8px;
  text-transform: capitalize;
}

.event-detail__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 24px;
}

.event-detail__field {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.event-detail__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.event-detail__channel-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.event-detail__text-block {
  margin-bottom: 16px;
}

.event-detail__escalation-timeline {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.event-detail__escalation-step {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 8px 0;
}

.event-detail__escalation-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--telekom-color-primary-standard, #e20074);
  color: var(--telekom-color-text-and-icon-white-standard, #fff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.event-detail__escalation-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 14px;
}

.event-detail__escalation-timing {
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  font-size: 13px;
}

.event-detail__escalation-tone {
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  font-size: 12px;
  font-style: italic;
}

.event-detail__empty {
  text-align: center;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  padding: 40px 0;
}
</style>
