<script setup lang="ts">
import type { TransactionalConfirmationContext } from '@/types/event'

defineProps<{
  context: TransactionalConfirmationContext
}>()
</script>

<template>
  <fieldset class="context-form">
    <legend class="context-form__legend">
      Transactional Confirmation Context
      <span class="context-form__hint">Describe the completed action for the confirmation screen.</span>
    </legend>

    <!-- Action Completed -->
    <div class="context-form__field">
      <label class="context-form__label" for="action-completed">
        What action was completed? <span class="context-form__required">*</span>
      </label>
      <input
        id="action-completed"
        v-model="context.actionCompleted"
        type="text"
        class="context-form__input"
        placeholder="e.g. API key created, Account upgraded, File uploaded"
      />
    </div>

    <!-- Key Details -->
    <div class="context-form__field">
      <label class="context-form__label" for="key-details">Key details to show the user</label>
      <textarea
        id="key-details"
        v-model="context.keyDetails"
        class="context-form__textarea"
        rows="2"
        placeholder="e.g. New API key value, order number, file name"
      />
    </div>

    <!-- Next Step -->
    <div class="context-form__field">
      <label class="context-form__label" for="next-step">Suggested next step</label>
      <input
        id="next-step"
        v-model="context.nextStep"
        type="text"
        class="context-form__input"
        placeholder="e.g. Copy the key now — it won't be shown again"
      />
    </div>

    <!-- Has Secondary Action -->
    <div class="context-form__field context-form__field--inline">
      <label class="context-form__checkbox-label">
        <input
          type="checkbox"
          v-model="context.hasSecondaryAction"
          class="context-form__checkbox"
        />
        Include a secondary action (e.g. "Go to dashboard")
      </label>
    </div>
  </fieldset>
</template>

<style scoped>
.context-form {
  border: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.context-form__legend {
  font-size: 16px;
  font-weight: 700;
  color: var(--telekom-color-text-and-icon-standard, #191919);
  margin-bottom: 4px;
}

.context-form__hint {
  display: block;
  font-size: 13px;
  font-weight: 400;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  margin-top: 4px;
}

.context-form__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.context-form__field--inline {
  flex-direction: row;
  align-items: center;
}

.context-form__label {
  font-size: 14px;
  font-weight: 600;
  color: var(--telekom-color-text-and-icon-standard, #191919);
}

.context-form__required {
  color: var(--telekom-color-functional-danger-standard, #e82010);
}

.context-form__input {
  padding: 10px 12px;
  border: 1px solid var(--telekom-color-ui-border-standard, #ccc);
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  background: var(--telekom-color-background-surface, #fff);
}

.context-form__input:focus,
.context-form__textarea:focus {
  outline: 2px solid var(--telekom-color-functional-focus-standard, #006cff);
  outline-offset: 1px;
  border-color: transparent;
}

.context-form__textarea {
  padding: 10px 12px;
  border: 1px solid var(--telekom-color-ui-border-standard, #ccc);
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  background: var(--telekom-color-background-surface, #fff);
}

.context-form__checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  cursor: pointer;
}

.context-form__checkbox {
  width: 18px;
  height: 18px;
  accent-color: var(--telekom-color-primary-standard, #e20074);
}
</style>
