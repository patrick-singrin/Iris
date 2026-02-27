import { reactive, watch } from 'vue'

export type LLMProviderType = 'anthropic' | 'lmstudio'

export interface SettingsState {
  provider: LLMProviderType
  anthropicApiKey: string
  anthropicModel: string
  lmStudioEndpoint: string
}

const STORAGE_KEY = 'iris-settings'

function loadSettings(): SettingsState {
  const defaults: SettingsState = {
    provider: 'lmstudio',
    anthropicApiKey: '',
    anthropicModel: 'claude-sonnet-4-20250514',
    lmStudioEndpoint: 'http://localhost:1234/v1',
  }
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      return { ...defaults, ...JSON.parse(saved) }
    } catch {
      // ignore corrupt data
    }
  }
  return defaults
}

const state = reactive<SettingsState>(loadSettings())

watch(state, (val) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
}, { deep: true })

export function useSettingsStore() {
  return { state }
}
