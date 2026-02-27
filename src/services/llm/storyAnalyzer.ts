/**
 * Story Analyzer — holistic analysis of the complete event context.
 *
 * Unlike the incremental storyExtractor (which focuses on extraction per answer),
 * this module runs a holistic quality check ONCE after all data is collected.
 * It identifies gaps, inconsistencies, and completeness issues that only
 * become visible when viewing the full picture.
 */

import { createProvider } from './providerFactory'
import type { StoryChecklistItem, StoryClassification, ChannelQuality } from '@/data/story-questions'
import type { AnalysisResult } from '@/stores/eventStoryStore'
import { useProductContextStore } from '@/stores/productContextStore'

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

function buildAnalysisPrompt(
  checklist: StoryChecklistItem[],
  storyText: string,
  classification: StoryClassification | null,
  channelQuality: ChannelQuality[],
  productContext?: string | null,
): string {
  const checklistSummary = checklist
    .filter(i => i.filled)
    .map(i => `  - ${i.label}: ${Array.isArray(i.value) ? i.value.join(', ') : i.value} (${i.verified ? 'verified' : 'unverified'})`)
    .join('\n')

  const emptyItems = checklist
    .filter(i => !i.filled)
    .map(i => `  - ${i.label}`)
    .join('\n')

  const classificationSummary = classification
    ? `Type: ${classification.type}\nSeverity: ${classification.severity || 'N/A'}\nChannels: ${classification.channels.join(', ')}\nConfidence: ${Math.round(classification.confidence * 100)}%`
    : 'Not yet derived (insufficient data).'

  const qualitySummary = channelQuality
    .map(q => `  - ${q.channel}: ${q.status === 'good' ? 'Ready' : 'Not ready'} — ${q.message}`)
    .join('\n')

  let prompt = `You are an expert quality reviewer for a product communication tool. Your job is to analyse the COMPLETE context of an event that will be communicated to users, and identify gaps, inconsistencies, or missing information that would reduce the quality of generated UI text.

## Collected Data

### Checklist Items (filled)
${checklistSummary || '(none)'}

### Checklist Items (empty)
${emptyItems || '(none)'}

### Event Narrative
${storyText || '(no narrative yet)'}

### Classification
${classificationSummary}

### Channel Readiness
${qualitySummary || '(no channels assessed yet)'}

## Your Analysis

Check for:
1. **Severity-description coherence**: Does the severity level match the tone and content of the description? A CRITICAL event should not read casually.
2. **Information hierarchy completeness**: For each recommended channel, check if What/Who/When/What-to-do are adequately covered.
3. **Missing context for text generation**: Would the LLM generating UI text need to hallucinate important details?
4. **Consistency between items**: Do the checklist values contradict each other? (e.g., "no impact" but "mandatory action")
5. **Escalation appropriateness**: If timing is "scheduled", suggest escalation if not configured. If there are escalation steps, check the description has timeline specifics.

## Response Format
Return ONLY valid JSON, no markdown fences:
{
  "assessment": "good" | "needs_attention",
  "findings": [
    {
      "category": "coherence|completeness|consistency|escalation",
      "severity": "suggestion|warning",
      "message": "What the issue is (1-2 sentences)",
      "suggestion": "How to fix it (1 sentence)"
    }
  ],
  "followUpQuestions": [
    {
      "id": "followup_1",
      "question": "The question to ask the user",
      "targetChecklistItem": "the_checklist_item_id_to_update",
      "inputType": "freeform"
    }
  ]
}

Rules:
- Maximum 5 findings.
- Maximum 3 follow-up questions.
- Only include follow-up questions for truly important gaps — don't ask about nice-to-haves.
- If everything looks good, return assessment "good" with an empty findings array and empty followUpQuestions.
- Follow-up question targetChecklistItem must be one of: ${checklist.map(i => i.id).join(', ')}.`

  if (productContext) {
    prompt += `\n\n## Product Context\nThe following product-specific context should inform your quality analysis. Use it to evaluate domain accuracy and communication tone.\n\n${productContext}`
  }
  return prompt
}

// ---------------------------------------------------------------------------
// JSON parsing (reuse pattern from storyExtractor)
// ---------------------------------------------------------------------------

function stripMarkdownFences(raw: string): string {
  let str = raw.trim()
  const fenceMatch = str.match(/```(?:json)?\s*([\s\S]*)\s*```\s*$/)
  if (fenceMatch) return fenceMatch[1]!.trim()
  if (str.startsWith('```')) {
    str = str.replace(/^```(?:json)?\s*\n?/, '')
  }
  str = str.replace(/`{1,3}\s*$/, '')
  return str.trim()
}

function tryParseJson(raw: string): AnalysisResult | null {
  try {
    return JSON.parse(raw)
  } catch {
    // Try closing open braces/brackets
    let repaired = raw
    let inString = false
    let escape = false
    let braces = 0
    let brackets = 0
    for (const ch of raw) {
      if (escape) { escape = false; continue }
      if (ch === '\\' && inString) { escape = true; continue }
      if (ch === '"') { inString = !inString; continue }
      if (inString) continue
      if (ch === '{') braces++
      else if (ch === '}') braces--
      else if (ch === '[') brackets++
      else if (ch === ']') brackets--
    }
    if (inString) repaired += '"'
    while (brackets > 0) { repaired += ']'; brackets-- }
    while (braces > 0) { repaired += '}'; braces-- }
    try {
      return JSON.parse(repaired)
    } catch {
      return null
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function runHolisticAnalysis(
  checklist: StoryChecklistItem[],
  storyText: string,
  classification: StoryClassification | null,
  channelQuality: ChannelQuality[],
): Promise<AnalysisResult> {
  const { getProductContext } = useProductContextStore()
  const productContext = await getProductContext()
  const provider = createProvider()
  const result = await provider.generateText({
    systemPrompt: buildAnalysisPrompt(checklist, storyText, classification, channelQuality, productContext),
    userPrompt: 'Analyse the event context above and return your assessment.',
    maxTokens: 2048,
  })

  const jsonStr = stripMarkdownFences(result.rawResponse)
  const parsed = tryParseJson(jsonStr)

  if (!parsed) {
    console.warn('[storyAnalyzer] Failed to parse response:', result.rawResponse.substring(0, 200))
    return { assessment: 'good', findings: [], followUpQuestions: [] }
  }

  // Validate and cap
  const validFindings = (parsed.findings || []).slice(0, 5).map(f => ({
    category: f.category || 'completeness',
    severity: f.severity === 'warning' ? 'warning' as const : 'suggestion' as const,
    message: f.message || '',
    suggestion: f.suggestion || '',
  }))

  const knownIds = new Set(checklist.map(i => i.id))
  const validFollowUps = (parsed.followUpQuestions || []).slice(0, 3).filter(q =>
    q.id && q.question && q.targetChecklistItem && knownIds.has(q.targetChecklistItem),
  ).map(q => ({
    id: q.id,
    question: q.question,
    targetChecklistItem: q.targetChecklistItem,
    inputType: 'freeform' as const,
  }))

  return {
    assessment: parsed.assessment === 'needs_attention' ? 'needs_attention' : 'good',
    findings: validFindings,
    followUpQuestions: validFollowUps,
  }
}
