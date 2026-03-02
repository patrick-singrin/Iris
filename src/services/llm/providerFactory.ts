import type { LLMProvider } from './types'
import { AnthropicProvider } from './anthropicProvider'
import { LMStudioProvider } from './lmStudioProvider'
import { LLMHubProvider } from './llmHubProvider'
import { useSettingsStore } from '@/stores/settingsStore'

export function createProvider(): LLMProvider {
  const { state } = useSettingsStore()

  if (state.provider === 'anthropic') {
    if (!state.anthropicApiKey) {
      throw new Error('Anthropic API key is not configured. Go to Settings to add your API key.')
    }
    return new AnthropicProvider(state.anthropicApiKey, state.anthropicModel)
  }

  if (state.provider === 'llmhub') {
    if (!state.llmHubApiKey) {
      throw new Error('LLMHub API key is not configured. Go to Settings to add your API key.')
    }
    return new LLMHubProvider(state.llmHubEndpoint, state.llmHubApiKey, state.llmHubModel)
  }

  return new LMStudioProvider(state.lmStudioEndpoint)
}
