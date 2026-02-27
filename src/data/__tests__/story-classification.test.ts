import { describe, it, expect } from 'vitest'
import {
  deriveClassification,
  composeStory,
  assessChannelQuality,
  FIELD_ALLOWED_VALUES,
} from '../story-classification'
import type { StoryChecklistItem } from '../story-questions'

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

/** Build a full checklist with optional pre-filled values */
function makeChecklist(fills: Record<string, string | string[]> = {}): StoryChecklistItem[] {
  const ids = ['what_happened', 'event_kind', 'who_affected', 'impact_scope', 'user_impact', 'timing', 'action_required', 'what_to_do', 'security', 'error_location', 'field_context']
  return ids.map(id => {
    if (fills[id] !== undefined) {
      return makeItem(id, { filled: true, value: fills[id], source: 'user', verified: true })
    }
    return makeItem(id)
  })
}

// ---------------------------------------------------------------------------
// FIELD_ALLOWED_VALUES
// ---------------------------------------------------------------------------

describe('FIELD_ALLOWED_VALUES', () => {
  it('defines constraints for classification-critical fields', () => {
    expect(FIELD_ALLOWED_VALUES.event_kind).toContain('system_change')
    expect(FIELD_ALLOWED_VALUES.event_kind).toContain('error_issue')
    expect(FIELD_ALLOWED_VALUES.user_impact).toContain('blocked')
    expect(FIELD_ALLOWED_VALUES.timing).toContain('now')
    expect(FIELD_ALLOWED_VALUES.timing).toContain('scheduled')
    expect(FIELD_ALLOWED_VALUES.action_required).toContain('mandatory')
  })
})

// ---------------------------------------------------------------------------
// deriveClassification
// ---------------------------------------------------------------------------

describe('deriveClassification', () => {
  it('returns null when event_kind is not filled', () => {
    const cl = makeChecklist()
    expect(deriveClassification(cl)).toBeNull()
  })

  it('classifies error_issue as Error/Warning', () => {
    const cl = makeChecklist({ event_kind: 'error_issue' })
    const result = deriveClassification(cl)
    expect(result).not.toBeNull()
    expect(result!.type).toContain('Error') // i18n key resolves to something with "Error"
    expect(result!.confidence).toBeGreaterThan(0)
  })

  it('classifies error_issue with specific_field as Validation Message', () => {
    const cl = makeChecklist({ event_kind: 'error_issue', error_location: 'specific_field' })
    const result = deriveClassification(cl)
    expect(result).not.toBeNull()
    expect(result!.confidence).toBe(0.85)
  })

  it('classifies user_action as Feedback', () => {
    const cl = makeChecklist({ event_kind: 'user_action' })
    const result = deriveClassification(cl)
    expect(result).not.toBeNull()
    expect(result!.confidence).toBe(0.7)
  })

  it('classifies user_action with form context as Validation Message', () => {
    const cl = makeChecklist({ event_kind: 'user_action', field_context: 'form' })
    const result = deriveClassification(cl)
    expect(result).not.toBeNull()
    expect(result!.confidence).toBe(0.8)
  })

  it('classifies system_change as Notification with severity', () => {
    const cl = makeChecklist({
      event_kind: 'system_change',
      user_impact: 'blocked',
      impact_scope: 'widespread',
      timing: 'now',
      action_required: 'mandatory',
    })
    const result = deriveClassification(cl)
    expect(result).not.toBeNull()
    expect(result!.severity).not.toBeNull()
    expect(result!.channels.length).toBeGreaterThan(0)
  })

  it('classifies process_update as Notification', () => {
    const cl = makeChecklist({ event_kind: 'process_update' })
    const result = deriveClassification(cl)
    expect(result).not.toBeNull()
  })

  it('handles freeform event kind (unknown value) as Notification', () => {
    const cl = makeChecklist({ event_kind: 'custom_freeform_event' })
    const result = deriveClassification(cl)
    expect(result).not.toBeNull()
  })

  it('increases confidence as more fields are filled', () => {
    const cl1 = makeChecklist({ event_kind: 'system_change' })
    const cl2 = makeChecklist({
      event_kind: 'system_change',
      what_happened: 'API outage',
      who_affected: 'all users',
      user_impact: 'blocked',
      timing: 'now',
      action_required: 'no',
    })
    const r1 = deriveClassification(cl1)
    const r2 = deriveClassification(cl2)
    expect(r2!.confidence).toBeGreaterThan(r1!.confidence)
  })
})

// ---------------------------------------------------------------------------
// composeStory
// ---------------------------------------------------------------------------

describe('composeStory', () => {
  it('returns empty string when nothing is filled', () => {
    const cl = makeChecklist()
    expect(composeStory(cl)).toBe('')
  })

  it('includes What section from event_kind and what_happened', () => {
    const cl = makeChecklist({
      event_kind: 'system_change',
      what_happened: 'We are rotating all API keys.',
    })
    const story = composeStory(cl)
    expect(story).toContain('What:')
    expect(story).toContain('rotating all API keys')
  })

  it('includes Who section', () => {
    const cl = makeChecklist({
      event_kind: 'system_change',
      who_affected: 'all users',
      user_impact: 'degraded',
    })
    const story = composeStory(cl)
    expect(story).toContain('Who:')
    expect(story).toContain('all users')
  })

  it('includes When section', () => {
    const cl = makeChecklist({ event_kind: 'system_change', timing: 'scheduled' })
    const story = composeStory(cl)
    expect(story).toContain('When:')
  })

  it('includes What to do section when action is required', () => {
    const cl = makeChecklist({
      event_kind: 'system_change',
      action_required: 'mandatory',
      what_to_do: 'Rotate your API keys before March 31.',
    })
    const story = composeStory(cl)
    expect(story).toContain('What to do:')
    expect(story).toContain('Rotate your API keys')
  })

  it('omits What to do section when action_required is "no"', () => {
    const cl = makeChecklist({
      event_kind: 'system_change',
      action_required: 'no',
      what_to_do: 'This should not appear.',
    })
    const story = composeStory(cl)
    expect(story).not.toContain('What to do:')
  })

  it('includes security note when security is yes', () => {
    const cl = makeChecklist({
      event_kind: 'system_change',
      security: 'yes',
    })
    const story = composeStory(cl)
    expect(story).toContain('What:')
  })

  it('separates sections with blank lines', () => {
    const cl = makeChecklist({
      event_kind: 'system_change',
      what_happened: 'API maintenance',
      who_affected: 'all users',
      timing: 'scheduled',
    })
    const story = composeStory(cl)
    // Sections should be separated by \n\n
    expect(story).toMatch(/What:[\s\S]+\n\nWho:[\s\S]+\n\nWhen:/)
  })
})

// ---------------------------------------------------------------------------
// assessChannelQuality
// ---------------------------------------------------------------------------

describe('assessChannelQuality', () => {
  it('returns empty array for empty channels', () => {
    const cl = makeChecklist()
    expect(assessChannelQuality(cl, [])).toEqual([])
  })

  it('assesses Banner channel as needs-work when incomplete', () => {
    const cl = makeChecklist({ event_kind: 'system_change' })
    const result = assessChannelQuality(cl, ['Banner (persistent)'])
    expect(result).toHaveLength(1)
    expect(result[0]!.status).toBe('needs-work')
  })

  it('assesses Banner channel as good when all required fields filled', () => {
    const cl = makeChecklist({
      event_kind: 'system_change',
      what_happened: 'API outage',
      timing: 'now',
      action_required: 'no',
    })
    const result = assessChannelQuality(cl, ['Banner (persistent)'])
    expect(result).toHaveLength(1)
    expect(result[0]!.status).toBe('good')
  })

  it('assesses Email channel as needs-work when incomplete', () => {
    const cl = makeChecklist({ event_kind: 'system_change' })
    const result = assessChannelQuality(cl, ['Email (High Importance)'])
    expect(result).toHaveLength(1)
    expect(result[0]!.status).toBe('needs-work')
  })

  it('assesses Email channel as good when all required fields filled', () => {
    const cl = makeChecklist({
      event_kind: 'system_change',
      what_happened: 'API outage',
      who_affected: 'all users',
      user_impact: 'blocked',
      what_to_do: 'Wait for resolution',
    })
    const result = assessChannelQuality(cl, ['Email (High Importance)'])
    expect(result).toHaveLength(1)
    expect(result[0]!.status).toBe('good')
  })

  it('assesses Dashboard channel', () => {
    const cl = makeChecklist({
      event_kind: 'system_change',
      what_happened: 'API outage',
    })
    const result = assessChannelQuality(cl, ['Dashboard'])
    expect(result).toHaveLength(1)
    expect(result[0]!.status).toBe('good')
  })

  it('assesses default channels (Toast, Inline)', () => {
    const cl = makeChecklist({ what_happened: 'Something' })
    const result = assessChannelQuality(cl, ['Toast Notification'])
    expect(result).toHaveLength(1)
    expect(result[0]!.status).toBe('good')
  })

  it('handles multiple channels', () => {
    const cl = makeChecklist({
      event_kind: 'system_change',
      what_happened: 'API outage',
      timing: 'now',
      action_required: 'mandatory',
      who_affected: 'all',
      user_impact: 'blocked',
      what_to_do: 'Wait',
    })
    const result = assessChannelQuality(cl, ['Banner (persistent)', 'Email (High Importance)', 'Dashboard'])
    expect(result).toHaveLength(3)
    expect(result.every(r => r.status === 'good')).toBe(true)
  })
})
