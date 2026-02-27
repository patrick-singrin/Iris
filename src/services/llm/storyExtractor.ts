/**
 * Story Extractor — uses the LLM to aggressively extract checklist information
 * from user input AND compose a polished event story.
 *
 * After each answer, the full conversation context is sent to the LLM which:
 *   1. Scans for ANY checklist item values in the conversation
 *   2. Composes a refined user-facing notification narrative
 *
 * Extracted items are stored as unverified — the user must confirm each one.
 */

import { createProvider } from './providerFactory'
import { robustJsonParse } from './jsonRepair'
import { FIELD_ALLOWED_VALUES } from '@/data/story-classification'
import type { StoryChecklistItem } from '@/data/story-questions'
import { useProductContextStore } from '@/stores/productContextStore'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExtractedItem {
  id: string
  value: string
  description: string
  evidence: string
}

export interface StoryAnalysisResult {
  items: ExtractedItem[]
  story: string | null
  error: string | null
}

export interface ConversationEntry {
  question: string
  selectedOptions: string[]
  freeformText: string
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

function buildSystemPrompt(checklist: StoryChecklistItem[], productContext?: string | null): string {
  const itemDescriptions = checklist.map(item => {
    const allowed = FIELD_ALLOWED_VALUES[item.id]
    const constraint = allowed
      ? ` (MUST be one of: ${allowed.join(', ')})`
      : ' (free text)'

    let status: string
    if (item.filled && item.verified) {
      status = `VERIFIED: ${item.value}`
    } else if (item.filled && !item.verified) {
      status = `UNVERIFIED: ${item.value}`
    } else {
      status = 'EMPTY'
    }

    return `  - "${item.id}" (${item.label})${constraint} → ${status}`
  }).join('\n')

  let prompt = `You are an assistant for a product communication tool. Teams use this tool to create clear, actionable event notifications for end users — from incident alerts to maintenance announcements.

Your goal is to extract information that is USEFUL FOR WRITING USER-FACING COMMUNICATION, not just to classify keywords.

You have two jobs:

## Job 1: Extract checklist information
Scan the conversation for information matching the checklist items below. Think about what each field means for the final notification text that end users will read.

Checklist items:
${itemDescriptions}

### Extraction rules

GENERAL:
- ONLY extract items that are currently EMPTY (not verified or unverified).
- For fields with allowed values, use EXACTLY one of the listed values.
- The "evidence" MUST be the exact phrase from the user's input that supports your extraction.
- Be aggressive but accurate: extract everything clearly stated or strongly implied.
- If the user mentions "all users" or similar broad scope, extract both who_affected AND impact_scope.
- If the user mentions a date or time, extract timing.
- If the user mentions something users need to do, extract action_required AND what_to_do.

USER IMPACT CALIBRATION — choose carefully between "blocked", "degraded", and "no_impact":
- "blocked" = the core workflow is completely unavailable. Users CANNOT perform the primary action at all.
  Examples: login page returns 500 errors → blocked. Payment system is down, no orders can be placed → blocked. Database is offline, app shows error page → blocked.
- "degraded" = users CAN still work, but with reduced quality, speed, or partial functionality loss.
  Examples: search is slow but returns results → degraded. Some dashboard widgets fail to load but others work → degraded. File uploads work but are limited to 5 MB instead of 50 MB → degraded. One API endpoint is down but the rest work → degraded.
- "no_impact" = no effect on current user workflows. Informational only.
  Examples: scheduled maintenance next week → no_impact. New feature announcement → no_impact. Internal process change with no user-visible effect → no_impact.
- When in doubt between "blocked" and "degraded", ask: "Can the user still accomplish their primary goal, even if slowly or with workarounds?" If yes → "degraded". If no → "blocked".

FREE TEXT FIELDS — preserve the user's specific, actionable language:
- Extract the CONCRETE details: service names, dates, versions, specific actions, URLs.
- Do NOT summarize into abstract labels or meta-descriptions.
- The value should be usable as-is in a user-facing notification.
  BAD:  what_to_do = "user action steps after rotation" (this is a meta-description, not an instruction)
  GOOD: what_to_do = "Rotate your API keys in the admin panel before March 31"
  BAD:  what_happened = "login API error situation" (vague label)
  GOOD: what_happened = "The login API is returning 500 errors, preventing users from logging in"
  BAD:  who_affected = "affected user base" (meaningless)
  GOOD: who_affected = "All users of the MagentaCLOUD service"

DESCRIPTION FIELD — explain what was extracted so a human can verify it:
- The description is shown to the user for confirmation. It must be clear and specific enough for them to judge if the extraction is correct.
- For CONSTRAINED fields (enums): explain what the classification means in this specific situation.
  BAD:  action_required = "mandatory", description = "prevent access disruption" (vague, doesn't say what action)
  GOOD: action_required = "mandatory", description = "Users must rotate API keys before March 31"
  BAD:  timing = "now", description = "current situation" (obvious, adds nothing)
  GOOD: timing = "now", description = "Outage ongoing since 10:00 CET"
  BAD:  user_impact = "blocked", description = "service unavailable" (generic)
  GOOD: user_impact = "blocked", description = "Users cannot log in to the system"
- For FREE TEXT fields: the description MUST be a shorter version of the value itself — same nouns, same verbs, same specifics. It must NOT be a meta-description about the value.
  RULE: If the value says "Regenerate API keys in the developer portal before March 31", the description must also mention "regenerate", "API keys", and "March 31" — NOT say "concrete action required" or "required steps".
  BAD:  what_to_do, description = "required steps" ← REJECTED (meta-label)
  BAD:  what_to_do, description = "Concrete action required for users to avoid disruption" ← REJECTED (describes the value instead of repeating its content)
  GOOD: what_to_do, description = "Regenerate API keys in the developer portal before March 31"
  BAD:  who_affected, description = "Audience of users affected by the change" ← REJECTED (meta)
  GOOD: who_affected, description = "All users with active API integrations for MagentaCLOUD"

## Job 2: Compose the event narrative
Write a structured event narrative using the W-heading format below. Use the REAL, CONCRETE details the user provided — do NOT replace them with placeholders or abstract them. The narrative should read like a clear, specific event description.

Format:
What:
<1-2 sentences describing what is happening>

Who:
<1 sentence about who is affected and how>

When:
<1 sentence about timing>

What to do:
<1 sentence about what users should do>

Rules:
- ALWAYS return a story string. Never empty.
- Use EXACTLY the section headings shown above: "What:", "Who:", "When:", "What to do:"
- Each heading MUST be on its own line, followed by a newline, then the paragraph text.
- Separate sections with a blank line between them.
- Address end users directly. Be concise and actionable.
- Only include facts from the conversation. Do NOT invent details.
- Omit a section entirely if there is no information for it (but "What:" should almost always be present).
- Keep the user's specific details (service names, dates, times, versions, etc.) as-is. Do NOT replace them with {placeholders} — placeholders will be applied later in a separate step.
- If the user already provided {placeholders} in their input, keep them as-is.

## Response format
Return ONLY valid JSON, no markdown fences, no explanation:
{"items":[{"id":"field_id","value":"extracted_value","description":"clear verification summary","evidence":"exact quote from user"}],"story":"What:\\n<text>\\n\\nWho:\\n<text>\\n\\nWhen:\\n<text>\\n\\nWhat to do:\\n<text>"}

CRITICAL: "story" MUST be a plain string (not an object) using \\n for newlines and the W-heading structure.
If no new items found, return empty items array but STILL return a story.`

  if (productContext) {
    prompt += `\n\n## Product Context\nThe following product-specific context should inform your extraction. Use it to understand domain terminology, product voice, and specific rules.\n\n${productContext}`
  }
  return prompt
}

// ---------------------------------------------------------------------------
// Build user message from conversation
// ---------------------------------------------------------------------------

function buildUserMessage(conversation: ConversationEntry[]): string {
  if (conversation.length === 0) return '(no answers yet)'

  return conversation.map((entry, i) => {
    const parts = [`Q${i + 1}: ${entry.question}`]
    if (entry.selectedOptions.length > 0) {
      parts.push(`Selected: ${entry.selectedOptions.join(', ')}`)
    }
    if (entry.freeformText) {
      parts.push(`Answer: ${entry.freeformText}`)
    }
    return parts.join('\n')
  }).join('\n\n')
}

// ---------------------------------------------------------------------------
// Retry helper for transient failures (429 rate limits, network blips)
// ---------------------------------------------------------------------------

const MAX_RETRIES = 2
const RETRY_DELAYS = [1500, 3000] // ms

function isTransientError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const msg = err.message
  // Rate limit (429) or server overloaded (529) or network failures
  return /\b(429|529|overloaded|rate.?limit|network|fetch|ECONNREFUSED|ECONNRESET|ETIMEDOUT)\b/i.test(msg)
}

async function callWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (attempt < MAX_RETRIES && isTransientError(err)) {
        console.warn(`[storyExtractor] Transient error, retrying in ${RETRY_DELAYS[attempt]}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`)
        await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]))
        continue
      }
      throw err
    }
  }
  throw lastErr
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// Exported for testing — these are implementation details but need direct unit tests
export { parseAnalysisResponse, parseTextAnalysisResponse, salvageNarrative }

export async function analyzeConversation(
  conversation: ConversationEntry[],
  checklist: StoryChecklistItem[],
): Promise<StoryAnalysisResult> {
  if (conversation.length === 0) {
    return { items: [], story: null, error: null }
  }

  try {
    const { getProductContext } = useProductContextStore()
    const productContext = await getProductContext()
    const provider = createProvider()
    const result = await callWithRetry(() => provider.generateText({
      systemPrompt: buildSystemPrompt(checklist, productContext),
      userPrompt: buildUserMessage(conversation),
      maxTokens: 4096,
    }))

    return parseAnalysisResponse(result.rawResponse, checklist)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown extraction error'
    console.warn('[storyExtractor] LLM analysis failed:', message)
    return { items: [], story: null, error: message }
  }
}

/**
 * Analyze raw narrative text (e.g. user-edited story) for checklist extraction.
 * Unlike analyzeConversation, this also re-evaluates already-filled items
 * because the user may have changed information in the text.
 */
export async function analyzeText(
  text: string,
  checklist: StoryChecklistItem[],
): Promise<StoryAnalysisResult> {
  if (!text.trim()) {
    return { items: [], story: null, error: null }
  }

  try {
    const { getProductContext } = useProductContextStore()
    const productContext = await getProductContext()
    const provider = createProvider()
    const result = await callWithRetry(() => provider.generateText({
      systemPrompt: buildTextAnalysisPrompt(checklist, productContext),
      userPrompt: text,
      maxTokens: 4096,
    }))

    return parseTextAnalysisResponse(result.rawResponse, checklist)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown extraction error'
    console.warn('[storyExtractor] Text analysis failed:', message)
    return { items: [], story: null, error: message }
  }
}

function buildTextAnalysisPrompt(checklist: StoryChecklistItem[], productContext?: string | null): string {
  const itemDescriptions = checklist.map(item => {
    const allowed = FIELD_ALLOWED_VALUES[item.id]
    const constraint = allowed
      ? ` (MUST be one of: ${allowed.join(', ')})`
      : ' (free text)'

    let status: string
    if (item.filled) {
      status = `CURRENT: ${item.value}`
    } else {
      status = 'EMPTY'
    }

    return `  - "${item.id}" (${item.label})${constraint} → ${status}`
  }).join('\n')

  let prompt = `You are an assistant for a product communication tool. Teams use this tool to create clear, actionable event notifications for end users.

You have one job: Extract checklist information from a user-edited event narrative.

The user has manually edited their event story text. Scan it for ANY information that matches the checklist items below. Think about what each field means for the final notification text.

Checklist items:
${itemDescriptions}

Rules for extraction:
- Extract ALL items you can identify, including ones that already have a value (the user may have changed information).
- For fields with allowed values, use EXACTLY one of the listed values.
- For free text fields, preserve the user's specific, actionable language — service names, dates, concrete steps. Do NOT abstract into vague labels.
- For EVERY item, provide a "description" that is clear enough for a human to verify the extraction:
  - For constrained fields: explain what the classification means in this specific situation (e.g., "Users cannot access the portal" not just "service unavailable")
  - For free text fields: the description MUST be a shorter version of the value — same nouns, same verbs, same specifics. If the value says "Regenerate API keys before March 31", the description must also say "regenerate" and "API keys" — NOT "concrete action required" or "required steps".
- The "evidence" MUST be the exact phrase from the text that supports your extraction.
- Be aggressive but accurate: extract everything clearly stated or strongly implied.

## Response format
Return ONLY valid JSON, no markdown fences, no explanation:
{"items":[{"id":"field_id","value":"extracted_value","description":"clear verification summary","evidence":"exact quote from text"}]}

If no items found, return {"items":[]}`

  if (productContext) {
    prompt += `\n\n## Product Context\nThe following product-specific context should inform your extraction. Use it to understand domain terminology, product voice, and specific rules.\n\n${productContext}`
  }
  return prompt
}

// ---------------------------------------------------------------------------
// Graceful degradation: salvage narrative from unparseable LLM output
// ---------------------------------------------------------------------------

/**
 * When JSON parse fails completely, try to extract a usable narrative from
 * the raw LLM text. If the response contains W-headings (What:/Who:/When:/
 * What to do:) or at least looks like prose, return it as a fallback story.
 */
function salvageNarrative(raw: string): string | null {
  if (!raw || raw.length < 20) return null

  // Strip markdown code fences if present
  let text = raw.replace(/^```(?:json)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim()

  // If it looks like a JSON blob with a story field, try to extract just the story
  const storyMatch = text.match(/"story"\s*:\s*"((?:[^"\\]|\\.)*)"/s)
  if (storyMatch) {
    try {
      const decoded = JSON.parse(`"${storyMatch[1]}"`) as string
      if (decoded.length > 20) return decoded
    } catch { /* fall through */ }
  }

  // If the text contains W-headings, it's likely a narrative the LLM wrote outside JSON
  if (/^What:/m.test(text)) {
    // Strip any JSON-like prefix (e.g. `{"items":[],"story":"`) before the narrative
    const whatIdx = text.indexOf('What:')
    if (whatIdx > 0) {
      text = text.substring(whatIdx)
    }
    // Strip any trailing JSON artifacts
    text = text.replace(/["\s,}]+$/, '').trim()
    if (text.length > 20) return text
  }

  return null
}

// ---------------------------------------------------------------------------
// Response parsing
// ---------------------------------------------------------------------------

/** Parse response for text analysis — accepts items for ALL fields (not just empty) */
function parseTextAnalysisResponse(
  raw: string,
  checklist: StoryChecklistItem[],
): StoryAnalysisResult {
  try {
    const parsed = robustJsonParse(raw)
    const items: ExtractedItem[] = (parsed.items as ExtractedItem[]) || []

    const knownIds = new Set(checklist.map(i => i.id))

    const validItems = items
      .map(item => ({ ...item, description: item.description || '' }))
      .filter(item => {
        if (!knownIds.has(item.id)) return false
        if (!item.value || !item.evidence) return false

        const allowed = FIELD_ALLOWED_VALUES[item.id]
        if (allowed && !allowed.includes(item.value)) return false

        return true
      })

    return { items: validItems, story: null, error: null }
  } catch {
    console.warn('[storyExtractor] Failed to parse text analysis response:', raw.substring(0, 200))
    return { items: [], story: null, error: 'Failed to parse response' }
  }
}

function parseAnalysisResponse(
  raw: string,
  checklist: StoryChecklistItem[],
): StoryAnalysisResult {
  try {
    const parsed = robustJsonParse(raw)
    const items: ExtractedItem[] = (parsed.items as ExtractedItem[]) || []

    // Ensure story is always a plain string (LLM sometimes returns objects)
    let story: string | null = null
    if (typeof parsed.story === 'string' && parsed.story.trim()) {
      story = parsed.story.trim()
    } else if (parsed.story && typeof parsed.story === 'object') {
      const storyObj = parsed.story as Record<string, unknown>
      const parts: string[] = []
      if (storyObj.headline) parts.push(String(storyObj.headline))
      if (Array.isArray(storyObj.content)) {
        parts.push(...storyObj.content.map(String))
      } else if (typeof storyObj.content === 'string') {
        parts.push(storyObj.content)
      }
      story = parts.join('\n\n') || null
    }

    // Only accept items for EMPTY (unfilled) or unverified fields
    const extractableIds = new Set(
      checklist.filter(i => !i.filled || (i.filled && !i.verified)).map(i => i.id),
    )

    const validItems = items
      .map(item => ({ ...item, description: item.description || '' }))
      .filter(item => {
        if (!extractableIds.has(item.id)) return false
        if (!item.value || !item.evidence) return false

        const allowed = FIELD_ALLOWED_VALUES[item.id]
        if (allowed && !allowed.includes(item.value)) return false

        return true
      })

    return { items: validItems, story, error: null }
  } catch (err) {
    console.warn('[storyExtractor] All parse strategies failed:', err instanceof Error ? err.message : String(err))
    console.warn('[storyExtractor] Raw response (first 300):', raw.substring(0, 300))

    // Graceful degradation: if the raw text looks like a narrative (has W-headings
    // or at least a few sentences), use it as the story even though JSON parse failed.
    const salvaged = salvageNarrative(raw)
    return { items: [], story: salvaged, error: 'Failed to parse response' }
  }
}
