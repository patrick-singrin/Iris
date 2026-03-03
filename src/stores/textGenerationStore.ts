import { reactive, ref } from 'vue'
import type { GeneratedText } from '@/types/event'

const isGenerating = ref(false)
const error = ref<string | null>(null)
const generatedText = reactive<{ data: GeneratedText }>({ data: {} })
const rawResponse = ref('')

/**
 * Approval state — keyed by composite ID (e.g. "banner", "step_1_banner").
 * Resets to false whenever text changes or is regenerated.
 */
const approvalState = reactive<Record<string, boolean>>({})

export function useTextGenerationStore() {
  function setGeneratedText(text: GeneratedText) {
    generatedText.data = text
    // Reset all approvals when text is regenerated
    for (const key of Object.keys(approvalState)) {
      delete approvalState[key]
    }
  }

  function updateField(componentId: string, fieldId: string, lang: 'en' | 'de', value: string) {
    if (!generatedText.data[componentId]) {
      generatedText.data[componentId] = {}
    }
    if (!generatedText.data[componentId][fieldId]) {
      generatedText.data[componentId][fieldId] = { en: '', de: '' }
    }
    generatedText.data[componentId][fieldId][lang] = value
    // Mark this component's text as unapproved after edit
    approvalState[componentId] = false
  }

  function mergeGeneratedText(componentId: string, data: Record<string, { en: string; de: string }>) {
    generatedText.data[componentId] = data
    // Reset approval for this component
    approvalState[componentId] = false
  }

  function getGeneratedText(): GeneratedText {
    return { ...generatedText.data }
  }

  function removeStepText(stepId: string) {
    const prefix = `${stepId}_`
    for (const key of Object.keys(generatedText.data)) {
      if (key.startsWith(prefix)) {
        delete generatedText.data[key]
        delete approvalState[key]
      }
    }
  }

  /** Approve text for a given composite key (e.g. "banner" or "step_1_banner"). */
  function approveText(compositeKey: string) {
    approvalState[compositeKey] = true
  }

  /** Check if text is approved for a given composite key. */
  function isApproved(compositeKey: string): boolean {
    return approvalState[compositeKey] === true
  }

  function reset() {
    generatedText.data = {}
    isGenerating.value = false
    error.value = null
    rawResponse.value = ''
    for (const key of Object.keys(approvalState)) {
      delete approvalState[key]
    }
  }

  return {
    isGenerating,
    error,
    generatedText,
    rawResponse,
    approvalState,
    setGeneratedText,
    updateField,
    mergeGeneratedText,
    removeStepText,
    getGeneratedText,
    approveText,
    isApproved,
    reset,
  }
}
