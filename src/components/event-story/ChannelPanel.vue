<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import FieldEditor from '@/components/text-generation/FieldEditor.vue'
import { useTextGenerationStore } from '@/stores/textGenerationStore'
import { useEventStoryStore } from '@/stores/eventStoryStore'
import type { ComponentTemplate } from '@/types/contentTemplate'
import { useI18n } from '@/i18n'

const props = defineProps<{
  component: ComponentTemplate
  lang: 'de' | 'en'
}>()

const { t } = useI18n()
const textStore = useTextGenerationStore()
const eventStore = useEventStoryStore()

const isRegenerating = ref(false)

const escalationSteps = computed(() => eventStore.escalationSteps.value)
const hasEscalation = computed(() => escalationSteps.value.length > 0)

const activeStepIndex = ref(0)

const activeStepId = computed(() => {
  if (!hasEscalation.value) return null
  return escalationSteps.value[activeStepIndex.value]?.id || null
})

// Clamp active step index when steps are removed
watch(escalationSteps, (steps) => {
  if (activeStepIndex.value >= steps.length) {
    activeStepIndex.value = Math.max(0, steps.length - 1)
  }
})

/** Check if a step has generated text in the store. */
function stepHasText(stepId: string): boolean {
  const prefix = `${stepId}_`
  return Object.keys(textStore.generatedText.data).some(k => k.startsWith(prefix))
}

// Resolve component data — look up by component name (lowercased, spaces to underscores)
const componentId = computed(() => {
  return props.component.name.toLowerCase().replace(/\s+/g, '_')
})

const componentData = computed(() => {
  const data = textStore.generatedText.data
  if (!data) return null

  if (hasEscalation.value && activeStepId.value) {
    // Try step-prefixed component ID
    const stepPrefixed = `${activeStepId.value}_${componentId.value}`
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

async function regenerateTab() {
  isRegenerating.value = true
  try {
    await eventStore.regenerateForComponent(componentId.value)
  } finally {
    isRegenerating.value = false
  }
}
</script>

<template>
  <div class="channel-panel">
    <!-- Escalation sub-tabs -->
    <div v-if="hasEscalation" class="channel-panel__escalation-tabs" role="tablist">
      <button
        v-for="(step, index) in escalationSteps"
        :key="step.id"
        class="channel-panel__escalation-tab"
        :class="{ 'channel-panel__escalation-tab--active': activeStepIndex === index }"
        role="tab"
        :aria-selected="activeStepIndex === index"
        @click="activeStepIndex = index"
      >
        {{ step.label || `Step ${index + 1}` }}
        <span v-if="stepHasText(step.id)" class="channel-panel__step-check">&#10003;</span>
      </button>
    </div>

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

    <!-- Per-tab regenerate -->
    <div class="channel-panel__regen-row">
      <scale-button
        variant="secondary"
        size="small"
        :disabled="isRegenerating || eventStore.isGeneratingText.value"
        @click="regenerateTab"
      >
        {{ isRegenerating ? t('story.generating') : t('story.regenerateTab') }}
      </scale-button>
    </div>
  </div>
</template>

<style scoped>
.channel-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.channel-panel__escalation-tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--telekom-color-ui-faint, #dfdfe1);
  padding-bottom: 0;
}

.channel-panel__escalation-tab {
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 8px 14px;
  font-family: 'TeleNeo', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6f);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  margin-bottom: -1px;
}

.channel-panel__escalation-tab:hover {
  color: var(--telekom-color-text-and-icon-standard, #000);
}

.channel-panel__escalation-tab--active {
  color: var(--telekom-color-primary-standard, #e20074);
  border-bottom-color: var(--telekom-color-primary-standard, #e20074);
}

.channel-panel__step-check {
  margin-left: 4px;
  font-size: 11px;
  color: var(--telekom-color-functional-success-standard, #2c8646);
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

.channel-panel__regen-row {
  display: flex;
  justify-content: flex-end;
  padding-top: 4px;
}
</style>
