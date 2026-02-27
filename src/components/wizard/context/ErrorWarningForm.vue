<script setup lang="ts">
import type { ErrorWarningContext } from '@/types/event'

const props = defineProps<{
  context: ErrorWarningContext
}>()

function setErrorType(value: ErrorWarningContext['errorType']) {
  props.context.errorType = value
}

function setTone(value: ErrorWarningContext['tone']) {
  props.context.tone = value
}

const errorTypeOptions = [
  { value: 'system_error', label: 'System error', description: 'Server or infrastructure failure' },
  { value: 'permission_error', label: 'Permission error', description: 'Access denied or insufficient rights' },
  { value: 'resource_error', label: 'Resource error', description: 'Quota exceeded, not found, or unavailable' },
  { value: 'network_error', label: 'Network error', description: 'Connection timeout or unreachable' },
  { value: 'input_error', label: 'Input error', description: 'Invalid data submitted by user' },
] as const

const toneOptions = [
  { value: 'neutral', label: 'Neutral', description: 'Factual, no blame assigned' },
  { value: 'apologetic', label: 'Apologetic', description: 'Acknowledge inconvenience' },
  { value: 'urgent', label: 'Urgent', description: 'Requires immediate attention' },
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
      Error & Warning Context
      <span class="context-form__hint">Describe the error so the generated text is specific and helpful.</span>
    </legend>

    <!-- Error Type -->
    <div class="context-form__field">
      <label class="context-form__label">Error type</label>
      <div class="card-group" role="radiogroup" aria-label="Error type">
        <button
          v-for="opt in errorTypeOptions"
          :key="opt.value"
          class="card"
          :class="{ 'card--selected': context.errorType === opt.value }"
          role="radio"
          :aria-checked="context.errorType === opt.value"
          :tabindex="context.errorType === opt.value || (!context.errorType && opt === errorTypeOptions[0]) ? 0 : -1"
          @click="setErrorType(opt.value)"
          @keydown="handleRadioArrowKey($event, errorTypeOptions, context.errorType, setErrorType)"
        >
          <span class="card__label">{{ opt.label }}</span>
          <span class="card__description">{{ opt.description }}</span>
        </button>
      </div>
    </div>

    <!-- User Action -->
    <div class="context-form__field">
      <label class="context-form__label" for="user-action">What was the user trying to do?</label>
      <input
        id="user-action"
        v-model="context.userAction"
        type="text"
        class="context-form__input"
        placeholder="e.g. Create a new API key"
      />
    </div>

    <!-- What Went Wrong -->
    <div class="context-form__field">
      <label class="context-form__label" for="what-went-wrong">
        What went wrong? <span class="context-form__required">*</span>
      </label>
      <textarea
        id="what-went-wrong"
        v-model="context.whatWentWrong"
        class="context-form__textarea"
        rows="2"
        placeholder="e.g. The API key generation service is temporarily unavailable"
      />
    </div>

    <!-- Recovery Action -->
    <div class="context-form__field">
      <label class="context-form__label" for="recovery-action">
        What should the user do? <span class="context-form__required">*</span>
      </label>
      <textarea
        id="recovery-action"
        v-model="context.recoveryAction"
        class="context-form__textarea"
        rows="2"
        placeholder="e.g. Try again in a few minutes, or contact support"
      />
    </div>

    <!-- Tone -->
    <div class="context-form__field">
      <label class="context-form__label">Tone</label>
      <div class="card-group card-group--compact" role="radiogroup" aria-label="Message tone">
        <button
          v-for="opt in toneOptions"
          :key="opt.value"
          class="card card--compact"
          :class="{ 'card--selected': context.tone === opt.value }"
          role="radio"
          :aria-checked="context.tone === opt.value"
          :tabindex="context.tone === opt.value || (!context.tone && opt === toneOptions[0]) ? 0 : -1"
          @click="setTone(opt.value)"
          @keydown="handleRadioArrowKey($event, toneOptions, context.tone, setTone)"
        >
          <span class="card__label">{{ opt.label }}</span>
          <span class="card__description">{{ opt.description }}</span>
        </button>
      </div>
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

/* Card radio group */
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
