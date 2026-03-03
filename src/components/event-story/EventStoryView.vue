<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import StoryDialog from './StoryDialog.vue'
import StoryPanel from './StoryPanel.vue'
import TextGenerationPanel from './TextGenerationPanel.vue'
import TextFeedbackChat from './TextFeedbackChat.vue'
import { useEventStoryStore } from '@/stores/eventStoryStore'
import { useTextFeedbackStore } from '@/stores/textFeedbackStore'
import { useI18n } from '@/i18n'

const { t } = useI18n()
const { phase } = useEventStoryStore()
const feedbackStore = useTextFeedbackStore()

function handleNewChat() {
  feedbackStore.clearConversation()
}

const sidebarTab = ref<'classification' | 'refinement'>('refinement')

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

    <!-- Text generation (two-column: output left, tabbed sidebar right) -->
    <template v-else-if="phase === 'text-generation'">
      <div class="event-story-view__main">
        <TextGenerationPanel />
      </div>
      <div class="event-story-view__sidebar">
        <div class="sidebar-card">
          <!-- Tab bar row: tabs + new chat button -->
          <div class="sidebar-card__tab-row">
            <scale-tab-nav size="small" class="sidebar-card__tabs">
              <scale-tab-header
                slot="tab"
                :selected="sidebarTab === 'classification'"
                @click="sidebarTab = 'classification'"
              >
                {{ t('textGen.tabClassification') }}
              </scale-tab-header>
              <scale-tab-header
                slot="tab"
                :selected="sidebarTab === 'refinement'"
                @click="sidebarTab = 'refinement'"
              >
                {{ t('textGen.tabRefinement') }}
              </scale-tab-header>
              <scale-tab-panel slot="panel" />
              <scale-tab-panel slot="panel" />
            </scale-tab-nav>

            <scale-button
              v-show="sidebarTab === 'refinement'"
              size="small"
              class="sidebar-card__new-chat"
              @click="handleNewChat"
            >
              <scale-icon-action-add size="16" />
              {{ t('feedback.newChat') }}
            </scale-button>
          </div>

          <!-- Tab content -->
          <div v-show="sidebarTab === 'classification'" class="sidebar-card__panel">
            <StoryPanel />
          </div>
          <div v-show="sidebarTab === 'refinement'" class="sidebar-card__panel sidebar-card__panel--chat">
            <TextFeedbackChat />
          </div>
        </div>
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
  overflow-y: auto;
  scrollbar-width: none;
}

.event-story-view__main::-webkit-scrollbar {
  display: none;
}

.event-story-view__sidebar {
  width: clamp(300px, 30%, 400px);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding-top: 16px;
  padding-bottom: 16px;
}

/* Tabbed sidebar card (text-generation phase) */
.sidebar-card {
  background: var(--telekom-color-background-surface, #fff);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.sidebar-card__tab-row {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  padding: 0 12px;
  border-bottom: 1px solid var(--telekom-color-ui-faint, #dfdfe1);
}

.sidebar-card__tabs {
  flex: 1;
  min-width: 0;
}

.sidebar-card__new-chat {
  flex-shrink: 0;
}

.sidebar-card__panel {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.sidebar-card__panel--chat {
  padding: 24px;
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

<!-- Unscoped: hide empty tab panels + strip StoryPanel card when embedded -->
<style>
.sidebar-card scale-tab-panel {
  display: none !important;
  height: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  overflow: hidden !important;
}

.sidebar-card .story-panel__card {
  background: transparent;
  box-shadow: none;
  border-radius: 0;
}
</style>
