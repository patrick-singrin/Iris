<script setup lang="ts">
import { ref, computed } from 'vue'
import type { EventDescription, Classification } from '@/types/event'
import { createProvider } from '@/services/llm/providerFactory'

const props = defineProps<{
  description: EventDescription
  classification: Classification | null
}>()

const aiStatus = ref<'idle' | 'loading' | 'generated' | 'error'>('idle')
const aiError = ref('')

/**
 * Builds a template string from the structured answers to pre-fill the description.
 */
const descriptionTemplate = computed(() => {
  const parts: string[] = []

  // Type
  if (props.classification?.type) {
    parts.push(`This ${props.classification.type.toLowerCase()} event`)
  }

  // Who is affected
  const affected = props.description.whoAffected
  if (affected.length > 0) {
    parts.push(`affects ${affected.join(', ').toLowerCase()}`)
  }

  // Impact
  if (props.description.userImpact === 'blocked') {
    parts.push('— users are blocked and cannot complete their tasks')
  } else if (props.description.userImpact === 'degraded') {
    parts.push('— users experience degraded service')
  } else if (props.description.userImpact === 'no_impact') {
    parts.push('— no direct impact on user workflows')
  }

  // Timing
  if (props.description.timing === 'now') {
    parts.push('. This is currently active.')
  } else if (props.description.timing === 'scheduled') {
    const leadMap: Record<string, string> = {
      less_than_24h: 'within 24 hours',
      '1_to_7_days': 'within 1–7 days',
      more_than_7_days: 'in more than 7 days',
    }
    const lead = leadMap[props.description.leadTime] || 'at a scheduled time'
    parts.push(`. This is scheduled ${lead}.`)
  }

  // Action
  if (props.description.actionRequired === 'mandatory') {
    parts.push(' Users must take action.')
  } else if (props.description.actionRequired === 'recommended') {
    parts.push(' User action is recommended.')
  }

  return parts.join(' ')
})

/**
 * Inserts the template into the description field.
 */
function useTemplate() {
  props.description.whatHappened = descriptionTemplate.value
}

/**
 * Calls the LLM to suggest a description based on all structured data.
 */
async function suggestWithAI() {
  aiStatus.value = 'loading'
  aiError.value = ''

  try {
    const provider = createProvider()

    const contextParts = [
      `Event type: ${props.classification?.type || 'Unknown'}`,
      props.classification?.severity ? `Severity: ${props.classification.severity}` : null,
      `User impact: ${props.description.userImpact || 'unknown'}`,
      props.description.userScope ? `Scope: ${props.description.userScope} users` : null,
      `Affected: ${props.description.whoAffected.join(', ') || 'not specified'}`,
      `Action required: ${props.description.actionRequired || 'not specified'}`,
      props.description.actionDescription ? `Action details: ${props.description.actionDescription}` : null,
      `Timing: ${props.description.timing || 'not specified'}`,
      props.description.leadTime ? `Lead time: ${props.description.leadTime.replace(/_/g, ' ')}` : null,
      `Security/compliance: ${props.description.securityCompliance ? 'Yes' : 'No'}`,
      props.description.workaroundAvailable ? `Workaround: ${props.description.workaroundAvailable.replace(/_/g, ' ')}` : null,
    ].filter(Boolean).join('\n')

    const result = await provider.generateText({
      systemPrompt: `You are helping document a platform event for user communication. Write a clear, professional event description (2-4 sentences) based on the structured data provided. The description should be suitable for an internal event database. Write in present tense. Be specific but concise. Do not include any formatting, markdown, or headers — just the plain text description.`,
      userPrompt: `Based on this event data, write a concise event description:\n\n${contextParts}`,
      maxTokens: 200,
    })

    if (result.rawResponse) {
      props.description.whatHappened = result.rawResponse.trim()
      aiStatus.value = 'generated'
    } else {
      aiStatus.value = 'error'
      aiError.value = 'AI returned an empty response.'
    }
  } catch (e) {
    aiStatus.value = 'error'
    aiError.value = e instanceof Error ? e.message : 'An unknown error occurred'
  }
}

function discardAISuggestion() {
  props.description.whatHappened = ''
  aiStatus.value = 'idle'
}

// Template is shown as a hint, not pre-filled
</script>

<template>
  <div class="description-editor">
    <!-- Context Summary -->
    <div class="context-box" v-if="classification">
      <div class="context-box__title">Event context</div>
      <div class="context-box__grid">
        <div class="context-item">
          <span class="context-item__label">Type</span>
          <span class="context-item__value">{{ classification.type }}</span>
        </div>
        <div class="context-item" v-if="classification.severity">
          <span class="context-item__label">Severity</span>
          <scale-tag
            :color="classification.severity === 'CRITICAL' ? 'red' : classification.severity === 'HIGH' ? 'orange' : classification.severity === 'MEDIUM' ? 'yellow' : 'green'"
            size="small"
            type="strong"
          >
            {{ classification.severity }}
          </scale-tag>
        </div>
        <div class="context-item" v-if="description.userImpact">
          <span class="context-item__label">Impact</span>
          <span class="context-item__value">{{ description.userImpact === 'blocked' ? 'Blocked' : description.userImpact === 'degraded' ? 'Degraded' : 'No impact' }}</span>
        </div>
        <div class="context-item" v-if="description.timing">
          <span class="context-item__label">Timing</span>
          <span class="context-item__value">{{ description.timing === 'now' ? 'Happening now' : 'Scheduled' }}</span>
        </div>
      </div>
    </div>

    <!-- Template hint -->
    <div v-if="descriptionTemplate && !description.whatHappened.trim()" class="template-hint">
      <div class="template-hint__header">
        <span class="template-hint__label">Suggested starting point</span>
        <scale-button variant="secondary" size="small" @click="useTemplate">
          Use template
        </scale-button>
      </div>
      <p class="template-hint__text">{{ descriptionTemplate }}</p>
    </div>

    <!-- Description field -->
    <div class="description-field">
      <label class="description-field__label">Describe the event</label>
      <p class="description-field__helper">
        Write a clear description of what is happening, who is affected, and what (if anything) users need to do.
      </p>
      <details class="description-examples">
        <summary class="description-examples__toggle">Show examples</summary>
        <div class="description-examples__content">
          <div class="description-examples__item description-examples__item--good">
            <span class="description-examples__label">✓ Good</span>
            <p>The single sign-on service is currently unavailable, preventing all users from logging in. Our team is investigating the root cause. No user action is required — the issue will be resolved automatically.</p>
          </div>
          <div class="description-examples__item description-examples__item--poor">
            <span class="description-examples__label">✗ Too vague</span>
            <p>There is an issue with the login system. We are working on it.</p>
          </div>
        </div>
      </details>
      <scale-textarea
        label="Event description"
        :value="description.whatHappened"
        @scaleChange="(e: CustomEvent) => description.whatHappened = e.detail.value ?? ''"
        rows="6"
        resize="vertical"
        :placeholder="descriptionTemplate || 'Describe what happened, who is affected, and what users should do...'"
      ></scale-textarea>

      <div class="description-field__actions">
        <scale-button
          v-if="aiStatus !== 'loading'"
          variant="secondary"
          size="small"
          @click="suggestWithAI"
        >
          ✨ {{ aiStatus === 'generated' ? 'Regenerate with AI' : 'Suggest with AI' }}
        </scale-button>
        <div v-if="aiStatus === 'loading'" class="description-field__loading">
          <scale-loading-spinner size="small"></scale-loading-spinner>
          <span>Generating suggestion...</span>
        </div>
        <scale-button
          v-if="aiStatus === 'generated'"
          variant="ghost"
          size="small"
          @click="discardAISuggestion"
        >
          Discard suggestion
        </scale-button>
      </div>

      <scale-notification
        v-if="aiStatus === 'generated'"
        variant="informational"
        heading="AI-generated draft"
        opened
      >
        This description was generated by AI based on your answers above. Review and edit as needed.
      </scale-notification>

      <scale-notification
        v-if="aiStatus === 'error'"
        variant="danger"
        heading="AI suggestion failed"
        opened
      >
        {{ aiError }}
      </scale-notification>
    </div>

    <!-- Additional notes -->
    <div class="description-field">
      <scale-textarea
        label="Additional notes (optional)"
        :value="description.additionalNotes"
        @scaleChange="(e: CustomEvent) => description.additionalNotes = e.detail.value ?? ''"
        rows="3"
        resize="vertical"
        helper-text="Workarounds, ticket links, estimated resolution time, related events"
      ></scale-textarea>
    </div>
  </div>
</template>

<style scoped>
.description-editor {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Context box */
.context-box {
  background: var(--telekom-color-background-surface-subtle, #f9f9f9);
  border: 1px solid var(--telekom-color-ui-border-standard, #ccc);
  border-radius: 8px;
  padding: 16px;
}

.context-box__title {
  font-size: 13px;
  font-weight: 700;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}

.context-box__grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.context-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.context-item__label {
  font-size: 12px;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
}

.context-item__value {
  font-size: 14px;
  font-weight: 500;
  color: var(--telekom-color-text-and-icon-standard, #191919);
}

/* Template hint */
.template-hint {
  background: var(--telekom-color-background-surface-subtle, #f9f9f9);
  border: 1px dashed var(--telekom-color-ui-border-standard, #ccc);
  border-radius: 8px;
  padding: 16px;
}

.template-hint__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.template-hint__label {
  font-size: 13px;
  font-weight: 600;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.template-hint__text {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  font-style: italic;
}

/* Description field */
.description-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.description-field__label {
  font-size: 15px;
  font-weight: 500;
  color: var(--telekom-color-text-and-icon-standard, #191919);
}

.description-field__helper {
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  font-size: 13px;
  margin: 0;
}

.description-field__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.description-field__loading {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
}

/* Description examples */
.description-examples {
  margin-top: -4px;
}

.description-examples__toggle {
  font-size: 13px;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  cursor: pointer;
  user-select: none;
}

.description-examples__toggle:hover {
  color: var(--telekom-color-primary-standard, #e20074);
}

.description-examples__content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
}

.description-examples__item {
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.5;
}

.description-examples__item p {
  margin: 4px 0 0;
}

.description-examples__item--good {
  background: rgba(0, 179, 103, 0.06);
  border: 1px solid rgba(0, 179, 103, 0.2);
}

.description-examples__item--poor {
  background: rgba(232, 32, 16, 0.04);
  border: 1px solid rgba(232, 32, 16, 0.15);
}

.description-examples__label {
  font-weight: 700;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.description-examples__item--good .description-examples__label {
  color: var(--telekom-color-functional-success-standard, #00b367);
}

.description-examples__item--poor .description-examples__label {
  color: var(--telekom-color-functional-danger-standard, #e82010);
}
</style>
