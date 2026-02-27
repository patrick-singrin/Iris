<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import type { RenderableQuestion } from '@/data/story-questions'
import RadioTile from './RadioTile.vue'
import CheckboxTile from './CheckboxTile.vue'
import ConfirmationTile from './ConfirmationTile.vue'
import { useI18n } from '@/i18n'

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

// Verification mode
const isVerification = computed(() => props.question.origin === 'verify' && !showChangeForm.value)

const canSubmit = computed(() => {
  return selectedOptions.value.length > 0 || freeformText.value.trim().length > 0
})

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
      <button class="input-panel__collapse-btn" :aria-label="collapsed ? 'Expand' : 'Collapse'" @click="toggleCollapse">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            v-if="collapsed"
            d="M4 10l4-4 4 4"
            stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
          />
          <path
            v-else
            d="M4 6l4 4 4-4"
            stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
          />
        </svg>
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
              :placeholder="question.freeformPlaceholder || 'Type your answer...'"
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

          <!-- Freeform textarea -->
          <div v-if="question.allowFreeform" class="input-panel__textarea">
            <scale-textarea
              :value="freeformText"
              :label="question.options.length > 0 ? t('story.orTypeYourOwn') : undefined"
              :placeholder="question.freeformPlaceholder || 'Type your answer...'"
              rows="3"
              resize="vertical"
              @scaleChange="handleFreeformInput"
            />
          </div>

          <!-- Continue button -->
          <div class="input-panel__buttons">
            <scale-button :disabled="!canSubmit" @click="handleSubmit">
              {{ t('story.continue') }}
            </scale-button>
          </div>
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
</style>
