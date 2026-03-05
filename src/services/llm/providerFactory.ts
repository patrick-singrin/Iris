import type { LLMProvider } from './types'
import { AnthropicProvider } from './anthropicProvider'
import { LMStudioProvider } from './lmStudioProvider'
import { LLMHubProvider } from './llmHubProvider'
import { ConnectionProvider } from './connectionProvider'
import { useSettingsStore } from '@/stores/settingsStore'
import { useConnectionsStore } from '@/stores/connectionsStore'

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

/**
 * Creates an LLM provider for the classifier/extractor.
 * Uses the classifier-specific connection+model override if configured,
 * otherwise falls back to the global provider.
 */
export function createClassifierProvider(): LLMProvider {
  const { state } = useSettingsStore()

  if (state.classifierConnectionId && state.classifierModelId) {
    const { getConnection } = useConnectionsStore()
    const conn = getConnection(state.classifierConnectionId)
    if (conn) {
      return new ConnectionProvider(conn.endpoint, conn.apiKey, state.classifierModelId)
    }
  }

  return createProvider()
}
