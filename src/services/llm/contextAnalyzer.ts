import type { ChecklistItem } from '@/types/chat'

/**
 * Phase 1: Local keyword-based detection (runs instantly before LLM response).
 * Scans the user's message against each checklist item's keywords.
 */
export function detectContextLocally(userMessage: string, items: ChecklistItem[]): string[] {
  const lower = userMessage.toLowerCase()
  const detected: string[] = []

  for (const item of items) {
    if (item.detected) continue
    const match = item.keywords.some(kw => lower.includes(kw.toLowerCase()))
    if (match) {
      detected.push(item.id)
    }
  }

  return detected
}

export interface ContextParseResult {
  detected: string[]
  followUps: string[]
}

/**
 * Phase 2: Parse the hidden context comment from the LLM response.
 * Expected format: <!-- context:{"detected":["ui_element"],"followups":["Question?"]} -->
 */
export function parseContextFromResponse(response: string): ContextParseResult {
  const match = response.match(/<!--\s*context:\s*(\{[\s\S]*?\})\s*-->/)
  if (!match || !match[1]) return { detected: [], followUps: [] }

  try {
    const parsed = JSON.parse(match[1])
    const detected = Array.isArray(parsed.detected)
      ? parsed.detected.filter((id: unknown) => typeof id === 'string')
      : []
    const followUps = Array.isArray(parsed.followups)
      ? parsed.followups.filter((q: unknown) => typeof q === 'string')
      : []
    return { detected, followUps }
  } catch { /* malformed JSON */ }

  return { detected: [], followUps: [] }
}

/**
 * Strip the hidden context comment from the response before displaying to the user.
 * Handles variations: multiline JSON, extra whitespace, not necessarily at end of string.
 */
export function stripContextBlock(response: string): string {
  return response.replace(/\n?<!--\s*context:\s*\{[\s\S]*?\}\s*-->/g, '').trim()
}
