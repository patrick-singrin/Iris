import type { LLMProvider, GenerationParams, GenerationResult } from './types'
import { parseGeneratedText } from './responseParser'

export class LMStudioProvider implements LLMProvider {
  endpoint: string

  constructor(endpoint: string) {
    this.endpoint = endpoint
  }

  async generateText(params: GenerationParams): Promise<GenerationResult> {
    // In dev mode, use the Vite proxy to avoid CORS issues with local LM Studio
    const baseUrl = import.meta.env.DEV
      ? '/api/lmstudio/v1'
      : `${this.endpoint.replace(/\/$/, '')}`

    const url = `${baseUrl}/chat/completions`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`LM Studio API error (${response.status}): ${errorBody}`)
    }

    const data = await response.json()
    const rawText = data.choices?.[0]?.message?.content || ''

    return {
      rawResponse: rawText,
      parsedFields: parseGeneratedText(rawText),
    }
  }
}
