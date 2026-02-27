/**
 * Story Text Generator — generates bilingual UI text from the event story flow.
 *
 * Bridges the story flow's checklist data into the prompt builder and
 * writes results into the shared textGenerationStore.
 */

import { createProvider } from './providerFactory'
import { buildSystemPrompt } from './promptBuilder'
import { getNotificationComponents, getComponentsForType, resolveTypeKey } from '@/services/contentTemplates'
import { useTextGenerationStore } from '@/stores/textGenerationStore'
import { useProductContextStore } from '@/stores/productContextStore'
import type { StoryChecklistItem, StoryClassification } from '@/data/story-questions'
import type { EscalationStep } from '@/types/event'
import type { ComponentTemplate } from '@/types/contentTemplate'
import { buildPlaceholderReference, formatPlaceholderList } from '@/data/placeholders'

// ---------------------------------------------------------------------------
// Story-specific user prompt builder
// ---------------------------------------------------------------------------

function buildStoryUserPrompt(
  checklist: StoryChecklistItem[],
  classification: StoryClassification,
  storyText: string,
  components: ComponentTemplate[],
  escalationSteps?: EscalationStep[],
): string {
  const sections: string[] = []

  // Event context from checklist
  sections.push('## Event Context')

  const filled = checklist.filter(i => i.filled)
  for (const item of filled) {
    const val = Array.isArray(item.value) ? item.value.join(', ') : item.value
    const desc = item.description ? ` (${item.description})` : ''
    sections.push(`${item.label}: ${val}${desc}`)
  }

  sections.push('')
  sections.push('## Event Narrative')
  sections.push(storyText || '(no narrative provided)')

  sections.push('')
  sections.push('## Placeholder Instructions')
  sections.push('The narrative may contain {placeholders} in curly braces. These represent variable values that change per event instance.')
  sections.push('PRESERVE all {placeholders} exactly as they appear in the narrative. Do NOT replace them with actual values.')
  sections.push(`Available placeholders: ${formatPlaceholderList()}`)
  sections.push(`Full reference: ${buildPlaceholderReference()}`)

  sections.push('')
  sections.push('## Classification')
  sections.push(`Type: ${classification.type}`)
  sections.push(`Severity: ${classification.severity || 'N/A'}`)
  sections.push(`Channels: ${classification.channels.join(', ')}`)

  sections.push('')
  sections.push('## Fields to Generate')
  sections.push('Generate text for each field below. Character limits are HARD LIMITS — never exceed them, not even by 1 character. German text tends to be longer; use shorter phrasing in German to stay within limits.')
  sections.push('')

  function appendComponentFields(component: ComponentTemplate, idPrefix?: string) {
    const componentId = idPrefix
      ? `${idPrefix}_${component.name.toLowerCase().replace(/\s+/g, '_')}`
      : component.name.toLowerCase().replace(/\s+/g, '_')
    sections.push(`### Component: ${component.name} (ID: ${componentId})`)

    for (const field of component.fields) {
      const fieldId = idPrefix ? `${idPrefix}_${field.id}` : field.id
      const parts: string[] = [`- **${field.label}** (ID: ${fieldId})`]
      if (field.maxChars) parts.push(`max ${field.maxChars} chars`)
      if (field.minChars) parts.push(`min ${field.minChars} chars`)
      parts.push(field.required ? 'REQUIRED' : 'optional')
      if (field.description) parts.push(`— ${field.description}`)

      if (field.type === 'select' && field.options) {
        const severity = classification.severity || ''
        let selectedOption = field.options[0]
        if (field.id === 'banner_dismiss') {
          selectedOption = severity === 'CRITICAL' ? 'Must acknowledge' : 'Dismissible'
        } else if (field.id === 'email_importance') {
          selectedOption = (severity === 'CRITICAL' || severity === 'HIGH') ? 'High' : 'Normal'
        }
        parts.push(`[SELECT: ${selectedOption}]`)
      }

      sections.push(parts.join(' | '))
    }
    sections.push('')
  }

  if (escalationSteps && escalationSteps.length > 0) {
    sections.push('This is a SCHEDULED event with ESCALATION.')
    sections.push(`There are ${escalationSteps.length} communication steps.`)
    sections.push('Generate separate text for each step.')
    sections.push('Use step-prefixed IDs: {stepId}_{componentId} and {stepId}_{fieldId}.')
    sections.push('')

    for (const step of escalationSteps) {
      sections.push(`## Step: ${step.label} (ID: ${step.id})`)
      sections.push(`Timing: ${step.relativeTime}`)
      if (step.tone) sections.push(`Tone: ${step.tone}`)
      sections.push('')
      for (const component of components) {
        appendComponentFields(component, step.id)
      }
    }
  } else {
    for (const component of components) {
      appendComponentFields(component)
    }
  }

  return sections.join('\n')
}

// ---------------------------------------------------------------------------
// Resolve components for the classification
// ---------------------------------------------------------------------------

function resolveComponents(classification: StoryClassification): ComponentTemplate[] {
  // Notification type uses severity-based component filtering
  if (classification.type === 'Notification') {
    return getNotificationComponents(classification.severity || '')
  }
  // Other types use type-key based lookup
  const typeKey = resolveTypeKey(classification.type)
  return typeKey ? getComponentsForType(typeKey) : []
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function regenerateComponentText(
  componentId: string,
  checklist: StoryChecklistItem[],
  classification: StoryClassification,
  storyText: string,
  escalationSteps?: EscalationStep[],
): Promise<void> {
  const store = useTextGenerationStore()
  store.isGenerating.value = true

  try {
    const allComponents = resolveComponents(classification)
    const target = allComponents.find(
      c => c.name.toLowerCase().replace(/\s+/g, '_') === componentId,
    )
    if (!target) throw new Error(`Component "${componentId}" not found.`)

    const { getProductContext } = useProductContextStore()
    const productContext = await getProductContext()
    const provider = createProvider()
    const systemPrompt = buildSystemPrompt(productContext)
    const userPrompt = buildStoryUserPrompt(
      checklist,
      classification,
      storyText,
      [target],
      escalationSteps,
    )

    const result = await provider.generateText({
      systemPrompt,
      userPrompt,
      maxTokens: escalationSteps && escalationSteps.length > 0
        ? 4096 * escalationSteps.length
        : 4096,
    })

    if (result.parsedFields) {
      // Merge only the regenerated component(s) into the existing data
      for (const [key, value] of Object.entries(result.parsedFields)) {
        store.mergeGeneratedText(key, value as Record<string, { en: string; de: string }>)
      }
    } else {
      throw new Error('Could not parse AI response.')
    }
  } catch (err) {
    store.error.value = err instanceof Error ? err.message : 'An unknown error occurred'
    throw err
  } finally {
    store.isGenerating.value = false
  }
}

export async function generateStoryText(
  checklist: StoryChecklistItem[],
  classification: StoryClassification,
  storyText: string,
  escalationSteps?: EscalationStep[],
): Promise<void> {
  const store = useTextGenerationStore()
  store.reset()
  store.isGenerating.value = true

  try {
    const components = resolveComponents(classification)
    if (components.length === 0) {
      throw new Error('No applicable components found for this event type.')
    }

    const { getProductContext } = useProductContextStore()
    const productContext = await getProductContext()
    const provider = createProvider()
    const systemPrompt = buildSystemPrompt(productContext)
    const userPrompt = buildStoryUserPrompt(
      checklist,
      classification,
      storyText,
      components,
      escalationSteps,
    )

    const maxTokens = escalationSteps && escalationSteps.length > 0
      ? 4096 * escalationSteps.length
      : 4096

    const result = await provider.generateText({
      systemPrompt,
      userPrompt,
      maxTokens,
    })

    store.rawResponse.value = result.rawResponse

    if (result.parsedFields) {
      store.setGeneratedText(result.parsedFields)
    } else {
      throw new Error('Could not parse AI response.')
    }
  } catch (err) {
    store.error.value = err instanceof Error ? err.message : 'An unknown error occurred'
    throw err
  } finally {
    store.isGenerating.value = false
  }
}
