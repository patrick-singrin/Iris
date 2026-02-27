<script setup lang="ts">
import { computed } from 'vue'
import type { TypeContext, EventDescription } from '@/types/event'
import ErrorWarningForm from './context/ErrorWarningForm.vue'
import ValidationForm from './context/ValidationForm.vue'
import TransactionalConfirmationForm from './context/TransactionalConfirmationForm.vue'
import FeedbackForm from './context/FeedbackForm.vue'
import StatusDisplayForm from './context/StatusDisplayForm.vue'

const props = defineProps<{
  typeContext: TypeContext
  description: EventDescription
  classificationType: string
}>()

const descriptionPlaceholder = computed(() => {
  switch (props.typeContext.kind) {
    case 'error_warning':
      return 'e.g. When a user tries to generate an API key but the service is temporarily unavailable'
    case 'validation':
      return 'e.g. Email field validation when the user enters an invalid format'
    case 'transactional_confirmation':
      return 'e.g. Confirmation shown after a user creates a new API key'
    case 'feedback':
      return 'e.g. Message shown after saving account settings'
    case 'status_display':
      return 'e.g. Status indicator showing the current state of the API connection'
    default:
      return 'Describe the event scenario'
  }
})
</script>

<template>
  <div class="context-step">
    <!-- Type-specific context form -->
    <ErrorWarningForm
      v-if="typeContext.kind === 'error_warning'"
      :context="typeContext"
    />
    <ValidationForm
      v-else-if="typeContext.kind === 'validation'"
      :context="typeContext"
    />
    <TransactionalConfirmationForm
      v-else-if="typeContext.kind === 'transactional_confirmation'"
      :context="typeContext"
    />
    <FeedbackForm
      v-else-if="typeContext.kind === 'feedback'"
      :context="typeContext"
    />
    <StatusDisplayForm
      v-else-if="typeContext.kind === 'status_display'"
      :context="typeContext"
    />

    <!-- Shared: Event description -->
    <fieldset class="description-section">
      <legend class="description-section__legend">
        Event Description
        <span class="description-section__hint">Describe the scenario so the AI can generate specific text.</span>
      </legend>

      <div class="description-section__field">
        <label class="description-section__label" for="ctx-what-happened">
          What is this about? <span class="description-section__required">*</span>
        </label>
        <textarea
          id="ctx-what-happened"
          v-model="description.whatHappened"
          class="description-section__textarea"
          rows="3"
          :placeholder="descriptionPlaceholder"
        />
      </div>

      <div class="description-section__field">
        <label class="description-section__label" for="ctx-additional-notes">Additional notes</label>
        <textarea
          id="ctx-additional-notes"
          v-model="description.additionalNotes"
          class="description-section__textarea"
          rows="2"
          placeholder="Any additional context, constraints, or requirements"
        />
      </div>
    </fieldset>
  </div>
</template>

<style scoped>
.context-step {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.description-section {
  border: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 28px;
  border-top: 1px solid var(--telekom-color-ui-border-standard, #ccc);
}

.description-section__legend {
  font-size: 16px;
  font-weight: 700;
  color: var(--telekom-color-text-and-icon-standard, #191919);
  margin-bottom: 4px;
}

.description-section__hint {
  display: block;
  font-size: 13px;
  font-weight: 400;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  margin-top: 4px;
}

.description-section__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.description-section__label {
  font-size: 14px;
  font-weight: 600;
  color: var(--telekom-color-text-and-icon-standard, #191919);
}

.description-section__required {
  color: var(--telekom-color-functional-danger-standard, #e82010);
}

.description-section__textarea {
  padding: 10px 12px;
  border: 1px solid var(--telekom-color-ui-border-standard, #ccc);
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  background: var(--telekom-color-background-surface, #fff);
}

.description-section__textarea:focus {
  outline: 2px solid var(--telekom-color-functional-focus-standard, #006cff);
  outline-offset: 1px;
  border-color: transparent;
}
</style>
