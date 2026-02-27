import type { LLMProvider, GenerationParams, GenerationResult } from './types'
import { parseGeneratedText } from './responseParser'

export class AnthropicProvider implements LLMProvider {
  apiKey: string
  model: string

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey
    this.model = model
  }

  async generateText(params: GenerationParams): Promise<GenerationResult> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: params.maxTokens || 4096,
        system: params.systemPrompt,
        messages: params.messages
          ? params.messages.map(m => ({ role: m.role, content: m.content }))
          : [{ role: 'user' as const, content: params.userPrompt }],
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`Anthropic API error (${response.status}): ${errorBody}`)
    }

    const data = await response.json()
    const rawText = data.content?.[0]?.text || ''

    return {
      rawResponse: rawText,
      parsedFields: parseGeneratedText(rawText),
    }
  }
}
