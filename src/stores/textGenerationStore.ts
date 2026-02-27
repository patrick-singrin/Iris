import { reactive, ref } from 'vue'
import type { GeneratedText } from '@/types/event'

const isGenerating = ref(false)
const error = ref<string | null>(null)
const generatedText = reactive<{ data: GeneratedText }>({ data: {} })
const rawResponse = ref('')

export function useTextGenerationStore() {
  function setGeneratedText(text: GeneratedText) {
    generatedText.data = text
  }

  function updateField(componentId: string, fieldId: string, lang: 'en' | 'de', value: string) {
    if (!generatedText.data[componentId]) {
      generatedText.data[componentId] = {}
    }
    if (!generatedText.data[componentId][fieldId]) {
      generatedText.data[componentId][fieldId] = { en: '', de: '' }
    }
    generatedText.data[componentId][fieldId][lang] = value
  }

  function mergeGeneratedText(componentId: string, data: Record<string, { en: string; de: string }>) {
    generatedText.data[componentId] = data
  }

  function getGeneratedText(): GeneratedText {
    return { ...generatedText.data }
  }

  function reset() {
    generatedText.data = {}
    isGenerating.value = false
    error.value = null
    rawResponse.value = ''
  }

  return {
    isGenerating,
    error,
    generatedText,
    rawResponse,
    setGeneratedText,
    updateField,
    mergeGeneratedText,
    getGeneratedText,
    reset,
  }
}
