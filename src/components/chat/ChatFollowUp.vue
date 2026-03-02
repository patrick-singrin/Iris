<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()

const props = defineProps<{
  questions: string[]
}>()

const emit = defineEmits<{
  send: [text: string]
}>()

const answers = ref<string[]>(props.questions.map(() => ''))

function handleInput(index: number, event: Event) {
  const target = event.target as HTMLTextAreaElement | null
  if (target) answers.value[index] = target.value
}

function handleSubmit() {
  const parts = props.questions
    .map((q, i) => ({ question: q, answer: answers.value[i]?.trim() }))
    .filter(({ answer }) => answer)

  if (parts.length === 0) return

  // Compose a natural-language message from the answers
  const text = parts
    .map(({ question, answer }) => `**${question}**\n${answer}`)
    .join('\n\n')

  emit('send', text)
}

function handleKeydown(index: number, event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    // If this is the last field, submit; otherwise focus next
    if (index === props.questions.length - 1) {
      handleSubmit()
    }
  }
}
</script>

<template>
  <div class="chat-followup">
    <div class="chat-followup__card">
      <div class="chat-followup__header">
        <AppIcon name="help" :size="14" />
        {{ t('chat.followUp.header') }}
      </div>
      <div
        v-for="(question, i) in questions"
        :key="i"
        class="chat-followup__field"
      >
        <label class="chat-followup__label">{{ question }}</label>
        <scale-textarea
          :value="answers[i]"
          rows="1"
          resize="vertical"
          :placeholder="t('chat.followUp.placeholder')"
          @scaleChange="handleInput(i, $event)"
          @keydown="handleKeydown(i, $event)"
        />
      </div>
      <div class="chat-followup__actions">
        <scale-button
          size="small"
          :disabled="answers.every(a => !a.trim())"
          @click="handleSubmit"
        >
          {{ t('chat.followUp.send') }}
        </scale-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-followup {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;
  max-width: 80%;
}

.chat-followup__card {
  background: var(--telekom-color-background-surface, #fff);
  border: 1px dashed var(--telekom-color-ui-border-standard, #ccc);
  border-radius: 12px;
  padding: 16px;
  width: 100%;
}

.chat-followup__header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--telekom-color-text-and-icon-additional, #6c6c6c);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}

.chat-followup__field {
  margin-bottom: 12px;
}

.chat-followup__field:last-of-type {
  margin-bottom: 0;
}

.chat-followup__label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--telekom-color-text-and-icon-standard, #191919);
  margin-bottom: 4px;
  line-height: 1.4;
}

.chat-followup__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
