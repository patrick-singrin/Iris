import type { LLMProvider } from './types'
import { AnthropicProvider } from './anthropicProvider'
import { LMStudioProvider } from './lmStudioProvider'
import { useSettingsStore } from '@/stores/settingsStore'

export function createProvider(): LLMProvider {
  const { state } = useSettingsStore()

  if (state.provider === 'anthropic') {
    if (!state.anthropicApiKey) {
      throw new Error('Anthropic API key is not configured. Go to Settings to add your API key.')
    }
    return new AnthropicProvider(state.anthropicApiKey, state.anthropicModel)
  }

  return new LMStudioProvider(state.lmStudioEndpoint)
}
