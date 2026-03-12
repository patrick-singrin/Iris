<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import StoryDialog from './StoryDialog.vue'
import StoryPanel from './StoryPanel.vue'
import StoryQuestion from './StoryQuestion.vue'
import HistoryIntroCard from './HistoryIntroCard.vue'
import HistoryItem from './HistoryItem.vue'
import TextGenerationPanel from './TextGenerationPanel.vue'
import TextFeedbackChat from './TextFeedbackChat.vue'
import { useEventStoryStore } from '@/stores/eventStoryStore'
import { useClassificationStore } from '@/stores/classificationStore'
import { useTextFeedbackStore } from '@/stores/textFeedbackStore'
import { useI18n } from '@/i18n'

const { t } = useI18n()
const { phase } = useEventStoryStore()
const classificationStore = useClassificationStore()
const feedbackStore = useTextFeedbackStore()

const currentTreeQuestion = computed(() => classificationStore.getCurrentQuestion())
const historyRef = ref<HTMLDivElement>()

function handleTreeAnswer(selectedOptions: string[], _freeformText: string) {
  const first = selectedOptions[0]
  if (first == null) return
  const optionIndex = parseInt(first, 10)
  if (!isNaN(optionIndex)) {
    classificationStore.answerQuestion(optionIndex)
  }
}

// Auto-scroll history when new answers are added
watch(
  () => classificationStore.path.value.length,
  async () => {
    await nextTick()
    if (historyRef.value) {
      historyRef.value.scrollTop = historyRef.value.scrollHeight
    }
  },
)

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
        <!-- Classification flow (Phase 1): chat layout -->
        <template v-if="!classificationStore.isComplete.value">
          <!-- History area (scrollable, top) -->
          <div ref="historyRef" class="event-story-view__history">
            <div class="event-story-view__history-content">
              <HistoryIntroCard />
              <HistoryItem
                v-for="(entry, idx) in classificationStore.path.value"
                :key="idx"
                type="question"
                :question-text="entry.questionText"
                :answer-text="entry.selectedLabel"
              />
            </div>
          </div>

          <!-- Input panel (anchored, bottom) -->
          <div class="event-story-view__input">
            <div class="event-story-view__input-content">
              <StoryQuestion
                v-if="currentTreeQuestion"
                :key="currentTreeQuestion.id"
                :question="currentTreeQuestion"
                @answer="handleTreeAnswer"
              />
            </div>
          </div>
        </template>

        <!-- Post-classification: show result card -->
        <template v-else-if="classificationStore.isComplete.value && classificationStore.result.value">
          <div class="event-story-view__result">
            <div class="result-card">
              <h2 class="result-card__title">{{ t('classification.result.title') }}</h2>
              <div class="result-card__tags">
                <span class="result-card__type-tag">
                  {{ classificationStore.result.value.informationType }}
                </span>
                <span v-if="classificationStore.result.value.severity" class="result-card__severity-tag">
                  {{ classificationStore.result.value.severity }}
                </span>
              </div>
              <div v-if="classificationStore.result.value.trigger" class="result-card__section">
                <span class="result-card__label">{{ t('classification.result.trigger') }}</span>
                <span>{{ classificationStore.result.value.trigger }}</span>
              </div>
              <div v-if="classificationStore.result.value.channels.length > 0" class="result-card__section">
                <span class="result-card__label">{{ t('classification.result.channels') }}</span>
                <div class="result-card__channels">
                  <span v-for="ch in classificationStore.result.value.channels" :key="ch" class="result-card__channel">{{ ch }}</span>
                </div>
              </div>
              <div class="result-card__footer">
                <span class="result-card__complete">{{ t('classification.result.phase1Complete') }}</span>
              </div>
            </div>
          </div>
        </template>

        <!-- Existing interview (fallback — shown after classification in Phase 2/3) -->
        <StoryDialog v-else />
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
  overflow: hidden;
}

.event-story-view__sidebar {
  width: clamp(300px, 30%, 400px);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding-top: 16px;
  padding-bottom: 16px;
}

/* Chat layout: history (scrollable top) + input (anchored bottom) */
.event-story-view__history {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: none;
  padding: 16px 0;
}

.event-story-view__history::-webkit-scrollbar {
  display: none;
}

.event-story-view__history-content {
  max-width: 640px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.event-story-view__input {
  flex-shrink: 0;
  padding: 16px 0;
}

.event-story-view__input-content {
  max-width: 640px;
  margin: 0 auto;
  width: 100%;
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

/* Post-classification result card */
.event-story-view__result {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  max-width: 640px;
  margin: 0 auto;
  width: 100%;
  overflow-y: auto;
}

.result-card {
  background: var(--telekom-color-background-surface, #fff);
  border-radius: 8px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  width: 100%;
}

.result-card__title {
  font-family: 'TeleNeo', sans-serif;
  font-size: 20px;
  font-weight: 800;
  color: var(--telekom-color-text-and-icon-standard, #000000);
  margin: 0;
}

.result-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.result-card__type-tag,
.result-card__severity-tag {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 4px;
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
}

.result-card__type-tag {
  background: var(--telekom-color-ui-faint, #dfdfe1);
  color: var(--telekom-color-text-and-icon-standard, #000000);
}

.result-card__severity-tag {
  background: var(--telekom-color-functional-warning-subtle);
  color: var(--telekom-color-text-and-icon-on-subtle-warning);
}

.result-card__section {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
}

.result-card__label {
  font-weight: 700;
  color: var(--telekom-color-text-and-icon-standard, #000000);
}

.result-card__channels {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.result-card__channel {
  display: inline-flex;
  align-items: center;
  padding: 2px 4px;
  border-radius: 4px;
  background: var(--telekom-color-ui-faint, #dfdfe1);
  font-size: 12px;
  font-weight: 700;
}

.result-card__footer {
  padding-top: 8px;
  border-top: 1px solid var(--telekom-color-ui-faint, #dfdfe1);
}

.result-card__complete {
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: var(--telekom-color-functional-success-standard, #00b367);
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
