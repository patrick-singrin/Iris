import { ref } from 'vue'
import type { FeedbackMessage } from '@/types/textFeedback'
import type { GeneratedText } from '@/types/event'
import { useTextGenerationStore } from './textGenerationStore'

const messages = ref<FeedbackMessage[]>([])
const isGenerating = ref(false)
const error = ref<string | null>(null)

let messageCounter = 0

export function useTextFeedbackStore() {
  function addUserMessage(content: string): FeedbackMessage {
    const msg: FeedbackMessage = {
      id: `fb-${++messageCounter}-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    }
    messages.value.push(msg)
    return msg
  }

  function addAssistantMessage(content: string, changes?: GeneratedText | null): FeedbackMessage {
    const hasChanges = !!changes && Object.keys(changes).length > 0
    const msg: FeedbackMessage = {
      id: `fb-${++messageCounter}-${Date.now()}`,
      role: 'assistant',
      content,
      timestamp: new Date().toISOString(),
      hasChanges,
      changes: hasChanges ? changes : null,
      applied: false,
    }
    messages.value.push(msg)
    return msg
  }

  function applyChanges(messageId: string) {
    const msg = messages.value.find(m => m.id === messageId)
    if (!msg?.changes) return

    const textStore = useTextGenerationStore()
    const current = textStore.generatedText.data

    // Merge changes into existing generated text (only overwrite changed fields)
    for (const [componentId, fields] of Object.entries(msg.changes)) {
      if (!current[componentId]) {
        current[componentId] = {}
      }
      for (const [fieldId, value] of Object.entries(fields)) {
        current[componentId][fieldId] = value
      }
    }

    msg.applied = true
  }

  function clearConversation() {
    messages.value = []
    isGenerating.value = false
    error.value = null
    messageCounter = 0
  }

  function reset() {
    clearConversation()
  }

  return {
    messages,
    isGenerating,
    error,
    addUserMessage,
    addAssistantMessage,
    applyChanges,
    clearConversation,
    reset,
  }
}
