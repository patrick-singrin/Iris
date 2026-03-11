<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = defineProps<{
  current: number
  total: number
  complete: boolean
}>()

const percentage = computed(() => {
  if (props.complete) return 100
  if (props.total === 0) return 0
  return Math.round((props.current / props.total) * 100)
})

const fillWidth = computed(() => `${percentage.value}%`)

const infoText = computed(() => {
  if (props.complete) return t('classification.progress.complete')
  return t('classification.progress.step')
    .replace('{current}', String(props.current))
    .replace('{total}', String(props.total))
})
</script>

<template>
  <div class="classification-progress">
    <div class="classification-progress__track">
      <div
        class="classification-progress__fill"
        :style="{ width: fillWidth }"
      />
    </div>
    <div class="classification-progress__info">
      <span v-if="complete" class="classification-progress__check">&#10003;</span>
      <span>{{ infoText }}</span>
    </div>
  </div>
</template>

<style scoped>
.classification-progress {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.classification-progress__track {
  position: relative;
  height: 6px;
  background: var(--telekom-color-ui-faint, #dfdfe1);
  border-radius: 50px;
  overflow: hidden;
}

.classification-progress__fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  border-radius: 50px;
  background: var(--telekom-color-primary-standard, #e20074);
  transition: width 0.3s ease;
}

.classification-progress__info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
  font-weight: 400;
  color: var(--telekom-color-text-and-icon-standard, #000000);
  line-height: 19.6px;
}

.classification-progress__check {
  color: var(--telekom-color-functional-success-standard, #00b367);
  font-weight: 700;
}
</style>
