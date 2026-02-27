<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = defineProps<{
  confidence: number
}>()

const percentage = computed(() => Math.round(props.confidence * 100))
const fillWidth = computed(() => `${percentage.value}%`)

const fillColor = computed(() => {
  if (percentage.value >= 75) return 'var(--telekom-color-functional-success-standard, #00b367)'
  if (percentage.value >= 25) return 'var(--telekom-color-functional-warning-standard, #e86c00)'
  return 'var(--telekom-color-functional-danger-standard, #e82010)'
})
</script>

<template>
  <div class="confidence-bar">
    <div class="confidence-bar__track">
      <div
        class="confidence-bar__fill"
        :style="{ width: fillWidth, background: fillColor }"
      />
    </div>
    <div class="confidence-bar__info">
      <span class="confidence-bar__label">{{ t('story.confidence') }}</span>
      <span class="confidence-bar__count">
        <strong>{{ percentage }}</strong>%
      </span>
    </div>
  </div>
</template>

<style scoped>
.confidence-bar {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.confidence-bar__track {
  position: relative;
  height: 6px;
  background: var(--telekom-color-ui-faint, #dfdfe1);
  border-radius: 50px;
  overflow: hidden;
}

.confidence-bar__fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  border-radius: 50px;
  transition: width 0.3s ease;
}

.confidence-bar__info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-family: 'TeleNeo', sans-serif;
  font-weight: 400;
  color: var(--telekom-color-text-and-icon-standard, #000000);
  line-height: 19.6px;
}

.confidence-bar__info strong {
  font-weight: 700;
}
</style>
