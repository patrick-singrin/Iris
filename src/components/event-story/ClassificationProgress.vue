<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{
  current: number
  total: number
  complete: boolean
  stepLabel?: string
}>()

const percentage = computed(() => {
  if (props.complete) return 100
  if (props.total === 0) return 0
  return Math.round((props.current / props.total) * 100)
})

const fillWidth = computed(() => `${percentage.value}%`)
</script>

<template>
  <div class="classification-progress">
    <div class="classification-progress__bars">
      <!-- Phase 1 bar (proportionally wider) -->
      <div class="classification-progress__phase classification-progress__phase--1">
        <div class="classification-progress__track">
          <div
            class="classification-progress__fill"
            :style="{ width: fillWidth }"
          />
        </div>
        <div class="classification-progress__info">
          <span class="classification-progress__count">
            <span class="classification-progress__count-current">{{ current }}</span><span class="classification-progress__count-sep">/</span><span class="classification-progress__count-total">{{ total }}</span>
          </span>
          <span v-if="stepLabel" class="classification-progress__label">{{ stepLabel }}</span>
        </div>
      </div>

      <!-- Phase 2 bar (smaller, inactive placeholder) -->
      <div class="classification-progress__phase classification-progress__phase--2">
        <div class="classification-progress__track">
          <!-- No fill — Phase 2 is inactive during classification -->
        </div>
        <div class="classification-progress__info">
          <span class="classification-progress__label">Phase 2</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.classification-progress {
  display: flex;
  flex-direction: column;
}

.classification-progress__bars {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.classification-progress__phase {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.classification-progress__phase--1 {
  flex: 5;
}

.classification-progress__phase--2 {
  flex: 1;
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
  background: var(--telekom-color-functional-success-standard, #00b367);
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
  line-height: 20px;
}

.classification-progress__count-current {
  font-weight: 700;
}

.classification-progress__label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
