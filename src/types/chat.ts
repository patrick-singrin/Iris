export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  followUps?: string[]
}

export type ChecklistCategory = 'content-type' | 'context' | 'preferences'

export interface ChecklistItem {
  id: string
  category: ChecklistCategory
  label: string
  description: string
  detected: boolean
  keywords: string[]
}
