import type { LLMProvider, GenerationParams, GenerationResult } from './types'
import { parseGeneratedText } from './responseParser'

export interface LLMHubModel {
  id: string
  category: 'reasoning' | 'chat'
}

const REASONING_PATTERNS = /R1|o1|o3|o4-|reason|think|QwQ/i

function classifyModel(id: string): 'reasoning' | 'chat' {
  return REASONING_PATTERNS.test(id) ? 'reasoning' : 'chat'
}

export async function fetchLLMHubModels(endpoint: string, apiKey: string): Promise<LLMHubModel[]> {
  const baseUrl = import.meta.env.DEV
    ? '/api/llmhub'
    : endpoint.replace(/\/$/, '')

  const response = await fetch(`${baseUrl}/models`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Failed to fetch models (${response.status}): ${body}`)
  }

  const data = await response.json()
  const models: LLMHubModel[] = (data.data ?? [])
    .filter((m: any) => {
      const type = m.meta_data?.model_type ?? m.object ?? ''
      // Keep LLMs and untyped models, skip embeddings/audio/NLP
      return !type || type === 'LLM' || type === 'model'
    })
    .map((m: any) => ({ id: m.id, category: classifyModel(m.id) }))
    .sort((a: LLMHubModel, b: LLMHubModel) => {
      // Reasoning first, then alphabetical within each group
      if (a.category !== b.category) return a.category === 'reasoning' ? -1 : 1
      return a.id.localeCompare(b.id)
    })

  return models
}

export class LLMHubProvider implements LLMProvider {
  endpoint: string
  apiKey: string
  model: string

  constructor(endpoint: string, apiKey: string, model: string) {
    this.endpoint = endpoint
    this.apiKey = apiKey
    this.model = model
  }

  async generateText(params: GenerationParams): Promise<GenerationResult> {
    // In dev mode, use the Vite proxy to avoid CORS issues
    const baseUrl = import.meta.env.DEV
      ? '/api/llmhub'
      : `${this.endpoint.replace(/\/$/, '')}`

    const url = `${baseUrl}/chat/completions`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
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
      throw new Error(`LLMHub API error (${response.status}): ${errorBody}`)
    }

    const data = await response.json()
    const rawText = data.choices?.[0]?.message?.content || ''

    return {
      rawResponse: rawText,
      parsedFields: parseGeneratedText(rawText),
    }
  }
}
