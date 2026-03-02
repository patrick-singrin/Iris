import { reactive, watch } from 'vue'

export type LLMProviderType = 'anthropic' | 'lmstudio' | 'llmhub'

export interface SettingsState {
  provider: LLMProviderType
  anthropicApiKey: string
  anthropicModel: string
  lmStudioEndpoint: string
  llmHubEndpoint: string
  llmHubApiKey: string
  llmHubModel: string
}

const STORAGE_KEY = 'iris-settings'

function loadSettings(): SettingsState {
  const defaults: SettingsState = {
    provider: 'lmstudio',
    anthropicApiKey: '',
    anthropicModel: 'claude-sonnet-4-20250514',
    lmStudioEndpoint: 'http://localhost:1234/v1',
    llmHubEndpoint: 'https://llm-server.llmhub.t-systems.net/v2',
    llmHubApiKey: '',
    llmHubModel: 'Llama-3.3-70B-Instruct',
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
