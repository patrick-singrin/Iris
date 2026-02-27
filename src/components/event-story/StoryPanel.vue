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
} = useEventStoryStore()

const { state: pcState } = useProductContextStore()
const hasProductContent = computed(() => pcState.localContent.trim().length > 0)

function handleProductContextToggle(e: Event) {
  const customEvent = e as CustomEvent
  pcState.enabled = customEvent.detail?.value ?? false
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
          @scaleChange="handleStoryInput"
        />

        <div v-if="isDirty" class="story-panel__actions">
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
        <scale-switch
          :checked="pcState.enabled"
          :disabled="!hasProductContent"
          label="Product Context"
          size="small"
          @scaleChange="handleProductContextToggle"
        />
        <ReasoningTile
          :checklist="checklist"
          :expanded="showWhyExplainer"
          @toggle="toggleWhyExplainer"
        />
      </div>
    </div>
  </div>
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
</style>
