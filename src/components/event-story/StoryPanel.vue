<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import ClassificationTile from './ClassificationTile.vue'
import ReasoningTile from './ReasoningTile.vue'
import ProgressBar from './ProgressBar.vue'
import { useEventStoryStore } from '@/stores/eventStoryStore'
import { useProductContextStore } from '@/stores/productContextStore'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const {
  storyText,
  checklist,
  classification,
  checklistProgress,
  showWhyExplainer,
  applyTextEdit,
  toggleWhyExplainer,
  phase,
} = useEventStoryStore()

const isReadOnly = computed(() => phase.value === 'text-generation')

const { state: pcState } = useProductContextStore()
const hasProductContent = computed(() => pcState.localContent.trim().length > 0)

function handleProductContextToggle(e: Event) {
  const customEvent = e as CustomEvent
  pcState.enabled = customEvent.detail?.value ?? false
}

const infoIconRef = ref<HTMLElement | null>(null)
const tooltipStyle = ref({ top: '0px', left: '0px' })
const tooltipVisible = ref(false)

function showTooltip() {
  if (!infoIconRef.value) return
  const rect = infoIconRef.value.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom
  const showAbove = spaceBelow < 120
  tooltipStyle.value = showAbove
    ? { top: 'auto', bottom: `${window.innerHeight - rect.top + 8}px`, left: `${rect.right - 268}px` }
    : { top: `${rect.bottom + 8}px`, bottom: 'auto', left: `${rect.right - 268}px` }
  tooltipVisible.value = true
}

function hideTooltip() {
  tooltipVisible.value = false
}

const textareaRef = ref<HTMLElement | null>(null)
const draftText = ref(storyText.value)
// Track whether the user has manually typed in the textarea.
// Prevents programmatic storyText updates from being blocked by the isDirty guard.
let userHasEdited = false

const isDirty = computed(() => draftText.value !== storyText.value)

// Guard: Stencil's async re-render after a property change can cause the internal
// <textarea> to steal focus. Instead of a boolean flag + setTimeout hack, we detect
// whether focus was already on the textarea before the update and, if not, blur any
// stolen focus after Vue and Stencil have settled (nextTick + requestAnimationFrame).
watch(storyText, async (newVal) => {
  if (!userHasEdited || newVal === '') {
    const textareaHadFocus = document.activeElement === textareaRef.value
    draftText.value = newVal
    if (!textareaHadFocus) {
      await nextTick()
      requestAnimationFrame(() => {
        if (document.activeElement === textareaRef.value) {
          ;(document.activeElement as HTMLElement).blur()
        }
      })
    }
  }
})

function handleStoryInput(event: Event) {
  const target = event.target as HTMLTextAreaElement | null
  if (target) {
    draftText.value = target.value
    userHasEdited = true
  }
}

function handleCancel() {
  draftText.value = storyText.value
  userHasEdited = false
}

function handleApply() {
  applyTextEdit(draftText.value)
  userHasEdited = false
}
</script>

<template>
  <div class="story-panel">
    <div class="story-panel__card">
      <!-- Section 1: Event Narrative -->
      <div class="story-panel__section">
        <h3 class="story-panel__title">{{ t('story.narrativeTitle') }}</h3>
        <p class="story-panel__subtitle">
          {{ t('story.narrativeSubtitle') }}
        </p>

        <scale-textarea
          ref="textareaRef"
          :value="draftText"
          :label="t('story.narrativeLabel')"
          :placeholder="t('story.narrativePlaceholder')"
          rows="10"
          resize="vertical"
          :readonly="isReadOnly"
          @scaleChange="handleStoryInput"
        />

        <div v-if="isDirty && !isReadOnly" class="story-panel__actions">
          <scale-button variant="secondary" size="small" @click="handleCancel">{{ t('story.revertChanges') }}</scale-button>
          <scale-button size="small" @click="handleApply">{{ t('story.applyChanges') }}</scale-button>
        </div>

        <ProgressBar
          :verified="checklistProgress.verified"
          :unverified="checklistProgress.unverified"
          :total="checklist.length"
        />
      </div>

      <!-- Section 2: Classification Tile -->
      <ClassificationTile
        :classification="classification"
        :checklist="checklist"
      />

      <!-- Section 3: Product Context + Reasoning -->
      <div class="story-panel__bottom">
        <div class="product-context-row">
          <scale-switch
            :checked="pcState.enabled"
            :disabled="!hasProductContent"
            label="Product Context"
            size="small"
            @scaleChange="handleProductContextToggle"
          />
          <span
            ref="infoIconRef"
            class="product-context-info"
            :aria-label="t('productContext.tooltip')"
            @mouseenter="showTooltip"
            @mouseleave="hideTooltip"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
              <path d="M8 7v4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <circle cx="8" cy="4.75" r="0.75" fill="currentColor"/>
            </svg>
          </span>
        </div>
        <ReasoningTile
          :checklist="checklist"
          :expanded="showWhyExplainer"
          @toggle="toggleWhyExplainer"
        />
      </div>
    </div>
  </div>

  <Teleport to="body">
    <div
      v-if="tooltipVisible"
      class="product-context-tooltip"
      :style="tooltipStyle"
    >
      {{ t('productContext.tooltip') }}
    </div>
  </Teleport>
</template>

<style scoped>
.story-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.story-panel__card {
  background: var(--telekom-color-background-surface, #fff);
  border-radius: 8px;
  padding: 24px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 40px;
  min-height: 0;
  overflow-y: auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.story-panel__card > * {
  flex-shrink: 0;
}

.story-panel__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.story-panel__title {
  font-family: 'TeleNeo', sans-serif;
  font-size: 20px;
  font-weight: 800;
  color: var(--telekom-color-text-and-icon-standard, #000000);
  line-height: 28px;
  margin: 0;
}

.story-panel__subtitle {
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.65);
  line-height: 19.6px;
  margin: 0 0 8px;
}

.story-panel__actions {
  display: flex;
  gap: 16px;
}

.story-panel__actions scale-button {
  flex: 1;
}

.story-panel__actions scale-button::part(base) {
  width: 100%;
}

.story-panel__bottom {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.product-context-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.product-context-info {
  display: inline-flex;
  align-items: center;
  color: var(--telekom-color-text-and-icon-additional, rgba(0, 0, 0, 0.55));
  cursor: help;
}

.product-context-info:hover {
  color: var(--telekom-color-text-and-icon-standard, #000);
}
</style>

<style>
.product-context-tooltip {
  position: fixed;
  width: 260px;
  padding: 10px 12px;
  background: #1b1b1b;
  color: #fff;
  font-family: 'TeleNeo', sans-serif;
  font-size: 13px;
  line-height: 1.45;
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  z-index: 9999;
  pointer-events: none;
}
</style>
