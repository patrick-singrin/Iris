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
    <!-- Select fields: displayed as label + tag (static info) -->
    <template v-if="field.type === 'select'">
      <div class="field-editor__static">
        <span class="field-editor__static-label">{{ field.label }}</span>
        <scale-tag size="small">{{ fieldText || field.options?.[0] || 'N/A' }}</scale-tag>
      </div>
    </template>

    <!-- Short text fields -->
    <template v-else-if="isShortField">
      <scale-text-field
        :label="field.label"
        :value="fieldText"
        :max-length="field.maxChars || undefined"
        :counter="!!field.maxChars"
        :required="field.required || undefined"
        @scaleChange="handleChange"
      ></scale-text-field>
    </template>

    <!-- Long text fields (textarea) -->
    <template v-else>
      <scale-textarea
        :label="field.label"
        :value="fieldText"
        :max-length="field.maxChars || undefined"
        :counter="!!field.maxChars"
        :required="field.required || undefined"
        @scaleChange="handleChange"
        :rows="textareaRows"
        resize="vertical"
      ></scale-textarea>
    </template>
  </div>
</template>

<style scoped>
.field-editor {
  display: flex;
  flex-direction: column;
}

.field-editor__static {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-editor__static-label {
  font-family: 'TeleNeo', sans-serif;
  font-size: 12px;
  font-weight: 700;
  color: var(--telekom-color-text-and-icon-standard, #000);
}
</style>
