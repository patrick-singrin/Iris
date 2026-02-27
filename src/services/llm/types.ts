import type { GeneratedText } from '@/types/event'

export interface ChatMessageParam {
  role: 'user' | 'assistant'
  content: string
}

export interface GenerationParams {
  systemPrompt: string
  userPrompt: string
  messages?: ChatMessageParam[]
  maxTokens?: number
}

export interface GenerationResult {
  rawResponse: string
  parsedFields: GeneratedText | null
}

export interface LLMProvider {
  generateText(params: GenerationParams): Promise<GenerationResult>
}
