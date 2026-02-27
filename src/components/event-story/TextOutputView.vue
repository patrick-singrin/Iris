<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import LanguageToggle from './LanguageToggle.vue'
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
    <!-- Header bar -->
    <div class="text-output__header">
      <LanguageToggle v-model="activeLang" />
      <div class="text-output__actions">
        <scale-button
          variant="secondary"
          size="small"
          @click="store.backToStep('configure')"
        >
          {{ t('story.backToConfigure') }}
        </scale-button>
        <scale-button
          size="small"
          :disabled="store.isGeneratingText.value"
          @click="store.proceedToGenerate({ fromOutput: true })"
        >
          {{ store.isGeneratingText.value ? t('story.generating') : t('story.regenerateAll') }}
        </scale-button>
      </div>
    </div>

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

    <!-- Collapsible escalation configurator -->
    <details class="text-output__escalation">
      <summary class="text-output__escalation-toggle">
        {{ t('story.escalationTitle') }}
      </summary>
      <div class="text-output__escalation-body">
        <EscalationConfigurator />
      </div>
    </details>

    <!-- Channel tabs -->
    <div v-if="components.length > 1" class="text-output__channel-tabs" role="tablist">
      <button
        v-for="(comp, index) in components"
        :key="comp.name"
        class="text-output__channel-tab"
        :class="{ 'text-output__channel-tab--active': activeChannelIndex === index }"
        role="tab"
        :aria-selected="activeChannelIndex === index"
        @click="activeChannelIndex = index"
      >
        {{ comp.name }}
      </button>
    </div>

    <!-- Single channel (no tabs needed) -->
    <div v-else-if="components.length === 1" class="text-output__channel-single">
      <h3 class="text-output__channel-name">{{ components[0]!.name }}</h3>
    </div>

    <!-- Channel content -->
    <div class="text-output__content">
      <div v-if="store.isGeneratingText.value" class="text-output__loading">
        <div class="text-output__spinner"></div>
        <p>{{ t('story.generating') }}</p>
      </div>

      <div v-else-if="store.generationError.value" class="text-output__error">
        <p>{{ store.generationError.value }}</p>
        <scale-button size="small" variant="secondary" @click="store.generationError.value = null">
          {{ t('story.dismiss') }}
        </scale-button>
      </div>

      <div v-else-if="!hasText" class="text-output__empty">
        <p>{{ t('story.noGeneratedText') }}</p>
      </div>

      <ChannelPanel
        v-else-if="activeComponent"
        :key="`${activeComponent.name}-${activeLang}`"
        :component="activeComponent"
        :lang="activeLang"
      />
    </div>
  </div>
</template>

<style scoped>
.text-output {
  display: flex;
  flex-direction: column;
  gap: 0;
  flex: 1;
  min-height: 0;
  background: var(--telekom-color-background-surface, #fff);
  border-radius: 12px;
  border: 1px solid var(--telekom-color-ui-faint, #dfdfe1);
  overflow: hidden;
}

.text-output__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--telekom-color-ui-faint, #dfdfe1);
}

.text-output__actions {
  display: flex;
  gap: 8px;
}

.text-output__escalation {
  border-bottom: 1px solid var(--telekom-color-ui-faint, #dfdfe1);
}

.text-output__escalation-toggle {
  padding: 12px 20px;
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6f);
  cursor: pointer;
  list-style: none;
  display: flex;
  align-items: center;
  gap: 6px;
}

.text-output__escalation-toggle::before {
  content: '\25B6';
  font-size: 10px;
  transition: transform 0.15s;
}

.text-output__escalation[open] > .text-output__escalation-toggle::before {
  transform: rotate(90deg);
}

.text-output__escalation-toggle::-webkit-details-marker {
  display: none;
}

.text-output__escalation-body {
  padding: 0 20px 16px;
}

.text-output__channel-tabs {
  display: flex;
  border-bottom: 1px solid var(--telekom-color-ui-faint, #dfdfe1);
  padding: 0 20px;
}

.text-output__channel-tab {
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 12px 16px;
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6f);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  margin-bottom: -1px;
}

.text-output__channel-tab:hover {
  color: var(--telekom-color-text-and-icon-standard, #000);
}

.text-output__channel-tab--active {
  color: var(--telekom-color-primary-standard, #e20074);
  border-bottom-color: var(--telekom-color-primary-standard, #e20074);
}

.text-output__channel-single {
  padding: 12px 20px;
  border-bottom: 1px solid var(--telekom-color-ui-faint, #dfdfe1);
}

.text-output__channel-name {
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: var(--telekom-color-text-and-icon-standard, #000);
  margin: 0;
}

.text-output__content {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  scrollbar-width: thin;
}

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

.text-output__spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--telekom-color-ui-faint, #dfdfe1);
  border-top-color: var(--telekom-color-primary-standard, #e20074);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
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

.text-output__saved {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: var(--telekom-color-functional-success-subtle, #e6f9ed);
  border-bottom: 1px solid var(--telekom-color-functional-success-standard, #2fa858);
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

.text-output__saved-link:hover {
  color: var(--telekom-color-primary-hovered, #b3005c);
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

.text-output__saved-close:hover {
  color: var(--telekom-color-text-and-icon-standard, #000);
}
</style>
