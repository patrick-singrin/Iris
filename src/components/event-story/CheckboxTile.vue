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
  toggle: [value: string]
}>()

const tileClass = computed(() => ({
  'checkbox-tile': true,
  'checkbox-tile--selected': props.selected,
}))

function handleClick() {
  emit('toggle', props.value)
}
</script>

<template>
  <div :class="tileClass" role="checkbox" :aria-checked="selected" tabindex="0" @click="handleClick" @keydown.enter="handleClick" @keydown.space.prevent="handleClick">
    <div class="checkbox-tile__content">
      <div class="checkbox-tile__checkbox-row">
        <span class="checkbox-tile__box">
          <svg v-if="selected" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2 6l3 3 5-5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <span class="checkbox-tile__label">{{ label }}</span>
      </div>
      <div v-if="description" class="checkbox-tile__subline">
        <span class="checkbox-tile__subline-text">{{ description }}</span>
      </div>
    </div>
    <HotkeyBadge v-if="hotkeyLabel" :key-label="hotkeyLabel" />
  </div>
</template>

<style scoped>
.checkbox-tile {
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

.checkbox-tile:hover {
  background: rgba(0, 0, 0, 0.07);
  border-color: rgba(0, 0, 0, 0.44);
}

.checkbox-tile--selected {
  border-color: var(--telekom-color-primary-standard, #e20074);
}

.checkbox-tile--selected:hover {
  border-color: var(--telekom-color-primary-standard, #e20074);
}

.checkbox-tile__content {
  flex: 1;
  min-width: 0;
}

.checkbox-tile__checkbox-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox-tile__box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  border: 1px solid rgba(0, 0, 0, 0.44);
  border-radius: 4px;
  transition: background 0.15s, border-color 0.15s;
}

.checkbox-tile--selected .checkbox-tile__box {
  background: var(--telekom-color-primary-standard, #e20074);
  border-color: var(--telekom-color-primary-standard, #e20074);
}

.checkbox-tile__label {
  font-family: 'TeleNeo', sans-serif;
  font-size: 16px;
  font-weight: 655;
  letter-spacing: -0.16px;
  line-height: 20px;
  color: var(--telekom-color-text-and-icon-standard, #000000);
}

.checkbox-tile__subline {
  padding-left: 28px;
}

.checkbox-tile__subline-text {
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 19.6px;
  color: #747478;
}
</style>
