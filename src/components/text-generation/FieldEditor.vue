<script setup lang="ts">
import { computed } from 'vue'
import type { FieldTemplate } from '@/types/contentTemplate'
import type { GeneratedTextField } from '@/types/event'
import { useTextGenerationStore } from '@/stores/textGenerationStore'

const props = defineProps<{
  field: FieldTemplate
  lang: 'en' | 'de'
  componentData: Record<string, GeneratedTextField> | null
  phasePrefix?: string
}>()

const { updateField } = useTextGenerationStore()

// Resolve field data — try phase-prefixed ID first, then plain ID, then partial match
function resolveFieldData(): GeneratedTextField | null {
  if (!props.componentData) return null

  // Try phase-prefixed ID
  if (props.phasePrefix) {
    const phasedId = `${props.phasePrefix}_${props.field.id}`
    if (props.componentData[phasedId]) return props.componentData[phasedId] ?? null
  }

  // Try plain ID
  if (props.componentData[props.field.id]) return props.componentData[props.field.id] ?? null

  // Try partial match
  for (const key of Object.keys(props.componentData)) {
    if (key.endsWith(props.field.id) || props.field.id.endsWith(key)) {
      return props.componentData[key] ?? null
    }
  }
  return null
}

const fieldText = computed(() => {
  const data = resolveFieldData()
  if (!data) return ''
  return data[props.lang] || ''
})

const charCount = computed(() => fieldText.value.length)

const isOverLimit = computed(() => {
  if (!props.field.maxChars) return false
  return charCount.value > props.field.maxChars
})

const isUnderMin = computed(() => {
  if (!props.field.minChars) return false
  return charCount.value > 0 && charCount.value < props.field.minChars
})

const isShortField = computed(() => {
  if (props.field.inputSize) return props.field.inputSize === 'short'
  return (props.field.maxChars ?? Infinity) <= 80
})

const textareaRows = computed(() => {
  if (isShortField.value) return 1
  const max = props.field.maxChars ?? 500
  return Math.max(4, Math.ceil(max / 80))
})

function handleChange(event: CustomEvent) {
  const value = event.detail?.value ?? ''
  if (!props.componentData) return

  const store = useTextGenerationStore()
  const phasedFieldId = props.phasePrefix ? `${props.phasePrefix}_${props.field.id}` : props.field.id

  for (const [compKey, fields] of Object.entries(store.generatedText.data)) {
    // Try phase-prefixed field ID first, then plain
    if (fields[phasedFieldId]) {
      updateField(compKey, phasedFieldId, props.lang, value)
      return
    }
    if (fields[props.field.id]) {
      updateField(compKey, props.field.id, props.lang, value)
      return
    }
  }
}
</script>

<template>
  <div class="field-editor">
    <div class="field-editor__header">
      <label class="field-editor__label">
        {{ field.label }}
        <span v-if="field.required" class="field-editor__required">Required</span>
      </label>
      <span
        class="field-editor__count"
        :class="{
          'field-editor__count--over': isOverLimit,
          'field-editor__count--under': isUnderMin,
        }"
      >
        {{ charCount }}
        <template v-if="field.maxChars">/ {{ field.maxChars }}</template>
        <template v-if="field.minChars"> (min {{ field.minChars }})</template>
      </span>
    </div>

    <template v-if="field.type === 'select'">
      <div class="field-editor__select-value">
        {{ fieldText || field.options?.[0] || 'N/A' }}
      </div>
    </template>
    <template v-else-if="isShortField">
      <scale-text-field
        :value="fieldText"
        @scaleChange="handleChange"
      ></scale-text-field>
    </template>
    <template v-else>
      <scale-textarea
        :value="fieldText"
        @scaleChange="handleChange"
        :rows="textareaRows"
        resize="vertical"
      ></scale-textarea>
    </template>

    <p v-if="field.description" class="field-editor__helper">{{ field.description }}</p>
  </div>
</template>

<style scoped>
.field-editor {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-editor__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.field-editor__label {
  font-weight: 600;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.field-editor__required {
  font-size: 11px;
  font-weight: 500;
  color: var(--telekom-color-primary-standard, #e20074);
  border: 1px solid var(--telekom-color-primary-standard, #e20074);
  border-radius: 4px;
  padding: 1px 6px;
}

.field-editor__count {
  font-size: 13px;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  font-variant-numeric: tabular-nums;
}

.field-editor__count--over {
  color: var(--telekom-color-functional-danger-standard, #d90000);
  font-weight: 600;
}

.field-editor__count--under {
  color: var(--telekom-color-functional-warning-standard, #e86c00);
}

.field-editor__helper {
  font-size: 12px;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  margin: 2px 0 0;
}

.field-editor__select-value {
  background: var(--telekom-color-background-canvas, #f4f4f4);
  border: 1px solid var(--telekom-color-ui-border-standard, #ccc);
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 14px;
}
</style>
