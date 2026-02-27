<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  disabled: boolean
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
  <div class="chat-input">
    <div class="chat-input__card">
      <div class="chat-input__row">
        <div class="chat-input__field">
          <scale-textarea
            :value="inputText"
            placeholder="Describe the UI element or paste text to optimize..."
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
          Send
        </scale-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-input {
  padding: 16px 24px 24px;
  background: var(--telekom-color-background-surface-subtle, #efeff0);
  flex-shrink: 0;
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

.chat-input__field {
  flex: 1;
}

.chat-input__field scale-textarea {
  --background: var(--telekom-color-background-surface, #fff);
}

.chat-input__send {
  flex-shrink: 0;
}
</style>
