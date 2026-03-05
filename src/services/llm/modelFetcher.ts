import type { DiscoveredModel } from '@/types/connection'

const REASONING_PATTERNS = /R1|o1|o3|o4-|reason|think|QwQ/i

function classifyModel(id: string): 'reasoning' | 'chat' {
  return REASONING_PATTERNS.test(id) ? 'reasoning' : 'chat'
}

/**
 * Fetch available models from an OpenAI-compatible /models endpoint.
 * Filters out non-LLM models (embeddings, audio, NLP) and classifies
 * the remainder as reasoning or chat models.
 */
export async function fetchModelsFromEndpoint(
  endpoint: string,
  apiKey?: string,
): Promise<DiscoveredModel[]> {
  const baseUrl = endpoint.replace(/\/$/, '')

  const headers: Record<string, string> = {}
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`
  }

  const response = await fetch(`${baseUrl}/models`, { headers })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Failed to fetch models (${response.status}): ${body}`)
  }

  const data = await response.json()

  const models: DiscoveredModel[] = (data.data ?? [])
    .filter((m: any) => {
      const type = m.meta_data?.model_type ?? m.object ?? ''
      // Keep LLMs and untyped models, skip embeddings/audio/NLP
      return !type || type === 'LLM' || type === 'model'
    })
    .map((m: any) => ({ id: m.id, category: classifyModel(m.id) }))
    .sort((a: DiscoveredModel, b: DiscoveredModel) => {
      if (a.category !== b.category) return a.category === 'reasoning' ? -1 : 1
      return a.id.localeCompare(b.id)
    })

  return models
}
