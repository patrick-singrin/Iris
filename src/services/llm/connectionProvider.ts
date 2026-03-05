import type { LLMProvider, GenerationParams, GenerationResult } from './types'
import { parseGeneratedText } from './responseParser'

/**
 * Generic OpenAI-compatible provider that uses a connection's
 * endpoint, API key, and model ID.
 */
export class ConnectionProvider implements LLMProvider {
  private endpoint: string
  private apiKey: string
  private model: string

  constructor(endpoint: string, apiKey: string, model: string) {
    this.endpoint = endpoint.replace(/\/$/, '')
    this.apiKey = apiKey
    this.model = model
  }

  async generateText(params: GenerationParams): Promise<GenerationResult> {
    const url = `${this.endpoint}/chat/completions`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.model,
        messages: params.messages
          ? [
              { role: 'system' as const, content: params.systemPrompt },
              ...params.messages.map(m => ({ role: m.role, content: m.content })),
            ]
          : [
              { role: 'system' as const, content: params.systemPrompt },
              { role: 'user' as const, content: params.userPrompt },
            ],
        max_tokens: params.maxTokens || 4096,
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`Connection API error (${response.status}): ${errorBody}`)
    }

    const data = await response.json()
    const rawText = data.choices?.[0]?.message?.content || ''

    return {
      rawResponse: rawText,
      parsedFields: parseGeneratedText(rawText),
    }
  }
}
