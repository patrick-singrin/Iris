import { describe, it, expect, vi } from 'vitest'

// Mock settingsStore to avoid localStorage access at module load time
vi.mock('@/stores/settingsStore', () => ({
  useSettingsStore: () => ({
    state: {
      provider: 'lmstudio',
      anthropicApiKey: '',
      anthropicModel: 'claude-sonnet-4-20250514',
      lmStudioEndpoint: 'http://localhost:1234/v1',
    },
  }),
}))

import {
  parseAnalysisResponse,
  parseTextAnalysisResponse,
  salvageNarrative,
} from '../storyExtractor'
import type { StoryChecklistItem } from '@/data/story-questions'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeItem(id: string, overrides: Partial<StoryChecklistItem> = {}): StoryChecklistItem {
  return {
    id,
    label: id,
    confirmLabel: `Confirm ${id}`,
    category: 'what',
    filled: false,
    value: null,
    description: null,
    evidence: null,
    source: null,
    verified: false,
    ...overrides,
  }
}

function makeChecklist(ids: string[] = ['event_kind', 'what_happened', 'timing', 'user_impact', 'who_affected', 'action_required', 'what_to_do', 'security', 'error_location', 'impact_scope', 'field_context']): StoryChecklistItem[] {
  return ids.map(id => makeItem(id))
}

// ---------------------------------------------------------------------------
// salvageNarrative
// ---------------------------------------------------------------------------

describe('salvageNarrative', () => {
  it('returns null for empty or very short input', () => {
    expect(salvageNarrative('')).toBeNull()
    expect(salvageNarrative('short')).toBeNull()
    expect(salvageNarrative('less than twenty')).toBeNull()
  })

  it('extracts story field from broken JSON', () => {
    const raw = '{"items":[{"id":"event_kind","value":"system_change"...TRUNCATED, "story": "What:\\nScheduled maintenance on the API gateway.\\n\\nWhen:\\nSaturday 10:00–12:00 CET"}'
    const result = salvageNarrative(raw)
    expect(result).toContain('What:')
    expect(result).toContain('Scheduled maintenance')
  })

  it('extracts W-heading narrative from non-JSON response', () => {
    const raw = `Here is the analysis:

What:
The login service will undergo scheduled maintenance.

Who:
All users of the customer portal.

When:
Saturday March 15, 09:00–11:00 CET.`

    const result = salvageNarrative(raw)
    expect(result).toContain('What:')
    expect(result).toContain('login service')
    expect(result).toContain('Who:')
    expect(result).toContain('When:')
  })

  it('strips markdown code fences', () => {
    const raw = '```\nWhat:\nAPI key rotation scheduled for all tenants.\n```'
    const result = salvageNarrative(raw)
    expect(result).toContain('What:')
    expect(result).toContain('API key rotation')
  })

  it('strips JSON-like prefix before W-headings', () => {
    // Simulate partially corrupted JSON where the story is embedded but the JSON is broken
    const raw = '{"items":[BROKEN_JSON..., "story": "What:\\nMaintenance is happening.\\n\\nWho:\\nAll users."'
    const result = salvageNarrative(raw)
    // salvageNarrative should extract via the "story" regex or W-heading detection
    expect(result).not.toBeNull()
  })

  it('returns null for pure JSON with no narrative', () => {
    const raw = '{"items":[{"id":"event_kind","value":"system_change","description":"API update","evidence":"rotating keys"}]}'
    const result = salvageNarrative(raw)
    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// parseAnalysisResponse
// ---------------------------------------------------------------------------

describe('parseAnalysisResponse', () => {
  it('parses valid JSON with items and story', () => {
    const raw = JSON.stringify({
      items: [
        { id: 'event_kind', value: 'system_change', description: 'API update', evidence: 'rotating keys' },
      ],
      story: 'What:\nAPI keys are being rotated.',
    })
    const checklist = makeChecklist()

    const result = parseAnalysisResponse(raw, checklist)
    expect(result.error).toBeNull()
    expect(result.items).toHaveLength(1)
    expect(result.items[0]!.id).toBe('event_kind')
    expect(result.items[0]!.value).toBe('system_change')
    expect(result.story).toContain('What:')
  })

  it('rejects items with unknown IDs', () => {
    const raw = JSON.stringify({
      items: [
        { id: 'nonexistent_field', value: 'foo', description: 'x', evidence: 'y' },
        { id: 'event_kind', value: 'system_change', description: 'x', evidence: 'y' },
      ],
      story: 'What:\nTest',
    })
    const checklist = makeChecklist()

    const result = parseAnalysisResponse(raw, checklist)
    expect(result.items).toHaveLength(1)
    expect(result.items[0]!.id).toBe('event_kind')
  })

  it('rejects items with disallowed enum values', () => {
    const raw = JSON.stringify({
      items: [
        { id: 'event_kind', value: 'invalid_type', description: 'x', evidence: 'y' },
        { id: 'timing', value: 'now', description: 'x', evidence: 'y' },
      ],
      story: 'What:\nTest',
    })
    const checklist = makeChecklist()

    const result = parseAnalysisResponse(raw, checklist)
    expect(result.items).toHaveLength(1)
    expect(result.items[0]!.id).toBe('timing')
  })

  it('rejects items without value or evidence', () => {
    const raw = JSON.stringify({
      items: [
        { id: 'event_kind', value: 'system_change', description: 'x', evidence: '' },
        { id: 'timing', value: '', description: 'x', evidence: 'some evidence' },
      ],
      story: 'What:\nTest',
    })
    const checklist = makeChecklist()

    const result = parseAnalysisResponse(raw, checklist)
    expect(result.items).toHaveLength(0)
  })

  it('skips already-verified items', () => {
    const raw = JSON.stringify({
      items: [
        { id: 'event_kind', value: 'system_change', description: 'x', evidence: 'y' },
      ],
      story: 'What:\nTest',
    })
    const checklist = makeChecklist()
    // Mark event_kind as verified
    const kindItem = checklist.find(i => i.id === 'event_kind')!
    kindItem.filled = true
    kindItem.verified = true
    kindItem.value = 'error_issue'

    const result = parseAnalysisResponse(raw, checklist)
    expect(result.items).toHaveLength(0)
  })

  it('accepts items for unverified (LLM-extracted) fields', () => {
    const raw = JSON.stringify({
      items: [
        { id: 'event_kind', value: 'system_change', description: 'x', evidence: 'y' },
      ],
      story: 'What:\nTest',
    })
    const checklist = makeChecklist()
    // Mark as filled but unverified (LLM-sourced)
    const kindItem = checklist.find(i => i.id === 'event_kind')!
    kindItem.filled = true
    kindItem.verified = false
    kindItem.value = 'error_issue'

    const result = parseAnalysisResponse(raw, checklist)
    expect(result.items).toHaveLength(1)
  })

  it('handles story as object (LLM quirk)', () => {
    const raw = JSON.stringify({
      items: [],
      story: { headline: 'Important Update', content: ['Users need to rotate keys.'] },
    })
    const checklist = makeChecklist()

    const result = parseAnalysisResponse(raw, checklist)
    expect(result.story).toContain('Important Update')
    expect(result.story).toContain('Users need to rotate keys.')
  })

  it('handles empty items array', () => {
    const raw = JSON.stringify({ items: [], story: 'What:\nNothing extracted.' })
    const checklist = makeChecklist()

    const result = parseAnalysisResponse(raw, checklist)
    expect(result.items).toHaveLength(0)
    expect(result.story).toContain('What:')
    expect(result.error).toBeNull()
  })

  it('returns error and salvaged story on total parse failure with W-headings', () => {
    const raw = 'Sure, here is the analysis:\nWhat:\nThe API will be down for maintenance.\n\nWhen:\nSaturday.'
    const checklist = makeChecklist()

    const result = parseAnalysisResponse(raw, checklist)
    expect(result.error).toBe('Failed to parse response')
    expect(result.items).toHaveLength(0)
    // Graceful degradation should salvage the narrative
    expect(result.story).toContain('What:')
    expect(result.story).toContain('maintenance')
  })

  it('returns null story on total parse failure without salvageable narrative', () => {
    const raw = 'random garbage output with no structure at all and nothing useful'
    const checklist = makeChecklist()

    const result = parseAnalysisResponse(raw, checklist)
    expect(result.error).toBe('Failed to parse response')
    expect(result.items).toHaveLength(0)
    expect(result.story).toBeNull()
  })

  it('fills in missing description with empty string', () => {
    const raw = JSON.stringify({
      items: [
        { id: 'what_happened', value: 'API down', evidence: 'user said API is down' },
      ],
      story: 'What:\nTest',
    })
    const checklist = makeChecklist()

    const result = parseAnalysisResponse(raw, checklist)
    expect(result.items).toHaveLength(1)
    expect(result.items[0]!.description).toBe('')
  })

  it('allows free-text fields to have any value', () => {
    const raw = JSON.stringify({
      items: [
        { id: 'what_happened', value: 'Anything goes here since this is free text', description: 'x', evidence: 'y' },
      ],
      story: 'What:\nTest',
    })
    const checklist = makeChecklist()

    const result = parseAnalysisResponse(raw, checklist)
    expect(result.items).toHaveLength(1)
    expect(result.items[0]!.value).toBe('Anything goes here since this is free text')
  })
})

// ---------------------------------------------------------------------------
// parseTextAnalysisResponse
// ---------------------------------------------------------------------------

describe('parseTextAnalysisResponse', () => {
  it('parses valid JSON with items', () => {
    const raw = JSON.stringify({
      items: [
        { id: 'event_kind', value: 'system_change', description: 'API update', evidence: 'rotating keys' },
        { id: 'what_happened', value: 'API key rotation', description: 'key rotation', evidence: 'rotating all API keys' },
      ],
    })
    const checklist = makeChecklist()

    const result = parseTextAnalysisResponse(raw, checklist)
    expect(result.error).toBeNull()
    expect(result.items).toHaveLength(2)
    expect(result.story).toBeNull() // text analysis never returns a story
  })

  it('accepts items for already-filled fields (re-extraction)', () => {
    const raw = JSON.stringify({
      items: [
        { id: 'event_kind', value: 'system_change', description: 'x', evidence: 'y' },
      ],
    })
    const checklist = makeChecklist()
    // Mark as filled AND verified — text analysis should still accept it
    const kindItem = checklist.find(i => i.id === 'event_kind')!
    kindItem.filled = true
    kindItem.verified = true
    kindItem.value = 'error_issue'

    const result = parseTextAnalysisResponse(raw, checklist)
    expect(result.items).toHaveLength(1)
  })

  it('rejects unknown field IDs', () => {
    const raw = JSON.stringify({
      items: [
        { id: 'unknown_field', value: 'foo', description: 'x', evidence: 'y' },
      ],
    })
    const checklist = makeChecklist()

    const result = parseTextAnalysisResponse(raw, checklist)
    expect(result.items).toHaveLength(0)
  })

  it('rejects items with disallowed enum values', () => {
    const raw = JSON.stringify({
      items: [
        { id: 'user_impact', value: 'catastrophic', description: 'x', evidence: 'y' },
      ],
    })
    const checklist = makeChecklist()

    const result = parseTextAnalysisResponse(raw, checklist)
    expect(result.items).toHaveLength(0)
  })

  it('returns error on unparseable input', () => {
    const raw = 'totally broken garbage'
    const checklist = makeChecklist()

    const result = parseTextAnalysisResponse(raw, checklist)
    expect(result.error).toBe('Failed to parse response')
    expect(result.items).toHaveLength(0)
    expect(result.story).toBeNull()
  })
})
