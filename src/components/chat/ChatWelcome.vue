<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const emit = defineEmits<{
  'select-prompt': [text: string]
}>()

const examplePrompts = computed(() => [
  t('chat.welcome.prompt1'),
  t('chat.welcome.prompt2'),
  t('chat.welcome.prompt3'),
  t('chat.welcome.prompt4'),
])
</script>

<template>
  <div class="chat-welcome">
    <div class="chat-welcome__content">
      <div class="chat-welcome__icon">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <rect width="48" height="48" rx="12" fill="currentColor" opacity="0.1" />
          <path
            d="M14 16h20v2H14zm0 6h14v2H14zm0 6h18v2H14zm22-10v14l-4-3H16"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"
          />
        </svg>
      </div>
      <h2 class="chat-welcome__title">{{ t('chat.welcome.title') }}</h2>
      <p class="chat-welcome__subtitle">
        {{ t('chat.welcome.subtitle') }}
      </p>
      <div class="chat-welcome__prompts">
        <p class="chat-welcome__prompts-label">{{ t('chat.welcome.tryExample') }}</p>
        <div class="chat-welcome__chips">
          <button
            v-for="prompt in examplePrompts"
            :key="prompt"
            class="chat-welcome__chip"
            @click="emit('select-prompt', prompt)"
          >
            {{ prompt }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-welcome {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 32px;
}

.chat-welcome__content {
  text-align: center;
  max-width: 520px;
}

.chat-welcome__icon {
  margin-bottom: 16px;
  color: var(--telekom-color-primary-standard, #e20074);
}

.chat-welcome__title {
  font-size: 22px;
  font-weight: 700;
  color: var(--telekom-color-text-and-icon-standard, #191919);
  margin: 0 0 8px;
}

.chat-welcome__subtitle {
  font-size: 14px;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  line-height: 1.5;
  margin: 0 0 32px;
}

.chat-welcome__prompts-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  margin: 0 0 12px;
}

.chat-welcome__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.chat-welcome__chip {
  background: var(--telekom-color-background-surface, #fff);
  border: 1px solid var(--telekom-color-ui-border-standard, #ccc);
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 13px;
  color: var(--telekom-color-text-and-icon-standard, #191919);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  font-family: inherit;
  line-height: 1.4;
  text-align: left;
}

.chat-welcome__chip:hover {
  border-color: var(--telekom-color-primary-standard, #e20074);
  background: rgba(226, 0, 116, 0.04);
}

.chat-welcome__chip:active {
  background: rgba(226, 0, 116, 0.08);
}
</style>
