import type { GeneratedText } from './event'

export interface GenerationParams {
  systemPrompt: string
  userPrompt: string
  maxTokens?: number
}

export interface GenerationResult {
  rawResponse: string
  parsedFields: GeneratedText | null
}

export interface LLMProvider {
  generateText(params: GenerationParams): Promise<GenerationResult>
}
