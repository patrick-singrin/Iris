<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = defineProps<{
  disabled: boolean
  compact?: boolean
  placeholder?: string
}>()

const emit = defineEmits<{
  send: [text: string]
}>()

const inputText = ref('')

function handleSend() {
  const text = inputText.value.trim()
  if (!text || props.disabled) return
  emit('send', text)
  inputText.value = ''
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function handleInput(e: Event) {
  const target = e.target as HTMLTextAreaElement | null
  if (target) {
    inputText.value = target.value
  }
}

/** Called from parent when an example prompt is selected */
function setAndSend(text: string) {
  inputText.value = text
  handleSend()
}

defineExpose({ setAndSend })
</script>

<template>
  <div class="chat-input" :class="{ 'chat-input--compact': compact }">
    <div v-if="!compact" class="chat-input__card">
      <div class="chat-input__row">
        <div class="chat-input__field">
          <scale-textarea
            :value="inputText"
            :placeholder="placeholder || t('chat.placeholder')"
            :aria-label="t('a11y.chatInput')"
            rows="2"
            resize="vertical"
            :disabled="disabled"
            @scaleChange="handleInput"
            @keydown="handleKeydown"
          />
        </div>
        <scale-button
          class="chat-input__send"
          :disabled="!inputText.trim() || disabled"
          @click="handleSend"
        >
          {{ t('chat.send') }}
        </scale-button>
      </div>
    </div>

    <!-- Compact: inline row with icon-only send button -->
    <div v-else class="chat-input__row chat-input__row--compact">
      <div class="chat-input__field">
        <scale-textarea
          :value="inputText"
          :placeholder="placeholder || t('chat.placeholder')"
          :aria-label="t('a11y.chatInput')"
          rows="2"
          :disabled="disabled"
          @scaleChange="handleInput"
          @keydown="handleKeydown"
        />
      </div>
      <button
        class="chat-input__send-icon"
        :disabled="!inputText.trim() || disabled"
        :aria-label="t('chat.send')"
        @click="handleSend"
      >
        <AppIcon name="send" :size="16" :stroke-width="1.8" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.chat-input {
  padding: 16px 24px 24px;
  background: var(--telekom-color-background-surface-subtle, #efeff0);
  flex-shrink: 0;
}

.chat-input--compact {
  padding: 0;
  background: transparent;
}

.chat-input__card {
  background: var(--telekom-color-background-surface, #fff);
  border-radius: 8px;
  padding: 16px;
}

.chat-input__row {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.chat-input__row--compact {
  gap: 16px;
  align-items: flex-start;
}

.chat-input__field {
  flex: 1;
}

.chat-input__field scale-textarea {
  --background: var(--telekom-color-background-surface, #fff);
}

.chat-input__send {
  flex-shrink: 0;
}

.chat-input__send-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--telekom-color-primary-standard, #e20074);
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}

.chat-input__send-icon:hover:not(:disabled) {
  background: var(--telekom-color-primary-hovered, #b3005c);
}

.chat-input__send-icon:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>

<!-- Unscoped: override Scale's default transparent placeholder -->
<style>
.chat-input .textarea .textarea__control::placeholder,
.chat-input .textarea ::placeholder {
  color: var(--telekom-color-text-and-icon-additional, #6c6c6f) !important;
}
</style>
