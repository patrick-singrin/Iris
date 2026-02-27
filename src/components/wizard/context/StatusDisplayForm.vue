<script setup lang="ts">
import type { StatusDisplayContext } from '@/types/event'

defineProps<{
  context: StatusDisplayContext
}>()
</script>

<template>
  <fieldset class="context-form">
    <legend class="context-form__legend">
      Status Display Context
      <span class="context-form__hint">Describe the system component and its possible states.</span>
    </legend>

    <!-- System Component -->
    <div class="context-form__field">
      <label class="context-form__label" for="system-component">
        What is being monitored? <span class="context-form__required">*</span>
      </label>
      <input
        id="system-component"
        v-model="context.systemComponent"
        type="text"
        class="context-form__input"
        placeholder="e.g. API connection, Model deployment, Storage usage"
      />
    </div>

    <!-- Possible States -->
    <div class="context-form__field">
      <label class="context-form__label" for="possible-states">Possible states</label>
      <input
        id="possible-states"
        v-model="context.possibleStates"
        type="text"
        class="context-form__input"
        placeholder="e.g. Active, Inactive, Maintenance, Error"
      />
      <span class="context-form__field-hint">Comma-separated list of states this indicator can show.</span>
    </div>

    <!-- Has Tooltip -->
    <div class="context-form__field context-form__field--inline">
      <label class="context-form__checkbox-label">
        <input
          type="checkbox"
          v-model="context.hasTooltip"
          class="context-form__checkbox"
        />
        Include a tooltip with additional context
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

.context-form__field-hint {
  font-size: 12px;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
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
