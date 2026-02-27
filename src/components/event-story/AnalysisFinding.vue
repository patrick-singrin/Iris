<script setup lang="ts">
import type { AnalysisFinding } from '@/stores/eventStoryStore'

defineProps<{
  finding: AnalysisFinding
}>()

const icons: Record<string, string> = {
  coherence: '⚖️',
  completeness: '📋',
  consistency: '🔗',
  escalation: '📅',
  error: '⚠️',
}

function getIcon(category: string): string {
  return icons[category] || '💡'
}
</script>

<template>
  <div :class="['finding', `finding--${finding.severity}`]">
    <div class="finding__header">
      <span class="finding__icon">{{ getIcon(finding.category) }}</span>
      <span class="finding__severity-badge">{{ finding.severity }}</span>
    </div>
    <p class="finding__message">{{ finding.message }}</p>
    <p v-if="finding.suggestion" class="finding__suggestion">{{ finding.suggestion }}</p>
  </div>
</template>

<style scoped>
.finding {
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid var(--telekom-color-ui-faint, #dfdfe1);
  background: var(--telekom-color-background-surface, #fff);
}

.finding--warning {
  border-left: 3px solid var(--telekom-color-functional-warning-standard, #ffc832);
}

.finding--suggestion {
  border-left: 3px solid var(--telekom-color-functional-informational-standard, #1b7bc1);
}

.finding__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.finding__icon {
  font-size: 16px;
}

.finding__severity-badge {
  font-family: 'TeleNeo', sans-serif;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--telekom-color-background-surface-subtle, #efeff0);
  color: var(--telekom-color-text-and-icon-additional, #6c6c6f);
}

.finding__message {
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: var(--telekom-color-text-and-icon-standard, #000);
  margin: 0 0 4px;
}

.finding__suggestion {
  font-family: 'TeleNeo', sans-serif;
  font-size: 13px;
  line-height: 1.4;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6f);
  margin: 0;
  font-style: italic;
}
</style>
