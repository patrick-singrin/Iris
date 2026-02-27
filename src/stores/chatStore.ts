import { ref, computed, watch } from 'vue'
import type { ChatMessage, ChecklistItem } from '@/types/chat'

export type LanguagePreference = 'en' | 'de' | 'both'

const STORAGE_KEY = 'iris-chat-state'
const STORAGE_VERSION = 1

function createDefaultChecklist(): ChecklistItem[] {
  return [
    // Content Type
    {
      id: 'ui_element',
      category: 'content-type',
      label: 'UI element type',
      description: 'Button, heading, label, placeholder, tooltip, empty state, etc.',
      detected: false,
      keywords: ['button', 'heading', 'title', 'label', 'placeholder', 'tooltip', 'empty state', 'tab', 'link', 'menu', 'navigation', 'nav', 'breadcrumb', 'badge', 'tag', 'header', 'footer', 'dialog', 'modal', 'confirmation'],
    },
    {
      id: 'screen_context',
      category: 'content-type',
      label: 'Screen or page',
      description: 'Where in the product this text appears',
      detected: false,
      keywords: ['page', 'screen', 'view', 'dashboard', 'settings', 'wizard', 'form', 'sidebar', 'panel', 'section', 'overview', 'detail', 'list', 'table', 'onboarding', 'login', 'homepage'],
    },
    {
      id: 'existing_text',
      category: 'content-type',
      label: 'Existing text',
      description: 'Current copy to review or optimize',
      detected: false,
      keywords: ['currently says', 'right now it says', 'optimize', 'improve', 'rewrite', 'rephrase', 'existing', 'current text', 'we have', 'it reads'],
    },
    // Context
    {
      id: 'user_goal',
      category: 'context',
      label: 'User goal',
      description: 'What the end user is trying to accomplish',
      detected: false,
      keywords: ['user wants', 'trying to', 'goal', 'purpose', 'so they can', 'needs to', 'accomplish', 'complete', 'finish', 'achieve', 'looking for'],
    },
    {
      id: 'interaction_flow',
      category: 'context',
      label: 'Interaction flow',
      description: 'The step or workflow this text belongs to',
      detected: false,
      keywords: ['step', 'flow', 'after', 'before', 'then', 'next', 'first', 'workflow', 'process', 'sequence', 'submit', 'save', 'cancel', 'confirm', 'back'],
    },
    {
      id: 'target_audience',
      category: 'context',
      label: 'Target audience',
      description: 'Admins, developers, all users, new users, etc.',
      detected: false,
      keywords: ['admins', 'developers', 'users', 'everyone', 'new user', 'beginner', 'expert', 'technical', 'non-technical', 'audience', 'persona'],
    },
    // Preferences
    {
      id: 'constraints',
      category: 'preferences',
      label: 'Constraints',
      description: 'Character limits, space constraints, layout requirements',
      detected: false,
      keywords: ['characters', 'chars', 'max', 'limit', 'short', 'brief', 'concise', 'length', 'within', 'words', 'space', 'truncate', 'narrow', 'compact'],
    },
    {
      id: 'brand_voice',
      category: 'preferences',
      label: 'Brand / voice',
      description: 'Specific brand or voice guidelines to follow',
      detected: false,
      keywords: ['brand', 'voice', 'style', 'guideline', 'consistent', 'like we do', 'our style', 'align with', 'match'],
    },
  ]
}

function hydrateState(): { messages: ChatMessage[]; detectedIds: string[] } {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed._v !== STORAGE_VERSION) {
        sessionStorage.removeItem(STORAGE_KEY)
        return { messages: [], detectedIds: [] }
      }
      return {
        messages: parsed.messages || [],
        detectedIds: parsed.detectedIds || [],
      }
    }
  } catch { /* ignore corrupted state */ }
  return { messages: [], detectedIds: [] }
}

const hydrated = hydrateState()

const messages = ref<ChatMessage[]>(hydrated.messages)
const isGenerating = ref(false)
const error = ref<string | null>(null)
const checklistItems = ref<ChecklistItem[]>(createDefaultChecklist())
const languagePreference = ref<LanguagePreference>('both')

// Restore detected state from hydrated IDs
if (hydrated.detectedIds.length > 0) {
  for (const item of checklistItems.value) {
    if (hydrated.detectedIds.includes(item.id)) {
      item.detected = true
    }
  }
}

// Persist on changes
watch(
  () => ({
    messages: messages.value,
    detectedIds: checklistItems.value.filter(i => i.detected).map(i => i.id),
  }),
  (toSave) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...toSave, _v: STORAGE_VERSION }))
    } catch { /* storage full or unavailable */ }
  },
  { deep: true },
)

let messageCounter = messages.value.length

export function useChatStore() {
  function addUserMessage(content: string): ChatMessage {
    const msg: ChatMessage = {
      id: `msg-${++messageCounter}-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    }
    messages.value.push(msg)
    return msg
  }

  function addAssistantMessage(content: string, followUps?: string[]): ChatMessage {
    const msg: ChatMessage = {
      id: `msg-${++messageCounter}-${Date.now()}`,
      role: 'assistant',
      content,
      timestamp: new Date().toISOString(),
      ...(followUps && followUps.length > 0 ? { followUps } : {}),
    }
    messages.value.push(msg)
    return msg
  }

  function updateChecklist(detectedIds: string[]) {
    for (const item of checklistItems.value) {
      if (detectedIds.includes(item.id)) {
        item.detected = true
      }
    }
  }

  function setLanguagePreference(lang: LanguagePreference) {
    languagePreference.value = lang
  }

  function clearConversation() {
    messages.value = []
    isGenerating.value = false
    error.value = null
    messageCounter = 0
    for (const item of checklistItems.value) {
      item.detected = false
    }
  }

  const checklistProgress = computed(() => ({
    checked: checklistItems.value.filter(i => i.detected).length,
    total: checklistItems.value.length,
  }))

  return {
    messages,
    isGenerating,
    error,
    checklistItems,
    checklistProgress,
    languagePreference,
    addUserMessage,
    addAssistantMessage,
    updateChecklist,
    setLanguagePreference,
    clearConversation,
  }
}
