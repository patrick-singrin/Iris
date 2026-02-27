<script setup lang="ts">
import { computed } from 'vue'
import type { StoryClassification, StoryChecklistItem } from '@/data/story-questions'
import ConfidenceBar from './ConfidenceBar.vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = defineProps<{
  classification: StoryClassification | null
  checklist: StoryChecklistItem[]
}>()

const SEVERITY_STYLES: Record<string, { bg: string; text: string }> = {
  CRITICAL: { bg: '#fad2cf', text: '#c30a03' },
  HIGH:     { bg: '#fee2d0', text: '#b63d00' },
  MEDIUM:   { bg: '#fcefd3', text: '#ac5600' },
  LOW:      { bg: '#d2eff4', text: '#00738a' },
}

const TYPE_TAG_STYLES: Record<string, { bg: string; text: string }> = {
  Notification:      { bg: '#d8f1ec', text: '#177364' },
  'Error or issue':  { bg: '#fad2cf', text: '#c30a03' },
  'System change':   { bg: '#d2eff4', text: '#00738a' },
  'Process update':  { bg: '#fcefd3', text: '#ac5600' },
}

const DEFAULT_TAG_STYLE = { bg: '#dfdfe1', text: '#000' }

const typeTagStyle = computed(() => {
  if (!props.classification) return DEFAULT_TAG_STYLE
  return TYPE_TAG_STYLES[props.classification.type] || DEFAULT_TAG_STYLE
})

const severityTagStyle = computed(() => {
  if (!props.classification?.severity) return null
  return SEVERITY_STYLES[props.classification.severity] || null
})

/** Title-case severity: "CRITICAL" → "Critical" */
const severityLabel = computed(() => {
  const s = props.classification?.severity
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
})
</script>

<template>
  <div class="tile-classification">
    <div class="tile-classification__top">
      <!-- Header: title + type + severity -->
      <div class="tile-classification__header">
        <span class="tile-classification__title">{{ t('story.classificationTitle') }}</span>
        <div class="tile-classification__tags">
          <span
            class="tile-classification__tag"
            :style="{ background: typeTagStyle.bg, color: typeTagStyle.text }"
          >
            {{ classification?.type || t('story.notEnoughData') }}
          </span>
          <span
            v-if="severityTagStyle"
            class="tile-classification__tag"
            :style="{ background: severityTagStyle.bg, color: severityTagStyle.text }"
          >
            {{ severityLabel }}
          </span>
        </div>
      </div>

      <!-- Confidence Bar -->
      <ConfidenceBar :confidence="classification?.confidence ?? 0" />
    </div>

    <!-- Channels -->
    <div class="tile-classification__channels">
      <span class="tile-classification__channels-label">{{ t('story.channels') }}</span>
      <div v-if="classification && classification.channels.length > 0" class="tile-classification__channel-tags">
        <span
          v-for="ch in classification.channels"
          :key="ch"
          class="tile-classification__channel-tag"
        >
          {{ ch }}
        </span>
      </div>
      <div v-else class="tile-classification__channel-tags">
        <span class="tile-classification__channel-tag tile-classification__channel-tag--empty">
          {{ t('story.notEnoughData') }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tile-classification {
  background: var(--telekom-color-background-canvas-subtle, #fbfbfb);
  border: 1px solid var(--telekom-color-ui-faint, #dfdfe1);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tile-classification__top {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tile-classification__header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tile-classification__title {
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: var(--telekom-color-text-and-icon-standard, #000000);
  line-height: 19.6px;
}

.tile-classification__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tile-classification__tag {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 4px;
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.14px;
  line-height: 17.5px;
  white-space: nowrap;
}

/* Channels */
.tile-classification__channels {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tile-classification__channels-label {
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
  font-weight: 400;
  color: var(--telekom-color-text-and-icon-standard, #000000);
  line-height: 19.6px;
}

.tile-classification__channel-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tile-classification__channel-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 4px;
  border-radius: 4px;
  background: var(--telekom-color-ui-faint, #dfdfe1);
  font-family: 'TeleNeo', sans-serif;
  font-size: 12px;
  font-weight: 700;
  color: var(--telekom-color-text-and-icon-standard, #000000);
  line-height: 16px;
}

.tile-classification__channel-tag--empty {
  color: rgba(0, 0, 0, 0.65);
}
</style>
