<script setup lang="ts">
defineProps<{
  keyLabel: string
}>()
</script>

<template>
  <span class="hotkey-badge">{{ keyLabel }}</span>
</template>

<style scoped>
.hotkey-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  background: var(--telekom-color-background-canvas-subtle, #fbfbfb);
  border: 1px solid var(--telekom-color-ui-faint, #dfdfe1);
  border-radius: 4px;
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 19.6px;
  color: var(--telekom-color-text-and-icon-standard, #000000);
  user-select: none;
}
</style>
