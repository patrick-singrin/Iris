<script setup lang="ts">
import type { ValidationContext } from '@/types/event'

const props = defineProps<{
  context: ValidationContext
}>()

function setValidationType(value: ValidationContext['validationType']) {
  props.context.validationType = value
}

const validationTypeOptions = [
  { value: 'format', label: 'Format', description: 'Wrong format (email, phone, URL)' },
  { value: 'required', label: 'Required', description: 'Missing required field' },
  { value: 'range', label: 'Range', description: 'Value out of allowed range' },
  { value: 'dependency', label: 'Dependency', description: 'Depends on another field' },
  { value: 'uniqueness', label: 'Uniqueness', description: 'Value must be unique' },
] as const

function handleRadioArrowKey(event: KeyboardEvent, options: readonly { value: string }[], current: string, setter: (v: any) => void) {
  const idx = options.findIndex(o => o.value === current)
  let next = idx
  if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
    next = (idx + 1) % options.length
  } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
    next = (idx - 1 + options.length) % options.length
  } else {
    return
  }
  event.preventDefault()
  setter(options[next]!.value)
}
</script>

<template>
  <fieldset class="context-form">
    <legend class="context-form__legend">
      Validation Message Context
      <span class="context-form__hint">Describe the validation rule so the generated message is specific.</span>
    </legend>

    <!-- Field Name -->
    <div class="context-form__field">
      <label class="context-form__label" for="field-name">
        Field name <span class="context-form__required">*</span>
      </label>
      <input
        id="field-name"
        v-model="context.fieldName"
        type="text"
        class="context-form__input"
        placeholder="e.g. Email address, API key name"
      />
    </div>

    <!-- Validation Type -->
    <div class="context-form__field">
      <label class="context-form__label">Validation type</label>
      <div class="card-group card-group--compact" role="radiogroup" aria-label="Validation type">
        <button
          v-for="opt in validationTypeOptions"
          :key="opt.value"
          class="card card--compact"
          :class="{ 'card--selected': context.validationType === opt.value }"
          role="radio"
          :aria-checked="context.validationType === opt.value"
          :tabindex="context.validationType === opt.value || (!context.validationType && opt === validationTypeOptions[0]) ? 0 : -1"
          @click="setValidationType(opt.value)"
          @keydown="handleRadioArrowKey($event, validationTypeOptions, context.validationType, setValidationType)"
        >
          <span class="card__label">{{ opt.label }}</span>
          <span class="card__description">{{ opt.description }}</span>
        </button>
      </div>
    </div>

    <!-- Constraint -->
    <div class="context-form__field">
      <label class="context-form__label" for="constraint">
        Constraint / rule <span class="context-form__required">*</span>
      </label>
      <input
        id="constraint"
        v-model="context.constraint"
        type="text"
        class="context-form__input"
        placeholder="e.g. Must be a valid email address, Max 255 characters"
      />
    </div>

    <!-- Example Valid Input -->
    <div class="context-form__field">
      <label class="context-form__label" for="example-valid">Example of valid input</label>
      <input
        id="example-valid"
        v-model="context.exampleValid"
        type="text"
        class="context-form__input"
        placeholder="e.g. user@example.com"
      />
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

.card-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.card-group--compact {
  gap: 6px;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 14px;
  background: var(--telekom-color-background-surface, #fff);
  border: 1.5px solid var(--telekom-color-ui-border-standard, #ccc);
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, background 0.15s;
  font-family: inherit;
}

.card:hover {
  border-color: var(--telekom-color-primary-standard, #e20074);
  background: rgba(226, 0, 116, 0.03);
}

.card--selected {
  border-color: var(--telekom-color-primary-standard, #e20074);
  background: rgba(226, 0, 116, 0.06);
}

.card--compact {
  padding: 8px 12px;
}

.card:focus-visible {
  outline: 2px solid var(--telekom-color-functional-focus-standard, #006cff);
  outline-offset: 1px;
}

.card__label {
  font-size: 14px;
  font-weight: 600;
}

.card__description {
  font-size: 12px;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
}
</style>
