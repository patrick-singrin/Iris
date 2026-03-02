import type { GeneratedText } from './event'

export interface FeedbackMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  hasChanges?: boolean
  /** The structured changes extracted from this message (if any). */
  changes?: GeneratedText | null
  /** Whether the changes from this message have been applied. */
  applied?: boolean
}
