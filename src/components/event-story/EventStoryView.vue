<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import StoryDialog from './StoryDialog.vue'
import StoryPanel from './StoryPanel.vue'
import TextGenerationPanel from './TextGenerationPanel.vue'
import { useEventStoryStore } from '@/stores/eventStoryStore'

const { phase } = useEventStoryStore()

onMounted(() => {
  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
})

onUnmounted(() => {
  document.documentElement.style.overflow = ''
  document.body.style.overflow = ''
})
</script>

<template>
  <div class="event-story-view">
    <!-- Interview + inline analysis (two-column) -->
    <template v-if="phase === 'collect'">
      <div class="event-story-view__main">
        <StoryDialog />
      </div>
      <div class="event-story-view__sidebar">
        <StoryPanel />
      </div>
    </template>

    <!-- Text generation (two-column: output left, sidebar right) -->
    <template v-else-if="phase === 'text-generation'">
      <div class="event-story-view__main">
        <TextGenerationPanel />
      </div>
      <div class="event-story-view__sidebar">
        <StoryPanel />
      </div>
    </template>
  </div>
</template>

<style scoped>
.event-story-view {
  display: flex;
  gap: 16px;
  height: 100%;
  overflow: hidden;
  padding: 0 16px;
  box-sizing: border-box;
  background: var(--telekom-color-background-surface-subtle, #efeff0);
}

.event-story-view__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.event-story-view__sidebar {
  width: clamp(300px, 30%, 400px);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding-top: 16px;
  padding-bottom: 16px;
}

@media (max-width: 1024px) {
  .event-story-view {
    flex-direction: column;
    overflow-y: auto;
  }

  .event-story-view__main {
    flex: none;
    min-height: 60vh;
  }

  .event-story-view__sidebar {
    flex: none;
    width: 100%;
    height: auto;
  }
}
</style>
