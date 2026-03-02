<script setup lang="ts">
/**
 * AppIcon — shared SVG icon component.
 *
 * Centralises all inline SVG icons used across the app.
 * Usage:  <AppIcon name="check" :size="16" />
 */

withDefaults(defineProps<{
  name: IconName
  size?: number
  strokeWidth?: number
}>(), {
  size: 16,
  strokeWidth: 1.5,
})

export type IconName =
  | 'check'
  | 'chevron-down'
  | 'chevron-left'
  | 'plus'
  | 'info'
  | 'help'
  | 'search'
  | 'circle-check'
  | 'circle-empty'
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
    class="app-icon"
  >
    <!-- Checkmark -->
    <path
      v-if="name === 'check'"
      d="M3 8l4 4 6-6"
      stroke="currentColor"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
    />

    <!-- Chevron down (collapse/expand) -->
    <path
      v-else-if="name === 'chevron-down'"
      d="M4 6l4 4 4-4"
      stroke="currentColor"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
    />

    <!-- Chevron left (back arrow) -->
    <path
      v-else-if="name === 'chevron-left'"
      d="M10 4l-4 4 4 4"
      stroke="currentColor"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
    />

    <!-- Plus / Add -->
    <path
      v-else-if="name === 'plus'"
      d="M8 3v10M3 8h10"
      stroke="currentColor"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
    />

    <!-- Info circle (i) -->
    <template v-else-if="name === 'info'">
      <circle cx="8" cy="8" r="7" stroke="currentColor" :stroke-width="strokeWidth" />
      <path d="M8 7v4.5" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" />
      <circle cx="8" cy="4.75" r="0.75" fill="currentColor" />
    </template>

    <!-- Help circle (?) -->
    <template v-else-if="name === 'help'">
      <circle cx="8" cy="8" r="7" stroke="currentColor" :stroke-width="strokeWidth" />
      <path d="M6 6a2 2 0 1 1 2 2v1" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" />
      <circle cx="8" cy="12" r="0.75" fill="currentColor" />
    </template>

    <!-- Magnifying glass / search -->
    <template v-else-if="name === 'search'">
      <circle cx="7" cy="7" r="4" stroke="currentColor" :stroke-width="strokeWidth" />
      <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" />
    </template>

    <!-- Filled circle with checkmark -->
    <template v-else-if="name === 'circle-check'">
      <circle cx="8" cy="8" r="7" fill="currentColor" />
      <path d="M5 8l2.5 2.5L11 6" stroke="white" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
    </template>

    <!-- Empty circle -->
    <circle
      v-else-if="name === 'circle-empty'"
      cx="8"
      cy="8"
      r="7"
      stroke="currentColor"
      :stroke-width="strokeWidth"
    />
  </svg>
</template>

<style scoped>
.app-icon {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}
</style>
