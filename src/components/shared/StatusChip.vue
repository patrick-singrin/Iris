<script setup lang="ts">
/**
 * StatusChip — pill-shaped tag showing the active LLM model name + status.
 *
 * Placed in the header's `functions` slot. Derives the current model name
 * from settings + connections stores. Shows a green/red status indicator
 * and Scale's home-iot icon.
 */
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useConnectionsStore } from '@/stores/connectionsStore'

const { state: settings } = useSettingsStore()
const { getConnection } = useConnectionsStore()

/** Derive the active model name from current settings. */
const modelName = computed(() => {
  // Classifier-specific override
  if (settings.classifierConnectionId && settings.classifierModelId) {
    return settings.classifierModelId
  }
  // Global provider
  if (settings.provider === 'anthropic') return settings.anthropicModel || 'Claude'
  if (settings.provider === 'llmhub') return settings.llmHubModel || 'LLMHub'
  // LM Studio — no model name exposed, show "LM Studio"
  return 'LM Studio'
})

/** Connection status: ok / error / untested. */
const status = computed<'ok' | 'error' | 'untested'>(() => {
  if (settings.classifierConnectionId) {
    const conn = getConnection(settings.classifierConnectionId)
    return conn?.status ?? 'untested'
  }
  // For global providers, assume ok (no health-check available)
  return 'ok'
})
</script>

<template>
  <div class="status-chip" :class="`status-chip--${status}`">
    <span class="status-chip__indicator" />
    <scale-icon-home-iot size="16" />
    <span class="status-chip__label">{{ modelName }}</span>
  </div>
</template>

<style scoped>
.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 8px 16px 8px 8px;
  background: var(--telekom-color-background-surface, #fff);
  border: 1px solid var(--telekom-color-ui-faint, #dfdfe1);
  border-radius: 50px;
  box-sizing: border-box;
  white-space: nowrap;
  cursor: default;
}

.status-chip__indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  /* Figma: white stroke + drop shadow on indicator dot */
  border: 1.5px solid var(--telekom-color-background-surface, #fff);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  box-sizing: border-box;
}

.status-chip--ok .status-chip__indicator {
  background-color: var(--telekom-color-functional-success-standard, #00b367);
}

.status-chip--error .status-chip__indicator {
  background-color: var(--telekom-color-functional-danger-standard, #e20000);
}

.status-chip--untested .status-chip__indicator {
  background-color: var(--telekom-color-ui-faint, #dfdfe1);
}

.status-chip__label {
  font-family: var(--telekom-typography-font-family-sans-serif, 'TeleNeoWeb', sans-serif);
  font-size: var(--telekom-typography-font-size-body, 16px);
  font-weight: var(--telekom-typography-font-weight-bold, 700);
  line-height: var(--telekom-typography-line-spacing-tight, 16px);
  color: var(--telekom-color-text-and-icon-standard, #000);
}
</style>
