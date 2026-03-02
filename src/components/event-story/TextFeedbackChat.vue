<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import ChatMessage from '@/components/chat/ChatMessage.vue'
import ChatInput from '@/components/chat/ChatInput.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useTextFeedbackStore } from '@/stores/textFeedbackStore'
import { useTextGenerationStore } from '@/stores/textGenerationStore'
import { useEventStoryStore } from '@/stores/eventStoryStore'
import { createProvider } from '@/services/llm/providerFactory'
import {
  buildTextFeedbackSystemPrompt,
  buildTextFeedbackMessages,
  parseTextFeedbackResponse,
} from '@/services/llm/textFeedbackPromptBuilder'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const {
  messages,
  isGenerating,
  error,
  addUserMessage,
  addAssistantMessage,
  applyChanges,
  clearConversation,
} = useTextFeedbackStore()

const { generatedText } = useTextGenerationStore()
const { storyText } = useEventStoryStore()

const scrollAnchor = ref<HTMLElement | null>(null)

// Auto-scroll when new messages arrive
watch(
  () => messages.value.length,
  () => {
    nextTick(() => {
      scrollAnchor.value?.scrollIntoView({ behavior: 'smooth' })
    })
  },
)

const hasGeneratedText = computed(() => Object.keys(generatedText.data).length > 0)

const examplePrompts = computed(() => [
  t('feedback.example1'),
  t('feedback.example2'),
  t('feedback.example3'),
])

async function handleSend(text: string) {
  addUserMessage(text)
  isGenerating.value = true
  error.value = null

  try {
    const provider = createProvider()
    const systemPrompt = buildTextFeedbackSystemPrompt(
      generatedText.data,
      storyText.value,
    )

    const result = await provider.generateText({
      systemPrompt,
      userPrompt: '',
      messages: buildTextFeedbackMessages(messages.value),
      maxTokens: 4096,
    })

    const { message, changes } = parseTextFeedbackResponse(result.rawResponse)
    addAssistantMessage(message, changes)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'An unexpected error occurred'
  } finally {
    isGenerating.value = false
  }
}

function handleApplyChanges(messageId: string) {
  applyChanges(messageId)
}

function handleClear() {
  clearConversation()
}

function handleExampleClick(prompt: string) {
  handleSend(prompt)
}
</script>

<template>
  <div class="feedback-chat">
    <!-- Collapsed narrative summary -->
    <details class="feedback-chat__narrative">
      <summary class="feedback-chat__narrative-toggle">
        <AppIcon name="file-text" :size="14" :stroke-width="2" />
        {{ t('feedback.narrativeSummary') }}
      </summary>
      <div class="feedback-chat__narrative-body">
        {{ storyText || t('feedback.noNarrative') }}
      </div>
    </details>

    <!-- Header with title + new chat -->
    <div class="feedback-chat__header">
      <h3 class="feedback-chat__title">{{ t('feedback.title') }}</h3>
      <button
        v-if="messages.length > 0"
        class="feedback-chat__new-chat"
        @click="handleClear"
      >
        <AppIcon name="plus" :stroke-width="2" />
        {{ t('feedback.newChat') }}
      </button>
    </div>

    <!-- Messages area -->
    <div class="feedback-chat__messages">
      <!-- Welcome state -->
      <div v-if="messages.length === 0 && !isGenerating" class="feedback-chat__welcome">
        <p class="feedback-chat__welcome-text">{{ t('feedback.welcome') }}</p>
        <div v-if="hasGeneratedText" class="feedback-chat__examples">
          <button
            v-for="(prompt, i) in examplePrompts"
            :key="i"
            class="feedback-chat__example-btn"
            @click="handleExampleClick(prompt)"
          >
            {{ prompt }}
          </button>
        </div>
        <p v-else class="feedback-chat__no-text">{{ t('feedback.generateFirst') }}</p>
      </div>

      <template v-else>
        <template v-for="msg in messages" :key="msg.id">
          <ChatMessage :message="msg" />

          <!-- Inline apply button for messages with changes -->
          <div v-if="msg.hasChanges && !msg.applied" class="feedback-chat__msg-apply">
            <button class="feedback-chat__apply-btn" @click="handleApplyChanges(msg.id)">
              <AppIcon name="check" :size="14" :stroke-width="2" />
              {{ t('feedback.applyChanges') }}
            </button>
          </div>

          <!-- Inline applied confirmation -->
          <div v-else-if="msg.applied" class="feedback-chat__msg-applied">
            <AppIcon name="check" :size="14" :stroke-width="2" />
            {{ t('feedback.changesApplied') }}
          </div>
        </template>

        <!-- Typing indicator -->
        <div v-if="isGenerating" class="feedback-chat__typing">
          <div class="feedback-chat__typing-bubble">
            <span class="feedback-chat__dot" />
            <span class="feedback-chat__dot" />
            <span class="feedback-chat__dot" />
          </div>
        </div>

        <!-- Error -->
        <div v-if="error" class="feedback-chat__error">
          <scale-notification
            variant="danger"
            :opened="true"
            @scale-close="error = null"
          >
            {{ error }}
          </scale-notification>
        </div>
      </template>

      <div ref="scrollAnchor" />
    </div>

    <!-- Input -->
    <ChatInput
      :disabled="isGenerating || !hasGeneratedText"
      @send="handleSend"
    />
  </div>
</template>

<style scoped>
.feedback-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--telekom-color-background-surface, #fff);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

/* Narrative summary */
.feedback-chat__narrative {
  flex-shrink: 0;
  border-bottom: 1px solid var(--telekom-color-ui-faint, #dfdfe1);
}

.feedback-chat__narrative-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  font-family: 'TeleNeo', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6f);
  cursor: pointer;
  list-style: none;
}

.feedback-chat__narrative-toggle::-webkit-details-marker {
  display: none;
}

.feedback-chat__narrative-body {
  padding: 0 16px 12px;
  font-family: 'TeleNeo', sans-serif;
  font-size: 12px;
  line-height: 1.5;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6f);
  white-space: pre-wrap;
  max-height: 150px;
  overflow-y: auto;
}

/* Header */
.feedback-chat__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--telekom-color-ui-faint, #dfdfe1);
}

.feedback-chat__title {
  font-family: 'TeleNeo', sans-serif;
  font-size: 16px;
  font-weight: 800;
  margin: 0;
}

.feedback-chat__new-chat {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: 1px solid var(--telekom-color-ui-border-standard, #ccc);
  border-radius: 16px;
  padding: 4px 12px 4px 8px;
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  color: var(--telekom-color-text-and-icon-standard, #191919);
  cursor: pointer;
  transition: border-color 0.15s;
}

.feedback-chat__new-chat:hover {
  border-color: var(--telekom-color-primary-standard, #e20074);
  color: var(--telekom-color-primary-standard, #e20074);
}

/* Messages */
.feedback-chat__messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

/* Welcome */
.feedback-chat__welcome {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 0;
}

.feedback-chat__welcome-text {
  font-family: 'TeleNeo', sans-serif;
  font-size: 14px;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6f);
  margin: 0;
  line-height: 1.5;
}

.feedback-chat__no-text {
  font-family: 'TeleNeo', sans-serif;
  font-size: 13px;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6f);
  font-style: italic;
  margin: 0;
}

.feedback-chat__examples {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.feedback-chat__example-btn {
  text-align: left;
  background: var(--telekom-color-background-surface-subtle, #f9f9f9);
  border: 1px solid var(--telekom-color-ui-border-standard, #ccc);
  border-radius: 8px;
  padding: 10px 14px;
  font-family: 'TeleNeo', sans-serif;
  font-size: 13px;
  color: var(--telekom-color-text-and-icon-standard, #191919);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  line-height: 1.4;
}

.feedback-chat__example-btn:hover {
  border-color: var(--telekom-color-primary-standard, #e20074);
  background: var(--telekom-color-background-surface, #fff);
}

/* Per-message apply button — appears below assistant message with changes */
.feedback-chat__msg-apply {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;
  margin-top: -8px;
}

.feedback-chat__apply-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--telekom-color-primary-standard, #e20074);
  color: #fff;
  border: none;
  border-radius: 16px;
  padding: 6px 14px;
  font-family: 'TeleNeo', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.feedback-chat__apply-btn:hover {
  background: var(--telekom-color-primary-hovered, #b3005c);
}

/* Per-message applied confirmation */
.feedback-chat__msg-applied {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
  margin-top: -8px;
  font-family: 'TeleNeo', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--telekom-color-functional-success-standard, #2c8646);
}

/* Typing indicator */
.feedback-chat__typing {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;
}

.feedback-chat__typing-bubble {
  background: var(--telekom-color-background-surface-subtle, #f9f9f9);
  border: 1px solid var(--telekom-color-ui-border-standard, #ccc);
  border-radius: 12px 12px 12px 4px;
  padding: 12px 16px;
  display: flex;
  gap: 5px;
  align-items: center;
}

.feedback-chat__dot {
  width: 6px;
  height: 6px;
  background: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  border-radius: 50%;
  animation: fb-bounce 1.4s infinite ease-in-out;
}

.feedback-chat__dot:nth-child(2) {
  animation-delay: 0.16s;
}

.feedback-chat__dot:nth-child(3) {
  animation-delay: 0.32s;
}

@keyframes fb-bounce {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Error */
.feedback-chat__error {
  margin-bottom: 16px;
}
</style>
