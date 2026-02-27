<script setup lang="ts">
import type { FeedbackContext } from '@/types/event'

defineProps<{
  context: FeedbackContext
}>()
</script>

<template>
  <fieldset class="context-form">
    <legend class="context-form__legend">
      Feedback Context
      <span class="context-form__hint">Describe the action this message confirms.</span>
    </legend>

    <!-- Action Completed -->
    <div class="context-form__field">
      <label class="context-form__label" for="action-completed">
        What did the user just do? <span class="context-form__required">*</span>
      </label>
      <input
        id="action-completed"
        v-model="context.actionCompleted"
        type="text"
        class="context-form__input"
        placeholder="e.g. Saved settings, Deleted item, Copied to clipboard"
      />
    </div>

    <!-- Has Undo -->
    <div class="context-form__field context-form__field--inline">
      <label class="context-form__checkbox-label">
        <input
          type="checkbox"
          v-model="context.hasUndo"
          class="context-form__checkbox"
        />
        Include an "Undo" action
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

.context-form__input:focus {
  outline: 2px solid var(--telekom-color-functional-focus-standard, #006cff);
  outline-offset: 1px;
  border-color: transparent;
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
