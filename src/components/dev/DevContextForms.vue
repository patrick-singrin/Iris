<script setup lang="ts">
import { reactive, ref } from 'vue'
import ErrorWarningForm from '@/components/wizard/context/ErrorWarningForm.vue'
import ValidationForm from '@/components/wizard/context/ValidationForm.vue'
import TransactionalConfirmationForm from '@/components/wizard/context/TransactionalConfirmationForm.vue'
import FeedbackForm from '@/components/wizard/context/FeedbackForm.vue'
import StatusDisplayForm from '@/components/wizard/context/StatusDisplayForm.vue'
import type {
  ErrorWarningContext,
  ValidationContext,
  TransactionalConfirmationContext,
  FeedbackContext,
  StatusDisplayContext,
  EventDescription,
} from '@/types/event'
import { createEmptyDescription } from '@/types/event'

// Reactive mock data for each form
const errorWarningCtx = reactive<ErrorWarningContext>({
  kind: 'error_warning',
  errorType: '',
  userAction: '',
  whatWentWrong: '',
  recoveryAction: '',
  tone: '',
})

const validationCtx = reactive<ValidationContext>({
  kind: 'validation',
  fieldName: '',
  validationType: '',
  constraint: '',
  exampleValid: '',
})

const transactionalCtx = reactive<TransactionalConfirmationContext>({
  kind: 'transactional_confirmation',
  actionCompleted: '',
  keyDetails: '',
  nextStep: '',
  hasSecondaryAction: false,
})

const feedbackCtx = reactive<FeedbackContext>({
  kind: 'feedback',
  actionCompleted: '',
  hasUndo: false,
})

const statusDisplayCtx = reactive<StatusDisplayContext>({
  kind: 'status_display',
  systemComponent: '',
  possibleStates: '',
  hasTooltip: false,
})

// Shared event description for the bottom section
const description = reactive<EventDescription>(createEmptyDescription())

const forms = [
  { id: 'error_warning', label: 'Error & Warnings', classification: 'Error & Warnings', channels: ['Inline at point of action'] },
  { id: 'validation', label: 'Validation Messages', classification: 'Validation Messages', channels: ['Inline at point of action'] },
  { id: 'transactional_confirmation', label: 'Transactional Confirmation', classification: 'Transactional Confirmation', channels: ['Inline at point of action', 'Toast'] },
  { id: 'feedback', label: 'Feedback', classification: 'Feedback', channels: ['Toast', 'Inline'] },
  { id: 'status_display', label: 'Status Display', classification: 'Status Display', channels: ['Inline'] },
] as const

const activeForm = ref<string>('error_warning')
</script>

<template>
  <div class="dev-page">
    <div class="dev-page__header">
      <div class="dev-page__badge">DEV</div>
      <h1 class="dev-page__title">Context Forms Reference</h1>
      <p class="dev-page__subtitle">
        All 5 context forms for non-notification types. Each form is shown as it would appear
        inside the WizardPhaseCard during the "Context" step.
      </p>
    </div>

    <!-- Form selector tabs -->
    <div class="dev-page__tabs">
      <button
        v-for="form in forms"
        :key="form.id"
        class="dev-page__tab"
        :class="{ 'dev-page__tab--active': activeForm === form.id }"
        @click="activeForm = form.id"
      >
        {{ form.label }}
      </button>
    </div>

    <!-- Simulated WizardPhaseCard shell -->
    <scale-grid>
      <scale-grid-item size="4,8,8" offset=",,5,5,5">
        <!-- Result tile -->
        <div class="phase-card__result-tile">
          <span class="phase-card__result-tag phase-card__result-tag--teal">
            {{ forms.find(f => f.id === activeForm)?.classification }}
          </span>
          <span
            v-for="ch in forms.find(f => f.id === activeForm)?.channels"
            :key="ch"
            class="phase-card__result-tag"
          >
            {{ ch }}
          </span>
        </div>

        <!-- Card -->
        <div class="phase-card">
          <!-- Step tabs -->
          <div class="phase-card__tabs">
            <span class="phase-card__tab">Classification</span>
            <span class="phase-card__tab phase-card__tab--active">Context</span>
            <span class="phase-card__tab">Summary</span>
          </div>

          <!-- Active context form -->
          <div class="dev-page__form-area">
            <ErrorWarningForm
              v-if="activeForm === 'error_warning'"
              :context="errorWarningCtx"
            />
            <ValidationForm
              v-else-if="activeForm === 'validation'"
              :context="validationCtx"
            />
            <TransactionalConfirmationForm
              v-else-if="activeForm === 'transactional_confirmation'"
              :context="transactionalCtx"
            />
            <FeedbackForm
              v-else-if="activeForm === 'feedback'"
              :context="feedbackCtx"
            />
            <StatusDisplayForm
              v-else-if="activeForm === 'status_display'"
              :context="statusDisplayCtx"
            />

            <!-- Shared: Event Description section (appears in all forms) -->
            <fieldset class="description-section">
              <legend class="description-section__legend">
                Event Description
                <span class="description-section__hint">Describe the scenario so the AI can generate specific text.</span>
              </legend>

              <div class="description-section__field">
                <label class="description-section__label" for="dev-what-happened">
                  What is this about? <span class="description-section__required">*</span>
                </label>
                <textarea
                  id="dev-what-happened"
                  v-model="description.whatHappened"
                  class="description-section__textarea"
                  rows="3"
                  placeholder="e.g. When a user tries to generate an API key but the service is temporarily unavailable"
                />
              </div>

              <div class="description-section__field">
                <label class="description-section__label" for="dev-notes">Additional notes</label>
                <textarea
                  id="dev-notes"
                  v-model="description.additionalNotes"
                  class="description-section__textarea"
                  rows="2"
                  placeholder="Any additional context, constraints, or requirements"
                />
              </div>
            </fieldset>
          </div>

          <!-- Navigation buttons -->
          <div class="phase-card__nav">
            <scale-button variant="secondary" size="small">Back to Classification</scale-button>
            <scale-button size="small">Continue to Summary</scale-button>
          </div>
        </div>
      </scale-grid-item>
    </scale-grid>

    <!-- Form field inventory -->
    <div class="dev-page__inventory">
      <h2>Field Inventory</h2>
      <table class="dev-page__table">
        <thead>
          <tr>
            <th>Form</th>
            <th>Fields</th>
            <th>Input Types Used</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Error & Warning</strong></td>
            <td>Error type*, User action, What went wrong*, Recovery action*, Tone</td>
            <td>Card radio (5) + Input + Textarea×2 + Card radio (3)</td>
          </tr>
          <tr>
            <td><strong>Validation</strong></td>
            <td>Field name*, Validation type, Constraint*, Example valid</td>
            <td>Input + Card radio (5) + Input×2</td>
          </tr>
          <tr>
            <td><strong>Transactional Confirmation</strong></td>
            <td>Action completed*, Key details, Next step, Secondary action</td>
            <td>Input + Textarea + Input + Checkbox</td>
          </tr>
          <tr>
            <td><strong>Feedback</strong></td>
            <td>Action completed*, Include undo</td>
            <td>Input + Checkbox</td>
          </tr>
          <tr>
            <td><strong>Status Display</strong></td>
            <td>System component*, Possible states, Include tooltip</td>
            <td>Input×2 + Checkbox</td>
          </tr>
        </tbody>
      </table>
      <p class="dev-page__note">
        * = required field. All forms also share the "Event Description" section below (What is this about?* + Additional notes).
      </p>
    </div>
  </div>
</template>

<style scoped>
.dev-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  background: var(--telekom-color-background-surface-subtle, #efeff0);
  min-height: calc(100vh - 96px);
  margin: -32px -32px 0;
  padding: 32px;
}

.dev-page__header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 720px;
  margin: 0 auto;
  width: 100%;
}

.dev-page__badge {
  display: inline-flex;
  align-self: flex-start;
  padding: 2px 8px;
  background: #ff6b00;
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.5px;
  border-radius: 4px;
  text-transform: uppercase;
}

.dev-page__title {
  margin: 0;
  font-family: 'TeleNeo', sans-serif;
  font-size: 28px;
  font-weight: 800;
  color: #000;
}

.dev-page__subtitle {
  margin: 0;
  font-size: 15px;
  color: #6c6c6c;
  line-height: 1.5;
}

/* ── Form selector tabs ── */
.dev-page__tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  max-width: 720px;
  margin: 0 auto;
  width: 100%;
}

.dev-page__tab {
  padding: 6px 14px;
  border: 1.5px solid #dfdfe1;
  border-radius: 8px;
  background: #fff;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  color: #191919;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.dev-page__tab:hover {
  border-color: var(--telekom-color-primary-standard, #e20074);
}

.dev-page__tab--active {
  border-color: var(--telekom-color-primary-standard, #e20074);
  background: rgba(226, 0, 116, 0.06);
  color: var(--telekom-color-primary-standard, #e20074);
}

/* ── Phase card simulation (mirrors WizardPhaseCard styles) ── */
.phase-card__result-tile {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  padding: 12px 24px;
  background: #fbfbfb;
  border: 1px solid #dfdfe1;
  border-radius: 8px;
  margin-bottom: 24px;
}

.phase-card__result-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 4px;
  background: #dfdfe1;
  color: #000;
  border-radius: 4px;
  font-family: var(--telekom-typography-font-family-sans, 'TeleNeo', sans-serif);
  font-size: 12px;
  font-weight: 650;
  line-height: 16px;
  white-space: nowrap;
}

.phase-card__result-tag--teal {
  background: #d8f1ec;
  color: #177364;
}

.phase-card {
  background: var(--telekom-color-background-surface, #fff);
  border: 1px solid #dfdfe1;
  border-radius: 8px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.phase-card__tabs {
  display: flex;
  gap: 6px;
}

.phase-card__tab {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 655;
  line-height: 17.5px;
  letter-spacing: -0.14px;
  background: #dfdfe1;
  color: rgba(0, 0, 0, 0.4);
}

.phase-card__tab--active {
  background: #d2eff4;
  color: #00738a;
}

.phase-card__nav {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 8px;
}

.dev-page__form-area {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

/* ── Shared description section (matches ContextAndDescribeStep) ── */
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

/* ── Field inventory table ── */
.dev-page__inventory {
  max-width: 720px;
  margin: 24px auto 0;
  width: 100%;
  background: #fff;
  border: 1px solid #dfdfe1;
  border-radius: 8px;
  padding: 24px;
}

.dev-page__inventory h2 {
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 700;
}

.dev-page__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.dev-page__table th,
.dev-page__table td {
  text-align: left;
  padding: 8px 12px;
  border-bottom: 1px solid #efeff0;
  vertical-align: top;
}

.dev-page__table th {
  font-weight: 700;
  color: #6c6c6c;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.dev-page__note {
  margin: 12px 0 0;
  font-size: 13px;
  color: #6c6c6c;
}
</style>
