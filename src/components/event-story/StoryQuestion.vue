<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import type { RenderableQuestion } from '@/data/story-questions'
import RadioTile from './RadioTile.vue'
import CheckboxTile from './CheckboxTile.vue'
import ConfirmationTile from './ConfirmationTile.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useI18n } from '@/i18n'
import { useSettingsStore } from '@/stores/settingsStore'
import { createProvider } from '@/services/llm/providerFactory'

const { t } = useI18n()

const props = defineProps<{
  question: RenderableQuestion
}>()

const emit = defineEmits<{
  answer: [selectedOptions: string[], freeformText: string]
}>()

const panelRef = ref<HTMLDivElement>()
const selectedOptions = ref<string[]>([])
const freeformText = ref('')
const collapsed = ref(false)
const showChangeForm = ref(false)

const { state: settingsState } = useSettingsStore()
const isTreeQuestion = computed(() => props.question.origin === 'tree')
const hasLLM = computed(() => {
  return settingsState.provider === 'lmstudio'
    || settingsState.anthropicApiKey !== ''
    || settingsState.llmHubApiKey !== ''
})
// Verification mode
const isVerification = computed(() => props.question.origin === 'verify' && !showChangeForm.value)

const canSubmit = computed(() => {
  return selectedOptions.value.length > 0 || freeformText.value.trim().length > 0
})

// ---------------------------------------------------------------------------
// LLM-assisted freeform mapping (escape hatch integrated into textarea)
// ---------------------------------------------------------------------------

interface LlmSuggestion {
  optionIndex: number
  label: string
  explanation: string
  confidence: string
}

const llmSuggestion = ref<LlmSuggestion | null>(null)
const llmLoading = ref(false)
const llmError = ref('')
const llmRetryCount = ref(0)
const showLlmNudge = computed(() => llmRetryCount.value >= 3)

/** True when the user typed freeform text on a tree question without selecting a radio option. */
const isFreeformOnlySubmit = computed(() =>
  isTreeQuestion.value && hasLLM.value
  && freeformText.value.trim().length > 0
  && selectedOptions.value.length === 0,
)

async function requestLlmMapping() {
  if (llmLoading.value) return
  llmLoading.value = true
  llmError.value = ''
  llmSuggestion.value = null

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
        llmSuggestion.value = parsed
      } else {
        llmError.value = t('classification.escapeHatch.noMatch')
      }
    } else {
      llmError.value = t('classification.escapeHatch.noMatch')
    }
  } catch {
    llmError.value = t('classification.escapeHatch.noMatch')
  } finally {
    llmLoading.value = false
    llmRetryCount.value++
  }
}

function acceptSuggestion() {
  if (!llmSuggestion.value) return
  selectSingle(String(llmSuggestion.value.optionIndex))
  llmSuggestion.value = null
  nextTick(() => handleSubmit())
}

function rejectSuggestion() {
  llmSuggestion.value = null
  freeformText.value = ''
  llmError.value = ''
}

// ---------------------------------------------------------------------------
// Confirmation actions
// ---------------------------------------------------------------------------

function confirmVerification() {
  emit('answer', ['__confirm__'], '')
}

function changeVerification() {
  // User wants to change the value — switch to the full question form with options
  showChangeForm.value = true
}

// ---------------------------------------------------------------------------
// Selection handlers
// ---------------------------------------------------------------------------

function selectSingle(value: string) {
  selectedOptions.value = [value]
}

function toggleMultiple(value: string) {
  const idx = selectedOptions.value.indexOf(value)
  if (idx >= 0) {
    selectedOptions.value.splice(idx, 1)
  } else {
    selectedOptions.value.push(value)
  }
}

function handleFreeformInput(event: Event) {
  const target = event.target as HTMLTextAreaElement | null
  if (target) freeformText.value = target.value
}

function handleSubmit() {
  if (!canSubmit.value) return
  // If user typed freeform text without selecting an option on a tree question,
  // use LLM to map their description to the best option
  if (isFreeformOnlySubmit.value) {
    requestLlmMapping()
    return
  }
  emit('answer', [...selectedOptions.value], freeformText.value.trim())
  selectedOptions.value = []
  freeformText.value = ''
}

// ---------------------------------------------------------------------------
// Hotkey support (1–4 for option selection)
// ---------------------------------------------------------------------------

function handleKeydown(event: KeyboardEvent) {
  // Ignore when typing in a textarea or input
  const tag = (event.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return

  // Number keys 1-4 for option selection
  const num = parseInt(event.key, 10)
  if (num >= 1 && num <= props.question.options.length) {
    event.preventDefault()
    const opt = props.question.options[num - 1]!
    if (props.question.inputType === 'single') {
      selectSingle(opt.value)
    } else {
      toggleMultiple(opt.value)
    }
  }

  // Enter to submit (when not in textarea)
  if (event.key === 'Enter' && !event.shiftKey && canSubmit.value) {
    event.preventDefault()
    handleSubmit()
  }
}

// Reset change form state when question changes
watch(() => props.question.id, () => {
  showChangeForm.value = false
  selectedOptions.value = []
  freeformText.value = ''
  llmSuggestion.value = null
  llmError.value = ''
  llmLoading.value = false
})

onMounted(async () => {
  // Focus the question panel so keyboard events are captured here
  await nextTick()
  panelRef.value?.focus()
})

// Compute display value for confirmation tile
const confirmDisplayValue = computed(() => {
  if (!isVerification.value) return ''
  const val = props.question.verifyValue
  return typeof val === 'string' ? val : Array.isArray(val) ? val.join(', ') : ''
})

// Build the full source context for the confirmation tile
const confirmSourceText = computed(() => {
  if (!isVerification.value) return ''
  // Prefer the full source context (user's complete answer), fall back to evidence snippet
  return props.question.verifySourceContext || props.question.verifyEvidence || ''
})

function toggleCollapse() {
  collapsed.value = !collapsed.value
}

// ---------------------------------------------------------------------------
// Smooth height transition hooks
// ---------------------------------------------------------------------------

function onEnter(el: Element, done: () => void) {
  const htmlEl = el as HTMLElement
  htmlEl.style.overflow = 'hidden'
  htmlEl.style.height = '0'
  // Force reflow
  void htmlEl.offsetHeight
  htmlEl.style.transition = 'height 0.25s ease-out'
  htmlEl.style.height = htmlEl.scrollHeight + 'px'
  const handler = () => { done(); htmlEl.removeEventListener('transitionend', handler) }
  htmlEl.addEventListener('transitionend', handler)
}

function onAfterEnter(el: Element) {
  const htmlEl = el as HTMLElement
  htmlEl.style.height = ''
  htmlEl.style.overflow = ''
  htmlEl.style.transition = ''
}

function onLeave(el: Element, done: () => void) {
  const htmlEl = el as HTMLElement
  htmlEl.style.overflow = 'hidden'
  htmlEl.style.height = htmlEl.scrollHeight + 'px'
  // Force reflow
  void htmlEl.offsetHeight
  htmlEl.style.transition = 'height 0.25s ease-in'
  htmlEl.style.height = '0'
  const handler = () => { done(); htmlEl.removeEventListener('transitionend', handler) }
  htmlEl.addEventListener('transitionend', handler)
}

function onAfterLeave(el: Element) {
  const htmlEl = el as HTMLElement
  htmlEl.style.height = ''
  htmlEl.style.overflow = ''
  htmlEl.style.transition = ''
}
</script>

<template>
  <div ref="panelRef" class="input-panel" tabindex="-1" @keydown="handleKeydown">
    <!-- Question header (always visible) -->
    <div class="input-panel__header">
      <div class="input-panel__header-text">
        <h2 class="input-panel__question">{{ question.text }}</h2>
        <p v-if="question.helpText" class="input-panel__help">{{ question.helpText }}</p>
      </div>
      <button
        class="input-panel__collapse-btn"
        :aria-label="collapsed ? t('a11y.expand') : t('a11y.collapse')"
        :aria-expanded="!collapsed"
        @click="toggleCollapse"
      >
        <AppIcon :name="collapsed ? 'chevron-up' : 'chevron-down'" :stroke-width="1.5" />
      </button>
    </div>

    <!-- Body (animated collapse/expand) -->
    <Transition :css="false" @enter="onEnter" @after-enter="onAfterEnter" @leave="onLeave" @after-leave="onAfterLeave">
      <div v-if="!collapsed" class="input-panel__body">
        <!-- CONFIRMATION variant -->
        <template v-if="isVerification">
          <ConfirmationTile
            :display-value="confirmDisplayValue"
            :source-text="confirmSourceText"
            :evidence-snippet="question.verifyEvidence"
          />

          <!-- Freeform textarea for typing a custom value -->
          <div class="input-panel__textarea">
            <scale-textarea
              :value="freeformText"
              :label="t('story.orTypeYourOwn')"
              :placeholder="question.freeformPlaceholder || t('story.typeYourAnswer')"
              rows="3"
              resize="vertical"
              @scaleChange="handleFreeformInput"
            />
          </div>

          <div class="input-panel__buttons">
            <scale-button variant="secondary" @click="changeVerification">
              {{ t('story.change') }}
            </scale-button>
            <scale-button @click="freeformText.trim() ? handleSubmit() : confirmVerification()">
              {{ t('story.confirm') }}
            </scale-button>
          </div>
        </template>

        <!-- RADIO / CHECK / FREEFORM variant -->
        <template v-else>
          <!-- Options -->
          <div v-if="question.options.length > 0" class="input-panel__options" :role="question.inputType === 'single' ? 'radiogroup' : 'group'" :aria-label="question.text">
            <template v-if="question.inputType === 'single'">
              <RadioTile
                v-for="(opt, idx) in question.options"
                :key="opt.value"
                :value="opt.value"
                :label="opt.label"
                :description="opt.description"
                :hotkey-label="String(idx + 1)"
                :selected="selectedOptions.includes(opt.value)"
                :name="question.id"
                @select="selectSingle"
              />
            </template>
            <template v-else>
              <CheckboxTile
                v-for="(opt, idx) in question.options"
                :key="opt.value"
                :value="opt.value"
                :label="opt.label"
                :description="opt.description"
                :hotkey-label="String(idx + 1)"
                :selected="selectedOptions.includes(opt.value)"
                :name="question.id"
                @toggle="toggleMultiple"
              />
            </template>
          </div>

          <!-- LLM suggestion (shown after freeform submit on tree questions) -->
          <div v-if="llmSuggestion" class="input-panel__suggestion">
            <div class="input-panel__suggestion-header">
              <strong>{{ llmSuggestion.label }}</strong>
              <span class="input-panel__confidence" :class="`input-panel__confidence--${llmSuggestion.confidence}`">
                {{ llmSuggestion.confidence }}
              </span>
            </div>
            <p class="input-panel__suggestion-explanation">{{ llmSuggestion.explanation }}</p>
            <div class="input-panel__buttons">
              <scale-button size="small" variant="secondary" @click="rejectSuggestion">
                {{ t('classification.escapeHatch.tryAgain') }}
              </scale-button>
              <scale-button size="small" @click="acceptSuggestion">
                {{ t('classification.escapeHatch.useThis') }}
              </scale-button>
            </div>
          </div>

          <!-- Freeform textarea (hidden when showing suggestion) -->
          <template v-if="!llmSuggestion">
            <div v-if="question.allowFreeform" class="input-panel__textarea">
              <scale-textarea
                :value="freeformText"
                :label="question.options.length > 0 ? t('story.orTypeYourOwn') : undefined"
                :aria-label="question.options.length === 0 ? question.text : undefined"
                :placeholder="question.freeformPlaceholder || t('story.typeYourAnswer')"
                rows="3"
                resize="vertical"
                @scaleChange="handleFreeformInput"
              />
            </div>

            <!-- Error / nudge messages -->
            <p v-if="llmError" class="input-panel__error">{{ llmError }}</p>
            <p v-if="showLlmNudge" class="input-panel__nudge">{{ t('classification.escapeHatch.nudge') }}</p>

            <!-- Continue button -->
            <div class="input-panel__buttons">
              <scale-button :disabled="!canSubmit || llmLoading" @click="handleSubmit">
                {{ llmLoading ? '...' : t('story.continue') }}
              </scale-button>
            </div>
          </template>
        </template>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.input-panel {
  background: var(--telekom-color-background-surface, #fff);
  border-radius: 8px;
  padding: 24px;
  outline: none;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
  width: 100%;
  box-sizing: border-box;
}

/* Header */
.input-panel__header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.input-panel__header-text {
  flex: 1;
  min-width: 0;
}

.input-panel__question {
  font-family: 'TeleNeo', sans-serif;
  font-size: 20px;
  font-weight: 800;
  line-height: 28px;
  color: var(--telekom-color-text-and-icon-standard, #000000);
  margin: 0;
}

.input-panel__help {
  font-family: 'TeleNeo', sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 22.4px;
  color: var(--telekom-color-text-and-icon-standard, #000000);
  margin: 0;
}

.input-panel__collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  background: transparent;
  border: 1px solid rgba(0, 0, 0, 0.44);
  border-radius: 8px;
  cursor: pointer;
  color: var(--telekom-color-text-and-icon-standard, #000000);
  transition: background 0.15s;
  padding: 0;
}

.input-panel__collapse-btn:hover {
  background: rgba(0, 0, 0, 0.07);
}

/* Body — animated wrapper for collapse/expand */
.input-panel__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Options list */
.input-panel__options {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Textarea section */
.input-panel__textarea {
  /* Inherits gap from parent flex */
}

/* Buttons row — right-aligned */
.input-panel__buttons {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
}

/* LLM suggestion inline */
.input-panel__suggestion {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--telekom-color-background-canvas-subtle, #fbfbfb);
  border-radius: 8px;
  border: 1px solid var(--telekom-color-ui-faint, #dfdfe1);
}

.input-panel__suggestion-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
}

.input-panel__confidence {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.input-panel__confidence--high {
  background: var(--telekom-color-functional-success-subtle);
  color: var(--telekom-color-text-and-icon-on-subtle-success);
}

.input-panel__confidence--medium {
  background: var(--telekom-color-functional-warning-subtle);
  color: var(--telekom-color-text-and-icon-on-subtle-warning);
}

.input-panel__confidence--low {
  background: var(--telekom-color-functional-danger-subtle);
  color: var(--telekom-color-text-and-icon-on-subtle-danger);
}

.input-panel__suggestion-explanation {
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
  color: var(--telekom-color-text-and-icon-additional, rgba(0, 0, 0, 0.65));
  margin: 0;
}

.input-panel__error {
  font-family: 'TeleNeo', sans-serif;
  font-size: 13px;
  color: var(--telekom-color-functional-danger-standard, #e82010);
  margin: 0;
}

.input-panel__nudge {
  font-family: 'TeleNeo', sans-serif;
  font-size: 13px;
  color: var(--telekom-color-text-and-icon-additional, rgba(0, 0, 0, 0.65));
  font-style: italic;
  margin: 0;
}
</style>
