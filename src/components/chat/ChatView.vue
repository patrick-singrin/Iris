<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import ChatPanel from './ChatPanel.vue'
import ContextChecklist from './ContextChecklist.vue'
import { useChatStore } from '@/stores/chatStore'

const { checklistItems, checklistProgress, languagePreference, setLanguagePreference } = useChatStore()

// Lock page scroll when chat view is active
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
  <div class="chat-view">
    <div class="chat-view__main">
      <ChatPanel />
    </div>
    <div class="chat-view__sidebar">
      <ContextChecklist
        :items="checklistItems"
        :progress="checklistProgress"
        :language-preference="languagePreference"
        @update:language-preference="setLanguagePreference"
      />
    </div>
  </div>
</template>

<style scoped>
.chat-view {
  display: flex;
  height: 100%;
  overflow: hidden;
}

.chat-view__main {
  flex: 1;
  background: var(--telekom-color-background-surface-subtle, #efeff0);
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.chat-view__sidebar {
  width: 387px;
  flex-shrink: 0;
  padding: 24px;
  background: var(--telekom-color-background-surface-subtle, #efeff0);
  overflow-y: auto;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

@media (max-width: 1024px) {
  .chat-view {
    flex-direction: column;
    height: auto;
  }

  .chat-view__main {
    min-height: 60vh;
  }

  .chat-view__sidebar {
    width: 100%;
    position: static;
    height: auto;
  }
}
</style>
