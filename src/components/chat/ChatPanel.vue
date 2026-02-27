<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import ChatMessage from './ChatMessage.vue'
import ChatInput from './ChatInput.vue'
import ChatWelcome from './ChatWelcome.vue'
import ChatFollowUp from './ChatFollowUp.vue'
import { useChatStore } from '@/stores/chatStore'
import { createProvider } from '@/services/llm/providerFactory'
import { buildChatSystemPrompt, buildChatMessages } from '@/services/llm/chatPromptBuilder'
import { detectContextLocally, parseContextFromResponse, stripContextBlock } from '@/services/llm/contextAnalyzer'

const {
  messages,
  isGenerating,
  error,
  checklistItems,
  languagePreference,
  addUserMessage,
  addAssistantMessage,
  updateChecklist,
  clearConversation,
} = useChatStore()

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

async function handleSend(text: string) {
  // 1. Add user message
  addUserMessage(text)

  // 2. Local keyword detection (instant)
  const localDetections = detectContextLocally(text, checklistItems.value)
  if (localDetections.length > 0) {
    updateChecklist(localDetections)
  }

  // 3. Call LLM
  isGenerating.value = true
  error.value = null

  try {
    const provider = createProvider()
    const result = await provider.generateText({
      systemPrompt: buildChatSystemPrompt(languagePreference.value),
      userPrompt: '',
      messages: buildChatMessages(messages.value),
      maxTokens: 2048,
    })

    const rawResponse = result.rawResponse

    // 4. Parse context + follow-ups from LLM response
    const { detected, followUps } = parseContextFromResponse(rawResponse)
    if (detected.length > 0) {
      updateChecklist(detected)
    }

    // 5. Strip context block and add assistant message with follow-ups
    const cleanResponse = stripContextBlock(rawResponse)
    addAssistantMessage(cleanResponse, followUps)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'An unexpected error occurred'
  } finally {
    isGenerating.value = false
  }
}

function handleSelectPrompt(text: string) {
  handleSend(text)
}

function handleClear() {
  clearConversation()
}

// Show follow-up form only on the latest assistant message when not generating
const pendingFollowUps = computed(() => {
  if (isGenerating.value) return null
  const lastMsg = messages.value[messages.value.length - 1]
  if (lastMsg?.role === 'assistant' && lastMsg.followUps?.length) {
    return lastMsg.followUps
  }
  return null
})
</script>

<template>
  <div class="chat-panel">
    <!-- Header with New Chat -->
    <div v-if="messages.length > 0 || isGenerating" class="chat-panel__header">
      <button class="chat-panel__new-chat" @click="handleClear">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        New Chat
      </button>
    </div>

    <!-- Messages area -->
    <div class="chat-panel__messages">
      <ChatWelcome
        v-if="messages.length === 0 && !isGenerating"
        @select-prompt="handleSelectPrompt"
      />

      <template v-else>
        <ChatMessage
          v-for="msg in messages"
          :key="msg.id"
          :message="msg"
        />

        <!-- Typing indicator -->
        <div v-if="isGenerating" class="chat-panel__typing">
          <div class="chat-panel__typing-bubble">
            <span class="chat-panel__dot" />
            <span class="chat-panel__dot" />
            <span class="chat-panel__dot" />
          </div>
        </div>

        <!-- Error -->
        <div v-if="error" class="chat-panel__error">
          <scale-notification
            variant="danger"
            :opened="true"
            @scale-close="error = null"
          >
            {{ error }}
          </scale-notification>
        </div>
      </template>

      <!-- Follow-up form -->
      <ChatFollowUp
        v-if="pendingFollowUps"
        :questions="pendingFollowUps"
        @send="handleSend"
      />

      <div ref="scrollAnchor" />
    </div>

    <!-- Input -->
    <ChatInput
      ref="chatInputRef"
      :disabled="isGenerating"
      @send="handleSend"
    />
  </div>
</template>

<style scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.chat-panel__header {
  display: flex;
  justify-content: flex-end;
  padding: 12px 32px;
  flex-shrink: 0;
}

.chat-panel__new-chat {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--telekom-color-background-surface, #fff);
  border: 1px solid var(--telekom-color-ui-border-standard, #ccc);
  border-radius: 20px;
  padding: 6px 16px 6px 12px;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  color: var(--telekom-color-text-and-icon-standard, #191919);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.chat-panel__new-chat:hover {
  border-color: var(--telekom-color-primary-standard, #e20074);
  color: var(--telekom-color-primary-standard, #e20074);
}

.chat-panel__messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 32px 32px;
  display: flex;
  flex-direction: column;
}

.chat-panel__error {
  margin-bottom: 16px;
}

/* Typing indicator */
.chat-panel__typing {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;
}

.chat-panel__typing-bubble {
  background: var(--telekom-color-background-surface, #fff);
  border: 1px solid var(--telekom-color-ui-border-standard, #ccc);
  border-radius: 16px 16px 16px 4px;
  padding: 14px 20px;
  display: flex;
  gap: 5px;
  align-items: center;
}

.chat-panel__dot {
  width: 8px;
  height: 8px;
  background: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  border-radius: 50%;
  animation: typing-bounce 1.4s infinite ease-in-out;
}

.chat-panel__dot:nth-child(2) {
  animation-delay: 0.16s;
}

.chat-panel__dot:nth-child(3) {
  animation-delay: 0.32s;
}

@keyframes typing-bounce {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
