<script setup lang="ts">
import { computed } from 'vue'
import EscalationConfigurator from './EscalationConfigurator.vue'
import { useEventStoryStore } from '@/stores/eventStoryStore'
import { useI18n } from '@/i18n'

const { t } = useI18n()
const store = useEventStoryStore()

const hasClassification = computed(() => store.classification.value !== null)
const channelList = computed(() => store.classification.value?.channels || [])
const escalationCount = computed(() => store.escalationSteps.value.length)
</script>

<template>
  <div class="configure-step">
    <div class="configure-step__header">
      <h2 class="configure-step__title">{{ t('story.configureTitle') }}</h2>
      <p class="configure-step__subtitle">{{ t('story.configureSubtitle') }}</p>
    </div>

    <!-- Pre-flight summary -->
    <div v-if="hasClassification" class="configure-step__summary">
      <h3 class="configure-step__section-title">{{ t('story.classificationTitle') }}</h3>
      <div class="configure-step__tags">
        <scale-tag size="small">{{ store.classification.value!.type }}</scale-tag>
        <scale-tag v-if="store.classification.value!.severity" size="small" color="cyan">
          {{ store.classification.value!.severity }}
        </scale-tag>
      </div>

      <div class="configure-step__channels">
        <span class="configure-step__label">{{ t('story.channels') }}:</span>
        <scale-tag v-for="ch in channelList" :key="ch" size="small">{{ ch }}</scale-tag>
      </div>

      <div v-if="escalationCount > 0" class="configure-step__escalation-info">
        <span class="configure-step__label">{{ t('story.escalationTitle') }}:</span>
        <scale-tag size="small" color="cyan">{{ escalationCount }} {{ t('story.escalationStepsLabel') }}</scale-tag>
      </div>
    </div>

    <!-- Escalation configurator -->
    <EscalationConfigurator />

    <!-- Generate button -->
    <div class="configure-step__actions">
      <scale-button
        @click="store.backToStep('analyze')"
        variant="secondary"
      >
        {{ t('story.backToAnalysis') }}
      </scale-button>
      <scale-button
        :disabled="!hasClassification || store.isGeneratingText.value"
        @click="store.proceedToGenerate()"
      >
        {{ store.isGeneratingText.value ? t('story.generating') : t('story.generateCopy') }}
      </scale-button>
    </div>

    <!-- Error -->
    <div v-if="store.generationError.value" class="configure-step__error">
      <p>{{ store.generationError.value }}</p>
      <scale-button size="small" variant="secondary" @click="store.generationError.value = null">
        {{ t('story.dismiss') }}
      </scale-button>
    </div>
  </div>
</template>

<style scoped>
.configure-step {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  background: var(--telekom-color-background-surface, #fff);
  border-radius: 12px;
  border: 1px solid var(--telekom-color-ui-faint, #dfdfe1);
}

.configure-step__header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.configure-step__title {
  font-family: 'TeleNeo', sans-serif;
  font-size: 20px;
  font-weight: 800;
  color: var(--telekom-color-text-and-icon-standard, #000);
  margin: 0;
}

.configure-step__subtitle {
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6f);
  margin: 0;
}

.configure-step__summary {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--telekom-color-background-surface-subtle, #efeff0);
  border-radius: 8px;
}

.configure-step__section-title {
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: var(--telekom-color-text-and-icon-standard, #000);
  margin: 0;
}

.configure-step__tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.configure-step__channels,
.configure-step__escalation-info {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.configure-step__label {
  font-family: 'TeleNeo', sans-serif;
  font-size: 13px;
  font-weight: 655;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6f);
}

.configure-step__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.configure-step__error {
  padding: 12px 16px;
  background: rgba(232, 32, 16, 0.06);
  border: 1px solid var(--telekom-color-functional-danger-standard, #e82010);
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.configure-step__error p {
  margin: 0;
  flex: 1;
  font-family: 'TeleNeo', sans-serif;
  font-size: 13px;
  color: var(--telekom-color-functional-danger-standard, #e82010);
}
</style>
