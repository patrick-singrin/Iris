<script setup lang="ts">
import { computed } from 'vue'
import { useEventStore } from '@/stores/eventStore'
import { useAppStore } from '@/stores/appStore'
import { downloadMarkdown } from '@/services/markdownExport'
import { hasEscalationSteps, isEscalationEnabled } from '@/types/event'

const { events } = useEventStore()
const { selectedEventId, setView } = useAppStore()

const event = computed(() =>
  events.value.find((e) => e.id === selectedEventId.value) ?? null
)

const isNotification = computed(() => event.value?.classification.type === 'Notification')

const impactLabels: Record<string, string> = {
  blocked: 'Blocked',
  degraded: 'Degraded',
  no_impact: 'No impact',
}

const scopeLabels: Record<string, string> = {
  widespread: 'Widespread',
  limited: 'Limited',
}

const actionLabels: Record<string, string> = {
  mandatory: 'Yes, mandatory',
  recommended: 'Yes, recommended',
  no: 'No action required',
}

const workaroundLabels: Record<string, string> = {
  yes_documented: 'Yes, documented',
  yes_complex: 'Yes, but complex',
  no: 'No workaround available',
}

const leadTimeLabels: Record<string, string> = {
  less_than_24h: 'Less than 24 hours',
  '1_to_7_days': '1–7 days',
  more_than_7_days: 'More than 7 days',
}

// Type context labels for non-notifications
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
        Back to Events
      </button>
      <button
        v-if="event"
        class="event-detail__export"
        @click="downloadMarkdown(event)"
      >
        <scale-icon-action-download size="16" />
        Export
      </button>
    </div>

    <div v-if="!event" class="event-detail__empty">
      Event not found.
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
        <h2>Description</h2>
        <p>{{ event.description.whatHappened || 'No description provided' }}</p>
        <p v-if="event.description.additionalNotes">
          {{ event.description.additionalNotes }}
        </p>
      </div>

      <div class="event-detail__section">
        <h2>Classification</h2>
        <div class="event-detail__grid">
          <div class="event-detail__field">
            <span class="event-detail__label">Type</span>
            <span>{{ event.classification.type }}</span>
          </div>
          <div class="event-detail__field">
            <span class="event-detail__label">Severity</span>
            <span>{{ event.classification.severity || 'N/A' }}</span>
          </div>
          <div v-if="event.classification.severityExplanation" class="event-detail__field">
            <span class="event-detail__label">Severity Explanation</span>
            <span>{{ event.classification.severityExplanation }}</span>
          </div>
          <div class="event-detail__field">
            <span class="event-detail__label">Purpose</span>
            <span>{{ event.classification.purpose }}</span>
          </div>
          <div v-if="event.classification.trigger" class="event-detail__field">
            <span class="event-detail__label">Trigger</span>
            <span>{{ event.classification.trigger }}</span>
          </div>
          <div class="event-detail__field">
            <span class="event-detail__label">Escalation</span>
            <span v-if="hasEscalationSteps(event.classification.escalation)">
              {{ event.classification.escalation.length }} steps
            </span>
            <span v-else>{{ isEscalationEnabled(event.classification.escalation) ? 'Yes' : 'No' }}</span>
          </div>
        </div>
      </div>

      <!-- Escalation Timeline -->
      <div v-if="hasEscalationSteps(event.classification.escalation)" class="event-detail__section">
        <h2>Escalation Timeline</h2>
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
              <span v-if="step.tone" class="event-detail__escalation-tone">Tone: {{ step.tone }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="event-detail__section">
        <h2>Channels</h2>
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
        <h2>Impact Assessment</h2>
        <div class="event-detail__grid">
          <div class="event-detail__field">
            <span class="event-detail__label">User Impact</span>
            <span>{{ impactLabels[event.description.userImpact] || event.description.userImpact || 'N/A' }}</span>
          </div>
          <div v-if="event.description.userImpact && event.description.userImpact !== 'no_impact'" class="event-detail__field">
            <span class="event-detail__label">User Scope</span>
            <span>{{ scopeLabels[event.description.userScope] || event.description.userScope || 'N/A' }}</span>
          </div>
          <div v-if="event.description.whoAffected.length > 0" class="event-detail__field">
            <span class="event-detail__label">Who Affected</span>
            <span>{{ event.description.whoAffected.join(', ') }}{{ event.description.whoAffectedCustom ? ' (' + event.description.whoAffectedCustom + ')' : '' }}</span>
          </div>
          <div v-if="event.description.actionRequired" class="event-detail__field">
            <span class="event-detail__label">Action Required</span>
            <span>{{ actionLabels[event.description.actionRequired] || event.description.actionRequired }}</span>
          </div>
          <div v-if="event.description.actionDescription && event.description.actionRequired !== 'no'" class="event-detail__field">
            <span class="event-detail__label">Action Description</span>
            <span>{{ event.description.actionDescription }}</span>
          </div>
          <div v-if="event.description.userImpact && event.description.userImpact !== 'no_impact' && event.description.workaroundAvailable" class="event-detail__field">
            <span class="event-detail__label">Workaround</span>
            <span>{{ workaroundLabels[event.description.workaroundAvailable] || event.description.workaroundAvailable }}</span>
          </div>
          <div v-if="event.description.timing" class="event-detail__field">
            <span class="event-detail__label">Timing</span>
            <span>{{ event.description.timing === 'now' ? 'Happening now' : event.description.timing === 'scheduled' ? 'Scheduled' : event.description.timing }}</span>
          </div>
          <div v-if="event.description.timing === 'scheduled' && event.description.leadTime" class="event-detail__field">
            <span class="event-detail__label">Lead Time</span>
            <span>{{ leadTimeLabels[event.description.leadTime] || event.description.leadTime }}</span>
          </div>
          <div class="event-detail__field">
            <span class="event-detail__label">Security / Compliance</span>
            <span>{{ event.description.securityCompliance === true ? 'Yes' : event.description.securityCompliance === false ? 'No' : 'N/A' }}</span>
          </div>
        </div>
      </div>

      <!-- Type Context (Non-notification) -->
      <div v-if="!isNotification && event.typeContext" class="event-detail__section">
        <h2>{{ typeContextTitle[event.typeContext.kind] || 'Type Context' }}</h2>
        <div class="event-detail__grid">
          <!-- Error & Warning -->
          <template v-if="event.typeContext.kind === 'error_warning'">
            <div v-if="event.typeContext.errorType" class="event-detail__field">
              <span class="event-detail__label">Error Type</span>
              <span>{{ errorTypeLabels[event.typeContext.errorType] || event.typeContext.errorType }}</span>
            </div>
            <div v-if="event.typeContext.userAction" class="event-detail__field">
              <span class="event-detail__label">User Was Trying To</span>
              <span>{{ event.typeContext.userAction }}</span>
            </div>
            <div class="event-detail__field">
              <span class="event-detail__label">What Went Wrong</span>
              <span>{{ event.typeContext.whatWentWrong || 'N/A' }}</span>
            </div>
            <div class="event-detail__field">
              <span class="event-detail__label">Recovery Action</span>
              <span>{{ event.typeContext.recoveryAction || 'N/A' }}</span>
            </div>
            <div v-if="event.typeContext.tone" class="event-detail__field">
              <span class="event-detail__label">Tone</span>
              <span>{{ toneLabels[event.typeContext.tone] || event.typeContext.tone }}</span>
            </div>
          </template>

          <!-- Validation -->
          <template v-if="event.typeContext.kind === 'validation'">
            <div class="event-detail__field">
              <span class="event-detail__label">Field Name</span>
              <span>{{ event.typeContext.fieldName || 'N/A' }}</span>
            </div>
            <div v-if="event.typeContext.validationType" class="event-detail__field">
              <span class="event-detail__label">Validation Type</span>
              <span>{{ validationTypeLabels[event.typeContext.validationType] || event.typeContext.validationType }}</span>
            </div>
            <div class="event-detail__field">
              <span class="event-detail__label">Constraint</span>
              <span>{{ event.typeContext.constraint || 'N/A' }}</span>
            </div>
            <div v-if="event.typeContext.exampleValid" class="event-detail__field">
              <span class="event-detail__label">Valid Example</span>
              <span>{{ event.typeContext.exampleValid }}</span>
            </div>
          </template>

          <!-- Transactional Confirmation -->
          <template v-if="event.typeContext.kind === 'transactional_confirmation'">
            <div class="event-detail__field">
              <span class="event-detail__label">Action Completed</span>
              <span>{{ event.typeContext.actionCompleted || 'N/A' }}</span>
            </div>
            <div v-if="event.typeContext.keyDetails" class="event-detail__field">
              <span class="event-detail__label">Key Details</span>
              <span>{{ event.typeContext.keyDetails }}</span>
            </div>
            <div v-if="event.typeContext.nextStep" class="event-detail__field">
              <span class="event-detail__label">Next Step</span>
              <span>{{ event.typeContext.nextStep }}</span>
            </div>
            <div class="event-detail__field">
              <span class="event-detail__label">Secondary CTA</span>
              <span>{{ event.typeContext.hasSecondaryAction ? 'Yes' : 'No' }}</span>
            </div>
          </template>

          <!-- Feedback -->
          <template v-if="event.typeContext.kind === 'feedback'">
            <div class="event-detail__field">
              <span class="event-detail__label">User Action</span>
              <span>{{ event.typeContext.actionCompleted || 'N/A' }}</span>
            </div>
            <div class="event-detail__field">
              <span class="event-detail__label">Undo Action</span>
              <span>{{ event.typeContext.hasUndo ? 'Yes' : 'No' }}</span>
            </div>
          </template>

          <!-- Status Display -->
          <template v-if="event.typeContext.kind === 'status_display'">
            <div class="event-detail__field">
              <span class="event-detail__label">System Component</span>
              <span>{{ event.typeContext.systemComponent || 'N/A' }}</span>
            </div>
            <div v-if="event.typeContext.possibleStates" class="event-detail__field">
              <span class="event-detail__label">Possible States</span>
              <span>{{ event.typeContext.possibleStates }}</span>
            </div>
            <div class="event-detail__field">
              <span class="event-detail__label">Tooltip</span>
              <span>{{ event.typeContext.hasTooltip ? 'Yes' : 'No' }}</span>
            </div>
          </template>
        </div>
      </div>

      <div v-if="event.generatedText" class="event-detail__section">
        <h2>Generated UI Text</h2>
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
                  <th>Field</th>
                  <th>English</th>
                  <th>German</th>
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
  color: #fff;
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
