<script setup lang="ts">
import { computed } from 'vue'
import HotkeyBadge from './HotkeyBadge.vue'

const props = defineProps<{
  value: string
  label: string
  description?: string
  hotkeyLabel?: string
  selected: boolean
  name: string
}>()

const emit = defineEmits<{
  select: [value: string]
}>()

const tileClass = computed(() => ({
  'radio-tile': true,
  'radio-tile--selected': props.selected,
}))

function handleClick() {
  emit('select', props.value)
}
</script>

<template>
  <div :class="tileClass" role="radio" :aria-checked="selected" tabindex="0" @click="handleClick" @keydown.enter="handleClick" @keydown.space.prevent="handleClick">
    <div class="radio-tile__content">
      <div class="radio-tile__radio-row">
        <span class="radio-tile__circle">
          <span v-if="selected" class="radio-tile__circle-fill" />
        </span>
        <span class="radio-tile__label">{{ label }}</span>
      </div>
      <div v-if="description" class="radio-tile__subline">
        <span class="radio-tile__subline-text">{{ description }}</span>
      </div>
    </div>
    <HotkeyBadge v-if="hotkeyLabel" :key-label="hotkeyLabel" />
  </div>
</template>

<style scoped>
.radio-tile {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: var(--telekom-color-background-surface, #fff);
  border: 1px solid var(--telekom-color-ui-faint, #dfdfe1);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  user-select: none;
}

.radio-tile:hover {
  background: rgba(0, 0, 0, 0.07);
  border-color: rgba(0, 0, 0, 0.44);
}

.radio-tile--selected {
  border-color: var(--telekom-color-primary-standard, #e20074);
}

.radio-tile--selected:hover {
  border-color: var(--telekom-color-primary-standard, #e20074);
}

.radio-tile__content {
  flex: 1;
  min-width: 0;
}

.radio-tile__radio-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.radio-tile__circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  border: 1px solid rgba(0, 0, 0, 0.44);
  border-radius: 50%;
  transition: border-color 0.15s;
}

.radio-tile--selected .radio-tile__circle {
  border-color: var(--telekom-color-primary-standard, #e20074);
}

.radio-tile__circle-fill {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--telekom-color-primary-standard, #e20074);
}

.radio-tile__label {
  font-family: 'TeleNeo', sans-serif;
  font-size: 16px;
  font-weight: 655;
  letter-spacing: -0.16px;
  line-height: 20px;
  color: var(--telekom-color-text-and-icon-standard, #000000);
}

.radio-tile__subline {
  padding-left: 28px;
}

.radio-tile__subline-text {
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 19.6px;
  color: #747478;
}
</style>
