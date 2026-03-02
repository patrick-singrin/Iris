import type { FeedbackMessage } from '@/types/textFeedback'
import type { GeneratedText } from '@/types/event'
import type { ChatMessageParam } from './types'
import { robustJsonParse } from './jsonRepair'

const MAX_MESSAGES = 20
const CHANGES_MARKER = '---CHANGES---'

/**
 * Serialize GeneratedText into a human-readable block the LLM can reference.
 * Format:
 *   [component_id > field_id]
 *   EN: English text
 *   DE: German text
 */
function serializeGeneratedText(text: GeneratedText): string {
  const lines: string[] = []
  for (const [componentId, fields] of Object.entries(text)) {
    for (const [fieldId, value] of Object.entries(fields)) {
      lines.push(`[${componentId} > ${fieldId}]`)
      lines.push(`EN: ${value.en}`)
      lines.push(`DE: ${value.de}`)
      lines.push('')
    }
  }
  return lines.join('\n')
}

export function buildTextFeedbackSystemPrompt(
  generatedText: GeneratedText,
  narrative: string,
): string {
  const serializedText = serializeGeneratedText(generatedText)

  return `You are a text refinement assistant for event notification copy. The user has generated bilingual (English + German) text for multiple communication channels and wants to refine it based on their feedback.

YOUR TASK:
- Listen to the user's feedback about the generated text
- Respond conversationally explaining what you'll change and why
- Include a ${CHANGES_MARKER} block at the end with the corrected fields as JSON

RULES:
- Only change the specific fields the user asks about
- Preserve character limits (banner ~120 chars, dashboard ~200 chars)
- German text is NEVER a translation of English — write both independently
- Use formal address (Sie) in German
- If the user's feedback applies to multiple channels/components, fix all of them
- If you are unsure what to change, ask for clarification instead of guessing

RESPONSE FORMAT:
First, respond in natural language explaining the changes.
Then, add a line with exactly: ${CHANGES_MARKER}
Then, provide a JSON object with ONLY the changed fields in this structure:
{
  "component_id": {
    "field_id": {
      "en": "corrected English text",
      "de": "corrected German text"
    }
  }
}

If no text changes are needed (e.g., the user is asking a question), respond normally WITHOUT the ${CHANGES_MARKER} block.

CRITICAL OUTPUT RULE:
Whenever you suggest ANY text change — even a single word — you MUST include the ${CHANGES_MARKER} block with the updated JSON.
Never respond with suggested text in your message without also providing the structured JSON block.
Use the exact component and field IDs from the CURRENT GENERATED TEXT below.

EVENT NARRATIVE (context):
${narrative || '(No narrative available)'}

CURRENT GENERATED TEXT:
${serializedText || '(No text generated yet)'}`
}

export function buildTextFeedbackMessages(messages: FeedbackMessage[]): ChatMessageParam[] {
  const recent = messages.slice(-MAX_MESSAGES)
  return recent.map(m => ({
    role: m.role,
    content: m.content,
  }))
}

export interface TextFeedbackParseResult {
  message: string
  changes: GeneratedText | null
}

/**
 * Validate that a parsed object looks like GeneratedText:
 * { componentId: { fieldId: { en: string, de: string } } }
 */
function looksLikeGeneratedText(obj: unknown): obj is GeneratedText {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false
  const entries = Object.entries(obj as Record<string, unknown>)
  if (entries.length === 0) return false

  // Check at least one nested field has the { en, de } shape
  for (const [, fields] of entries) {
    if (!fields || typeof fields !== 'object' || Array.isArray(fields)) continue
    for (const [, value] of Object.entries(fields as Record<string, unknown>)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const v = value as Record<string, unknown>
        if (typeof v.en === 'string' || typeof v.de === 'string') return true
      }
    }
  }
  return false
}

/**
 * Try to extract a JSON changes block from the response using multiple strategies.
 * Returns { message, jsonPart } if found, or null.
 */
function findChangesBlock(rawResponse: string): { message: string; jsonPart: string } | null {
  // Strategy 1: Exact marker
  const exactIndex = rawResponse.indexOf(CHANGES_MARKER)
  if (exactIndex !== -1) {
    return {
      message: rawResponse.slice(0, exactIndex).trim(),
      jsonPart: rawResponse.slice(exactIndex + CHANGES_MARKER.length).trim(),
    }
  }

  // Strategy 2: Case-insensitive / variant markers
  const variantPattern = /^-{2,}\s*CHANGES\s*-{2,}$/im
  const variantMatch = rawResponse.match(variantPattern)
  if (variantMatch && variantMatch.index !== undefined) {
    return {
      message: rawResponse.slice(0, variantMatch.index).trim(),
      jsonPart: rawResponse.slice(variantMatch.index + variantMatch[0].length).trim(),
    }
  }

  // Strategy 3: JSON code block (```json ... ```)
  const codeBlockPattern = /```(?:json)?\s*\n([\s\S]*?)```/g
  let lastMatch: RegExpExecArray | null = null
  let match: RegExpExecArray | null
  while ((match = codeBlockPattern.exec(rawResponse)) !== null) {
    lastMatch = match
  }
  if (lastMatch) {
    const beforeBlock = rawResponse.slice(0, lastMatch.index).trim()
    const afterBlock = rawResponse.slice(lastMatch.index + lastMatch[0].length).trim()
    // Remove the code block from the message text
    const message = (beforeBlock + (afterBlock ? '\n' + afterBlock : '')).trim()
    return { message, jsonPart: lastMatch[1]!.trim() }
  }

  // Strategy 4: Trailing JSON object — find last { ... } that spans to near end of response
  const lastBrace = rawResponse.lastIndexOf('}')
  if (lastBrace !== -1) {
    // Walk backwards to find the matching opening brace
    let depth = 0
    let startIndex = -1
    for (let i = lastBrace; i >= 0; i--) {
      if (rawResponse[i] === '}') depth++
      if (rawResponse[i] === '{') depth--
      if (depth === 0) {
        startIndex = i
        break
      }
    }
    if (startIndex !== -1) {
      const candidateJson = rawResponse.slice(startIndex, lastBrace + 1)
      // Only use if it's a substantial block (not a tiny inline JSON mention)
      if (candidateJson.length > 20) {
        const beforeJson = rawResponse.slice(0, startIndex).trim()
        return { message: beforeJson, jsonPart: candidateJson }
      }
    }
  }

  return null
}

export function parseTextFeedbackResponse(rawResponse: string): TextFeedbackParseResult {
  const found = findChangesBlock(rawResponse)

  if (!found || !found.jsonPart) {
    return { message: rawResponse.trim(), changes: null }
  }

  const parsed = robustJsonParse(found.jsonPart)
  if (looksLikeGeneratedText(parsed)) {
    return { message: found.message || rawResponse.trim(), changes: parsed }
  }

  // JSON parsed but doesn't match the expected shape — return as message only
  return { message: found.message || rawResponse.trim(), changes: null }
}
