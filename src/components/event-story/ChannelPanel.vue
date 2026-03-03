<script setup lang="ts">
import { computed } from 'vue'
import FieldEditor from '@/components/text-generation/FieldEditor.vue'
import { useTextGenerationStore } from '@/stores/textGenerationStore'
import type { ComponentTemplate } from '@/types/contentTemplate'
import { useI18n } from '@/i18n'

const props = defineProps<{
  component: ComponentTemplate
  lang: 'de' | 'en'
  activeStepId?: string | null
}>()

const { t } = useI18n()
const textStore = useTextGenerationStore()

// Resolve component data — look up by component name (lowercased, spaces to underscores)
const componentId = computed(() => {
  return props.component.name.toLowerCase().replace(/\s+/g, '_')
})

const componentData = computed(() => {
  const data = textStore.generatedText.data
  if (!data) return null

  if (props.activeStepId) {
    // Try step-prefixed component ID
    const stepPrefixed = `${props.activeStepId}_${componentId.value}`
    if (data[stepPrefixed]) return data[stepPrefixed]
  }

  // Try plain component ID
  if (data[componentId.value]) return data[componentId.value]

  // Try partial match
  for (const key of Object.keys(data)) {
    if (key.endsWith(componentId.value) || componentId.value.endsWith(key)) {
      return data[key]
    }
  }

  return null
})

// Filter to text fields only (skip select)
const editableFields = computed(() => {
  return props.component.fields.filter(f => f.type !== 'select')
})

const selectFields = computed(() => {
  return props.component.fields.filter(f => f.type === 'select')
})
</script>

<template>
  <div class="channel-panel">
    <!-- Fields -->
    <div class="channel-panel__fields">
      <div v-if="!componentData" class="channel-panel__empty">
        {{ t('story.channelPlaceholder') }}
      </div>

      <template v-else>
        <!-- Select fields (read-only display) -->
        <FieldEditor
          v-for="field in selectFields"
          :key="field.id"
          :field="field"
          :lang="lang"
          :component-data="componentData"
          :phase-prefix="activeStepId || undefined"
        />

        <!-- Editable text fields -->
        <FieldEditor
          v-for="field in editableFields"
          :key="field.id"
          :field="field"
          :lang="lang"
          :component-data="componentData"
          :phase-prefix="activeStepId || undefined"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.channel-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.channel-panel__fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.channel-panel__empty {
  font-family: 'TeleNeo', sans-serif;
  font-size: 13px;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6f);
  font-style: italic;
  padding: 12px 0;
}
</style>
