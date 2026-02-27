<script setup lang="ts">
import { ref } from 'vue'
import type { ComponentTemplate } from '@/types/contentTemplate'
import type { GeneratedText } from '@/types/event'
import FieldEditor from './FieldEditor.vue'

const props = defineProps<{
  component: ComponentTemplate
  generated: GeneratedText
  phasePrefix?: string
}>()

const activeLang = ref<'en' | 'de'>('en')

// Resolve the component ID used in the generated text
// Try multiple formats: lowercase name, snake_case, original keys, phase-prefixed
function getComponentData(): Record<string, { en: string; de: string }> | null {
  const nameKey = props.component.name.toLowerCase().replace(/\s+/g, '_')

  // Phase-prefixed lookup (escalation mode)
  if (props.phasePrefix) {
    const phaseKey = `${props.phasePrefix}_${nameKey}`
    if (props.generated[phaseKey]) return props.generated[phaseKey] ?? null
    // Try partial match with phase prefix
    for (const key of Object.keys(props.generated)) {
      if (key.toLowerCase().startsWith(props.phasePrefix) && key.toLowerCase().includes(nameKey)) {
        return props.generated[key] ?? null
      }
    }
  }

  // Standard lookup
  if (props.generated[nameKey]) return props.generated[nameKey] ?? null
  if (props.generated[props.component.name]) return props.generated[props.component.name] ?? null

  // Try partial match
  for (const key of Object.keys(props.generated)) {
    if (key.toLowerCase().includes(nameKey) || nameKey.includes(key.toLowerCase())) {
      return props.generated[key] ?? null
    }
  }
  return null
}
</script>

<template>
  <div class="component-card">
    <div class="component-card__header">
      <h4>{{ component.name }}</h4>
      <div class="component-card__lang-toggle">
        <scale-button
          size="small"
          :variant="activeLang === 'en' ? 'primary' : 'secondary'"
          @click="activeLang = 'en'"
        >
          English
        </scale-button>
        <scale-button
          size="small"
          :variant="activeLang === 'de' ? 'primary' : 'secondary'"
          @click="activeLang = 'de'"
        >
          Deutsch
        </scale-button>
      </div>
    </div>

    <div class="component-card__fields">
      <FieldEditor
        v-for="field in component.fields"
        :key="field.id"
        :field="field"
        :lang="activeLang"
        :component-data="getComponentData()"
        :phase-prefix="phasePrefix"
      />
    </div>
  </div>
</template>

<style scoped>
.component-card {
  background: var(--telekom-color-background-surface, #fff);
  border: 1px solid var(--telekom-color-ui-border-standard, #ccc);
  border-radius: 8px;
  padding: 20px;
}

.component-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.component-card__header h4 {
  margin: 0;
}

.component-card__lang-toggle {
  display: flex;
  gap: 4px;
}

.component-card__fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
