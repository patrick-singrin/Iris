<script setup lang="ts">
import { computed } from 'vue'
import type { EventDescription, Classification, TypeContext, EscalationStep } from '@/types/event'
import { hasEscalationSteps } from '@/types/event'
import { useTextGenerationStore } from '@/stores/textGenerationStore'
import { getNotificationComponents, getComponentsForType, getEscalationPhases, resolveTypeKey } from '@/services/contentTemplates'
import { createProvider } from '@/services/llm/providerFactory'
import { buildSystemPrompt, buildUserPrompt } from '@/services/llm/promptBuilder'
import { useProductContextStore } from '@/stores/productContextStore'
import ComponentTextCard from './ComponentTextCard.vue'

const props = defineProps<{
  description: EventDescription
  classification: Classification
  typeContext?: TypeContext | null
}>()

const { isGenerating, error, generatedText, rawResponse, setGeneratedText } = useTextGenerationStore()

const isNotification = computed(() => props.classification.type === 'Notification')

const components = computed(() => {
  if (isNotification.value) {
    return getNotificationComponents(props.classification.severity || '')
  }
  const typeKey = resolveTypeKey(props.classification.type)
  return typeKey ? getComponentsForType(typeKey) : []
})

const escalationSteps = computed<EscalationStep[]>(() => {
  if (hasEscalationSteps(props.classification.escalation)) {
    return props.classification.escalation
  }
  // Legacy boolean support — convert to old 4-phase format
  if (props.classification.escalation === true) {
    return getEscalationPhases().map(p => ({
      id: p.id,
      label: p.name,
      relativeTime: p.description,
      relativeDays: 0,
      tone: p.tone,
    }))
  }
  return []
})

const hasEscalation = computed(() => escalationSteps.value.length > 0)

const componentNames = computed(() => components.value.map(c => c.name).join(', '))

async function generate() {
  isGenerating.value = true
  error.value = null

  try {
    const { getProductContext } = useProductContextStore()
    const productContext = await getProductContext()
    const provider = createProvider()
    const systemPrompt = buildSystemPrompt(productContext)
    const userPrompt = buildUserPrompt(
      props.description,
      props.classification,
      components.value,
      hasEscalation.value ? escalationSteps.value : undefined,
      props.typeContext,
    )

    const result = await provider.generateText({
      systemPrompt,
      userPrompt,
      maxTokens: hasEscalation.value ? 4096 * escalationSteps.value.length : 4096,
    })

    rawResponse.value = result.rawResponse

    if (result.parsedFields) {
      setGeneratedText(result.parsedFields)
    } else {
      error.value = 'Could not parse AI response. The raw response is shown below for manual editing.'
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'An unknown error occurred'
  } finally {
    isGenerating.value = false
  }
}
</script>

<template>
  <div class="text-gen">
    <h3>Generate UI Text</h3>

    <div v-if="components.length === 0" class="text-gen__empty">
      No applicable components found for this event type.
    </div>

    <template v-else>
      <p class="text-gen__helper">
        <template v-if="isNotification">
          Components for <strong>{{ classification.severity }}</strong> severity: {{ componentNames }}
        </template>
        <template v-else>
          Components for <strong>{{ classification.type }}</strong>: {{ componentNames }}
        </template>
      </p>

      <scale-notification
        v-if="hasEscalation"
        variant="informational"
        heading="Escalation mode"
        opened
      >
        This scheduled event uses escalation. Text will be generated for {{ escalationSteps.length }} steps:
        {{ escalationSteps.map(s => s.label).join(' → ') }}
      </scale-notification>

      <div class="text-gen__controls">
        <scale-button
          :disabled="isGenerating"
          @click="generate"
        >
          {{ Object.keys(generatedText.data).length > 0 ? 'Regenerate' : 'Generate text' }}
        </scale-button>
        <span v-if="isGenerating" class="text-gen__loading">Generating...</span>
      </div>

      <scale-notification
        v-if="error"
        variant="danger"
        heading="Generation error"
        opened
      >
        {{ error }}
      </scale-notification>

      <!-- Raw response fallback -->
      <div v-if="rawResponse && !Object.keys(generatedText.data).length" class="text-gen__raw">
        <h4>Raw AI Response</h4>
        <pre>{{ rawResponse }}</pre>
      </div>

      <!-- Generated text cards — escalation mode -->
      <template v-if="hasEscalation && Object.keys(generatedText.data).length > 0">
        <div v-for="step in escalationSteps" :key="step.id" class="text-gen__phase">
          <h4 class="text-gen__phase-title">
            <scale-tag size="small" color="cyan">{{ step.label }}</scale-tag>
            <span class="text-gen__phase-desc">{{ step.relativeTime }}</span>
          </h4>
          <div class="text-gen__cards">
            <ComponentTextCard
              v-for="component in components"
              :key="step.id + '_' + component.name"
              :component="component"
              :generated="generatedText.data"
              :phase-prefix="step.id"
            />
          </div>
        </div>
      </template>

      <!-- Generated text cards — standard mode -->
      <div v-else-if="Object.keys(generatedText.data).length > 0" class="text-gen__cards">
        <ComponentTextCard
          v-for="component in components"
          :key="component.name"
          :component="component"
          :generated="generatedText.data"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.text-gen {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.text-gen__helper {
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  font-size: 14px;
  margin: 0;
}

.text-gen__controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.text-gen__loading {
  font-size: 14px;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
}

.text-gen__empty {
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  font-size: 14px;
}

.text-gen__raw {
  background: var(--telekom-color-background-surface, #fff);
  border: 1px solid var(--telekom-color-ui-border-standard, #ccc);
  border-radius: 8px;
  padding: 16px;
}

.text-gen__raw pre {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 13px;
}

.text-gen__cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.text-gen__phase {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--telekom-color-background-surface-subtle, #f9f9f9);
  border-radius: 8px;
}

.text-gen__phase-title {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.text-gen__phase-desc {
  font-size: 13px;
  font-weight: 400;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
}
</style>
