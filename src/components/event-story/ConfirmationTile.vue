<script setup lang="ts">
import { useI18n } from '@/i18n'

const { t } = useI18n()

defineProps<{
  /** The extracted/detected value to display (e.g. "API key auto-rotation system behavior") */
  displayValue: string
  /** Full source text from user input */
  sourceText?: string
  /** The specific evidence snippet to underline within sourceText */
  evidenceSnippet?: string
}>()
</script>

<template>
  <div class="confirmation-tile">
    <div class="confirmation-tile__bar" />
    <div class="confirmation-tile__body">
      <div class="confirmation-tile__value">{{ displayValue }}</div>
      <div v-if="sourceText" class="confirmation-tile__source">
        <span class="confirmation-tile__source-label">{{ t('story.source') }}</span>
        <span class="confirmation-tile__source-text">
          <!-- If we have an evidence snippet, underline it within the source text -->
          <template v-if="evidenceSnippet && sourceText && evidenceSnippet !== sourceText && sourceText.includes(evidenceSnippet)">
            "{{ sourceText.substring(0, sourceText.indexOf(evidenceSnippet)) }}<span class="confirmation-tile__evidence">{{ evidenceSnippet }}</span>{{ sourceText.substring(sourceText.indexOf(evidenceSnippet) + evidenceSnippet.length) }}"
          </template>
          <template v-else>
            "{{ sourceText }}"
          </template>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.confirmation-tile {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: var(--telekom-color-background-surface, #fff);
  border: 1px solid var(--telekom-color-ui-faint, #dfdfe1);
  border-radius: 8px;
}

.confirmation-tile__bar {
  width: 4px;
  flex-shrink: 0;
  background: var(--telekom-color-ui-faint, #dfdfe1);
  border-radius: 2px;
  align-self: stretch;
}

.confirmation-tile__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.confirmation-tile__value {
  font-family: 'TeleNeo', sans-serif;
  font-size: 20px;
  font-weight: 400;
  line-height: 28px;
  color: var(--telekom-color-text-and-icon-standard, #000000);
}

.confirmation-tile__source {
  display: flex;
  gap: 6px;
  align-items: baseline;
}

.confirmation-tile__source-label {
  font-family: 'TeleNeo', sans-serif;
  font-size: 12px;
  font-weight: 500;
  line-height: 16.2px;
  color: rgba(0, 0, 0, 0.65);
  flex-shrink: 0;
}

.confirmation-tile__source-text {
  font-family: 'TeleNeo', sans-serif;
  font-size: 12px;
  font-weight: 700;
  line-height: 16.2px;
  color: rgba(0, 0, 0, 0.65);
  min-width: 0;
}

.confirmation-tile__evidence {
  text-decoration: underline;
  text-underline-offset: 2px;
}
</style>
