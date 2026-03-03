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
  | 'chevron-up'
  | 'chevron-left'
  | 'plus'
  | 'info'
  | 'help'
  | 'search'
  | 'circle-check'
  | 'circle-empty'
  | 'trash-2'
  | 'file-text'
  | 'chat-bubble'
  | 'question-box'
  | 'send'
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

    <!-- Chevron up -->
    <path
      v-else-if="name === 'chevron-up'"
      d="M4 10l4-4 4 4"
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

    <!-- Trash / delete -->
    <template v-else-if="name === 'trash-2'">
      <path d="M2 4h12" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" />
      <path d="M5 4V2.5A.5.5 0 0 1 5.5 2h5a.5.5 0 0 1 .5.5V4" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M3 4l.75 9.5a1 1 0 0 0 1 .9h6.5a1 1 0 0 0 1-.9L13 4" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M6.5 7v4M9.5 7v4" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" />
    </template>

    <!-- File text -->
    <template v-else-if="name === 'file-text'">
      <path d="M9.5 1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5L9.5 1z" stroke="currentColor" :stroke-width="strokeWidth" stroke-linejoin="round" />
      <path d="M9.5 1V5H13" stroke="currentColor" :stroke-width="strokeWidth" stroke-linejoin="round" />
      <path d="M5.5 8h5M5.5 10.5h5M5.5 5.5h1" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" />
    </template>

    <!-- Chat bubble -->
    <path
      v-else-if="name === 'chat-bubble'"
      d="M2.667 3.333A1.333 1.333 0 0 1 4 2h8a1.333 1.333 0 0 1 1.333 1.333v6A1.333 1.333 0 0 1 12 10.667H5.333L2.667 13.333V3.333Z"
      stroke="currentColor"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
    />

    <!-- Question box (rounded rect with ?) -->
    <template v-else-if="name === 'question-box'">
      <rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke="currentColor" :stroke-width="strokeWidth" fill="none" />
      <text x="8" y="12" text-anchor="middle" font-size="10" font-weight="700" font-family="TeleNeo, sans-serif" fill="currentColor">?</text>
    </template>

    <!-- Send arrow (paper plane style) -->
    <path
      v-else-if="name === 'send'"
      d="M14 2L7 9M14 2L9.5 14L7 9M14 2L2 6.5L7 9"
      stroke="currentColor"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
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
