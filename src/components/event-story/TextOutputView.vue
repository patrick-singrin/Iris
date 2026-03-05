<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import ChannelPanel from './ChannelPanel.vue'
import EscalationConfigurator from './EscalationConfigurator.vue'
import { useEventStoryStore } from '@/stores/eventStoryStore'
import { useTextGenerationStore } from '@/stores/textGenerationStore'
import { useAppStore } from '@/stores/appStore'
import { getNotificationComponents, getComponentsForType, resolveTypeKey } from '@/services/contentTemplates'
import type { ComponentTemplate } from '@/types/contentTemplate'
import { useI18n } from '@/i18n'

const { t, locale } = useI18n()
const store = useEventStoryStore()
const textStore = useTextGenerationStore()
const { setView } = useAppStore()

const showSavedNotification = ref(false)

function viewSavedEvent() {
  setView('documentation')
  showSavedNotification.value = false
}

function dismissSavedNotification() {
  showSavedNotification.value = false
}

const activeLang = ref<'de' | 'en'>(
  (locale.value.toLowerCase() as 'de' | 'en') || 'de'
)
const activeChannelIndex = ref(0)
const activeStepIndex = ref(0)

// Resolve components from classification
const components = computed<ComponentTemplate[]>(() => {
  const cls = store.classification.value
  if (!cls) return []
  if (cls.type === 'Notification') {
    return getNotificationComponents(cls.severity || '')
  }
  const typeKey = resolveTypeKey(cls.type)
  return typeKey ? getComponentsForType(typeKey) : []
})

const activeComponent = computed(() => {
  return components.value[activeChannelIndex.value] || null
})

const hasText = computed(() => {
  return Object.keys(textStore.generatedText.data).length > 0
})

const escalationSteps = computed(() => store.escalationSteps.value)
const hasEscalation = computed(() => escalationSteps.value.length > 0)

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

/** Approval count for a channel component across all steps: "X/Y" */
function getApprovalCount(comp: ComponentTemplate): string {
  const compId = comp.name.toLowerCase().replace(/\s+/g, '_')
  if (hasEscalation.value) {
    const total = escalationSteps.value.length
    const approved = escalationSteps.value.filter(step =>
      textStore.isApproved(`${step.id}_${compId}`),
    ).length
    return `${approved}/${total}`
  }
  return textStore.isApproved(compId) ? '1/1' : '0/1'
}

// Approval composite key — component + step
const approvalKey = computed(() => {
  const compId = activeComponent.value?.name.toLowerCase().replace(/\s+/g, '_') || ''
  if (activeStepId.value) return `${activeStepId.value}_${compId}`
  return compId
})

const isCurrentApproved = computed(() => textStore.isApproved(approvalKey.value))

function handleApprove() {
  textStore.approveText(approvalKey.value)
}

const isRegenerating = ref(false)

async function regenerateTab() {
  isRegenerating.value = true
  const compId = activeComponent.value?.name.toLowerCase().replace(/\s+/g, '_') || ''
  try {
    await store.regenerateForComponent(compId)
  } finally {
    isRegenerating.value = false
  }
}

// Show notification when event is auto-saved after generation
watch(() => store.savedEventId?.value, (newId) => {
  if (newId) {
    showSavedNotification.value = true
    setTimeout(() => { showSavedNotification.value = false }, 8000)
  }
})
</script>

<template>
  <div class="text-output">
    <!-- Title -->
    <h3 class="text-output__title">{{ t('textGen.title') }}</h3>

    <!-- Escalation section (collapsible) -->
    <EscalationConfigurator />

    <!-- Save notification -->
    <div v-if="showSavedNotification" class="text-output__saved">
      <span class="text-output__saved-text">{{ t('story.eventSaved') }}</span>
      <button class="text-output__saved-link" @click="viewSavedEvent">
        {{ t('story.eventSavedLink') }} &rarr;
      </button>
      <button class="text-output__saved-close" @click="dismissSavedNotification" :aria-label="t('story.dismiss')">
        &times;
      </button>
    </div>

    <!-- Channel tabs (Scale Tab Navigation) -->
    <scale-tab-nav v-if="components.length > 1" size="small" class="text-output__tabs">
      <scale-tab-header
        v-for="(comp, idx) in components"
        :key="comp.name"
        slot="tab"
        @click="activeChannelIndex = idx"
      >
        {{ comp.name }} ({{ getApprovalCount(comp) }})
      </scale-tab-header>
      <scale-tab-panel
        v-for="comp in components"
        :key="'panel-' + comp.name"
        slot="panel"
      />
    </scale-tab-nav>

    <!-- Channel content wrapper -->
    <div class="text-output__channel-content">
      <!-- Sub-header: step tabs (left) + language toggle (right) -->
      <div class="text-output__sub-header">
        <!-- Escalation step sub-tabs -->
        <scale-segmented-button v-if="hasEscalation" size="small">
          <scale-segment
            v-for="(step, idx) in escalationSteps"
            :key="step.id"
            :segment-id="step.id"
            :selected="idx === activeStepIndex"
            @click="activeStepIndex = idx"
          >
            {{ step.label || `Step ${idx + 1}` }}
          </scale-segment>
        </scale-segmented-button>
        <div v-else class="text-output__spacer" />

        <!-- Language toggle — defaults to main nav language -->
        <scale-segmented-button size="small">
          <scale-segment segment-id="en" :selected="activeLang === 'en'" @click="activeLang = 'en'">
            {{ t('textGen.english') }}
          </scale-segment>
          <scale-segment segment-id="de" :selected="activeLang === 'de'" @click="activeLang = 'de'">
            {{ t('textGen.deutsch') }}
          </scale-segment>
        </scale-segmented-button>
      </div>

      <!-- Content area -->
      <div class="text-output__content">
        <!-- Loading -->
        <div v-if="store.isGeneratingText.value" class="text-output__loading">
          <scale-loading-spinner></scale-loading-spinner>
          <p>{{ t('story.generating') }}</p>
        </div>

        <!-- Error -->
        <div v-else-if="store.generationError.value" class="text-output__error">
          <p>{{ store.generationError.value }}</p>
          <scale-button size="small" variant="secondary" @click="store.generationError.value = null">
            {{ t('story.dismiss') }}
          </scale-button>
        </div>

        <!-- Empty -->
        <div v-else-if="!hasText" class="text-output__empty">
          <p>{{ t('story.noGeneratedText') }}</p>
        </div>

        <!-- Generated text -->
        <template v-else-if="activeComponent">
          <div class="text-output__fields-row">
            <!-- Fields column (2/3) -->
            <div class="text-output__fields-col">
              <ChannelPanel
                :key="`${activeComponent.name}-${activeLang}-${activeStepId}`"
                :component="activeComponent"
                :lang="activeLang"
                :active-step-id="activeStepId"
              />
            </div>

            <!-- Approval sidebar (1/3) -->
            <div class="text-output__approval-col">
              <scale-tag
                :color="isCurrentApproved ? 'green' : 'red'"
                size="small"
              >
                {{ isCurrentApproved ? t('story.approved') : t('story.notApproved') }}
              </scale-tag>

              <div class="text-output__approval-actions">
                <scale-button
                  v-if="!isCurrentApproved"
                  variant="primary"
                  size="small"
                  @click="handleApprove"
                >
                  <scale-icon-action-checkmark></scale-icon-action-checkmark>
                  {{ t('story.approveText') }}
                </scale-button>

                <scale-button
                  variant="secondary"
                  size="small"
                  :disabled="isRegenerating || store.isGeneratingText.value"
                  @click="regenerateTab"
                >
                  <scale-icon-action-refresh></scale-icon-action-refresh>
                  {{ isRegenerating ? t('story.generating') : t('story.regenerateText') }}
                </scale-button>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.text-output {
  display: flex;
  flex-direction: column;
  background: var(--telekom-color-background-surface, #fff);
  border-radius: 8px;
  padding: 24px;
}

.text-output__title {
  font-family: 'TeleNeo', sans-serif;
  font-size: 20px;
  font-weight: 800;
  color: var(--telekom-color-text-and-icon-standard, #000);
  margin: 0 0 24px 0;
}

/* Save notification */
.text-output__saved {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--telekom-color-functional-success-subtle, #e6f9ed);
  border: 1px solid var(--telekom-color-functional-success-standard, #2fa858);
  border-radius: 8px;
  margin-bottom: 16px;
}

.text-output__saved-text {
  font-family: 'TeleNeo', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--telekom-color-functional-success-standard, #1a7a3a);
}

.text-output__saved-link {
  background: none;
  border: none;
  padding: 0;
  font-family: 'TeleNeo', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--telekom-color-primary-standard, #e20074);
  cursor: pointer;
  text-decoration: underline;
}

.text-output__saved-close {
  margin-left: auto;
  background: none;
  border: none;
  padding: 0 4px;
  font-size: 18px;
  line-height: 1;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6f);
  cursor: pointer;
}

/* Scale Tab Nav — break out of parent padding for edge-to-edge borders */
.text-output__tabs {
  margin-top: 24px;
  margin-left: -24px;
  margin-right: -24px;
  padding-left: 24px;
  padding-right: 24px;
}

/* Channel content wrapper — edge-to-edge borders */
.text-output__channel-content {
  border-top: 1px solid var(--telekom-color-ui-faint, #dfdfe1);
  margin-left: -24px;
  margin-right: -24px;
}

/* Sub-header: step tabs + language toggle */
.text-output__sub-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: var(--telekom-color-background-canvas-subtle, #fbfbfb);
  border-bottom: 1px solid var(--telekom-color-ui-faint, #dfdfe1);
  gap: 16px;
}

.text-output__spacer {
  flex: 1;
}

/* Content area */
.text-output__content {
  padding: 24px;
  background: var(--telekom-color-background-surface, #fff);
}

.text-output__fields-row {
  display: flex;
  gap: 24px;
}

.text-output__fields-col {
  flex: 2;
  min-width: 0;
}

.text-output__approval-col {
  flex: 0 0 auto;
  width: 245px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 16px;
  background: #fbfbfb;
  border: 1px solid var(--telekom-color-ui-faint, #dfdfe1);
  border-radius: 4px;
  box-sizing: border-box;
}

.text-output__approval-actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.text-output__approval-actions scale-button {
  display: block;
  --width: 100%;
}

/* Loading / Error / Empty */
.text-output__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 0;
}

.text-output__loading p {
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6f);
  margin: 0;
}

.text-output__error {
  padding: 12px 16px;
  background: rgba(232, 32, 16, 0.06);
  border: 1px solid var(--telekom-color-functional-danger-standard, #e82010);
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.text-output__error p {
  margin: 0;
  flex: 1;
  font-family: 'TeleNeo', sans-serif;
  font-size: 13px;
  color: var(--telekom-color-functional-danger-standard, #e82010);
}

.text-output__empty {
  padding: 40px 0;
  text-align: center;
}

.text-output__empty p {
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6f);
  margin: 0;
}
</style>

<!-- Unscoped: hide empty tab panels used for scale-tab-nav pairing -->
<style>
.text-output scale-tab-panel {
  display: none !important;
  height: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  overflow: hidden !important;
}
</style>
