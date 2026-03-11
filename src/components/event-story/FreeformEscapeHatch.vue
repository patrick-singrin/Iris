<script setup lang="ts">
import { ref, computed } from 'vue'
import type { RenderableQuestion } from '@/data/story-questions'
import { createProvider } from '@/services/llm/providerFactory'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = defineProps<{
  question: RenderableQuestion
  visible: boolean
}>()

const emit = defineEmits<{
  selectOption: [optionIndex: number]
  close: []
}>()

const freeformText = ref('')
const isLoading = ref(false)
const suggestion = ref<{ optionIndex: number; label: string; explanation: string; confidence: string } | null>(null)
const retryCount = ref(0)
const errorMessage = ref('')

const showNudge = computed(() => retryCount.value >= 3)

function handleFreeformInput(event: Event) {
  const target = event.target as HTMLTextAreaElement | null
  if (target) freeformText.value = target.value
}

async function handleSubmit() {
  if (!freeformText.value.trim() || isLoading.value) return
  isLoading.value = true
  errorMessage.value = ''
  suggestion.value = null

  try {
    const optionDescriptions = props.question.options
      .map((opt, idx) => `${idx + 1}. "${opt.label}"${opt.description ? ` — ${opt.description}` : ''}`)
      .join('\n')

    const prompt = `You are helping a user classify a platform event. They were asked the following question but couldn't pick an option.

Question: "${props.question.text}"
${props.question.helpText ? `Context: ${props.question.helpText}` : ''}

Available options:
${optionDescriptions}

The user described their situation as: "${freeformText.value}"

Map their description to the most appropriate option. Respond with ONLY a JSON object:
{"optionIndex": <0-based index>, "label": "<option label>", "explanation": "<1-2 sentence explanation>", "confidence": "high"|"medium"|"low"}`

    const provider = createProvider()
    const genResult = await provider.generateText({
      systemPrompt: 'You are helping a user classify a platform event. Respond with ONLY a JSON object.',
      userPrompt: prompt,
    })
    const response = genResult.rawResponse

    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (typeof parsed.optionIndex === 'number' && parsed.optionIndex >= 0 && parsed.optionIndex < props.question.options.length) {
        suggestion.value = parsed
      } else {
        errorMessage.value = t('classification.escapeHatch.noMatch')
      }
    } else {
      errorMessage.value = t('classification.escapeHatch.noMatch')
    }
  } catch {
    errorMessage.value = t('classification.escapeHatch.noMatch')
  } finally {
    isLoading.value = false
    retryCount.value++
  }
}

function acceptSuggestion() {
  if (suggestion.value) {
    emit('selectOption', suggestion.value.optionIndex)
  }
}

function tryAgain() {
  freeformText.value = ''
  suggestion.value = null
  errorMessage.value = ''
}
</script>

<template>
  <div v-if="visible" class="escape-hatch">
    <!-- Freeform input -->
    <div v-if="!suggestion" class="escape-hatch__input">
      <scale-textarea
        :value="freeformText"
        :placeholder="t('story.typeYourAnswer')"
        rows="3"
        resize="vertical"
        @scaleChange="handleFreeformInput"
      />
      <div class="escape-hatch__actions">
        <scale-button
          size="small"
          :disabled="!freeformText.trim() || isLoading"
          @click="handleSubmit"
        >
          {{ isLoading ? '...' : t('story.continue') }}
        </scale-button>
      </div>
    </div>

    <!-- Suggestion -->
    <div v-if="suggestion" class="escape-hatch__suggestion">
      <div class="escape-hatch__suggestion-label">
        <strong>{{ suggestion.label }}</strong>
        <span class="escape-hatch__confidence" :class="`escape-hatch__confidence--${suggestion.confidence}`">
          {{ suggestion.confidence }}
        </span>
      </div>
      <p class="escape-hatch__explanation">{{ suggestion.explanation }}</p>
      <div class="escape-hatch__actions">
        <scale-button size="small" @click="acceptSuggestion">
          {{ t('classification.escapeHatch.useThis') }}
        </scale-button>
        <scale-button size="small" variant="secondary" @click="tryAgain">
          {{ t('classification.escapeHatch.tryAgain') }}
        </scale-button>
      </div>
    </div>

    <!-- Error -->
    <p v-if="errorMessage" class="escape-hatch__error">{{ errorMessage }}</p>

    <!-- Nudge after 3 retries -->
    <p v-if="showNudge" class="escape-hatch__nudge">{{ t('classification.escapeHatch.nudge') }}</p>
  </div>
</template>

<style scoped>
.escape-hatch {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background: var(--telekom-color-background-canvas-subtle, #fbfbfb);
  border-radius: 8px;
  border: 1px solid var(--telekom-color-ui-faint, #dfdfe1);
}

.escape-hatch__input {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.escape-hatch__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.escape-hatch__suggestion {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.escape-hatch__suggestion-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
}

.escape-hatch__confidence {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.escape-hatch__confidence--high {
  background: var(--telekom-color-functional-success-subtle);
  color: var(--telekom-color-text-and-icon-on-subtle-success);
}

.escape-hatch__confidence--medium {
  background: var(--telekom-color-functional-warning-subtle);
  color: var(--telekom-color-text-and-icon-on-subtle-warning);
}

.escape-hatch__confidence--low {
  background: var(--telekom-color-functional-danger-subtle);
  color: var(--telekom-color-text-and-icon-on-subtle-danger);
}

.escape-hatch__explanation {
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
  color: var(--telekom-color-text-and-icon-additional, rgba(0, 0, 0, 0.65));
  margin: 0;
}

.escape-hatch__error {
  font-family: 'TeleNeo', sans-serif;
  font-size: 13px;
  color: var(--telekom-color-functional-danger-standard, #e82010);
  margin: 0;
}

.escape-hatch__nudge {
  font-family: 'TeleNeo', sans-serif;
  font-size: 13px;
  color: var(--telekom-color-text-and-icon-additional, rgba(0, 0, 0, 0.65));
  font-style: italic;
  margin: 0;
}
</style>
