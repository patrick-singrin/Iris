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

</script>

<template>
  <div class="feedback-chat">
    <!-- Header: title + description -->
    <div class="feedback-chat__header">
      <h3 class="feedback-chat__title">{{ t('feedback.title') }}</h3>
      <p class="feedback-chat__description">{{ t('feedback.welcome') }}</p>
    </div>

    <!-- Messages area -->
    <div class="feedback-chat__messages">
      <!-- "Generate first" hint when no text exists yet -->
      <p v-if="messages.length === 0 && !isGenerating && !hasGeneratedText" class="feedback-chat__no-text">
        {{ t('feedback.generateFirst') }}
      </p>

      <template v-if="messages.length > 0 || isGenerating">
        <template v-for="msg in messages" :key="msg.id">
          <ChatMessage :message="msg" />

          <!-- Apply changes button for messages with changes -->
          <div v-if="msg.hasChanges && !msg.applied" class="feedback-chat__msg-apply">
            <scale-button size="small" @click="handleApplyChanges(msg.id)">
              <scale-icon-navigation-right slot="icon" size="16" />
              {{ t('feedback.applyChanges') }}
            </scale-button>
          </div>

          <!-- Applied confirmation -->
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
    <div class="feedback-chat__input">
      <ChatInput
        compact
        :disabled="isGenerating || !hasGeneratedText"
        :placeholder="t('feedback.placeholder')"
        @send="handleSend"
      />
    </div>
  </div>
</template>

<style scoped>
.feedback-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

/* Header */
.feedback-chat__header {
  flex-shrink: 0;
  padding: 0 0 10px;
}

.feedback-chat__title {
  font-family: 'TeleNeo', sans-serif;
  font-size: 20px;
  font-weight: 800;
  line-height: 28px;
  color: var(--telekom-color-text-and-icon-standard, #000);
  margin: 0;
}

.feedback-chat__description {
  font-family: 'TeleNeo', sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 22.4px;
  color: var(--telekom-color-text-and-icon-standard, #000);
  margin: 0;
}

/* Messages */
.feedback-chat__messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 10px 0;
  display: flex;
  flex-direction: column;
}

.feedback-chat__no-text {
  font-family: 'TeleNeo', sans-serif;
  font-size: 13px;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6f);
  font-style: italic;
  margin: 0;
}

/* Apply button — below assistant message with changes */
.feedback-chat__msg-apply {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;
  margin-top: -8px;
}

/* Applied confirmation */
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

/* Input */
.feedback-chat__input {
  flex-shrink: 0;
  padding-top: 10px;
}

/* Error */
.feedback-chat__error {
  margin-bottom: 16px;
}
</style>
