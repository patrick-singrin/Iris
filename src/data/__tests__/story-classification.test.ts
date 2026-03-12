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
  const ids = ['what_happened', 'event_trigger', 'who_affected', 'impact_scope', 'user_impact', 'timing', 'action_required', 'what_to_do', 'security']
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
    expect(FIELD_ALLOWED_VALUES.event_trigger).toContain('user_interaction')
    expect(FIELD_ALLOWED_VALUES.event_trigger).toContain('system_runtime')
    expect(FIELD_ALLOWED_VALUES.event_trigger).toContain('scheduled_system')
    expect(FIELD_ALLOWED_VALUES.event_trigger).toContain('scheduled_user')
    expect(FIELD_ALLOWED_VALUES.user_impact).toContain('blocked')
    expect(FIELD_ALLOWED_VALUES.timing).toContain('now')
    expect(FIELD_ALLOWED_VALUES.timing).toContain('scheduled')
    expect(FIELD_ALLOWED_VALUES.action_required).toContain('mandatory')
    expect(FIELD_ALLOWED_VALUES.action_required).toContain('no')
  })

  it('does not include removed values', () => {
    expect(FIELD_ALLOWED_VALUES.event_trigger).not.toContain('system_change')
    expect(FIELD_ALLOWED_VALUES.timing).not.toContain('resolved')
    expect(FIELD_ALLOWED_VALUES.action_required).not.toContain('recommended')
    expect(FIELD_ALLOWED_VALUES.error_location).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// deriveClassification
// ---------------------------------------------------------------------------

describe('deriveClassification', () => {
  it('returns null when event_trigger is not filled', () => {
    const cl = makeChecklist()
    expect(deriveClassification(cl)).toBeNull()
  })

  it('classifies all events as Notification (single path)', () => {
    for (const trigger of ['user_interaction', 'system_runtime', 'scheduled_system', 'scheduled_user']) {
      const cl = makeChecklist({ event_trigger: trigger })
      const result = deriveClassification(cl)
      expect(result).not.toBeNull()
      expect(result!.confidence).toBeGreaterThan(0)
    }
  })

  it('produces CRITICAL severity for blocked + widespread + now', () => {
    const cl = makeChecklist({
      event_trigger: 'system_runtime',
      user_impact: 'blocked',
      impact_scope: 'widespread',
      timing: 'now',
    })
    const result = deriveClassification(cl)
    expect(result).not.toBeNull()
    expect(result!.severity).toBe('CRITICAL')
    expect(result!.channels).toContain('Banner')
  })

  it('produces HIGH severity for blocked + limited + now', () => {
    const cl = makeChecklist({
      event_trigger: 'system_runtime',
      user_impact: 'blocked',
      impact_scope: 'limited',
      timing: 'now',
    })
    const result = deriveClassification(cl)
    expect(result).not.toBeNull()
    expect(result!.severity).toBe('HIGH')
  })

  it('produces CRITICAL severity for security concern + now', () => {
    const cl = makeChecklist({
      event_trigger: 'system_runtime',
      security: 'yes',
      timing: 'now',
    })
    const result = deriveClassification(cl)
    expect(result).not.toBeNull()
    expect(result!.severity).toBe('CRITICAL')
  })

  it('produces LOW severity with minimal input (trigger only)', () => {
    const cl = makeChecklist({ event_trigger: 'user_interaction' })
    const result = deriveClassification(cl)
    expect(result).not.toBeNull()
    expect(result!.severity).toBe('LOW')
  })

  it('handles freeform event trigger as Notification', () => {
    const cl = makeChecklist({ event_trigger: 'custom_freeform_event' })
    const result = deriveClassification(cl)
    expect(result).not.toBeNull()
  })

  it('increases confidence as more fields are filled', () => {
    const cl1 = makeChecklist({ event_trigger: 'system_runtime' })
    const cl2 = makeChecklist({
      event_trigger: 'system_runtime',
      what_happened: 'API outage',
      who_affected: 'all users',
      user_impact: 'blocked',
      action_required: 'no',
      security: 'no',
    })
    const r1 = deriveClassification(cl1)
    const r2 = deriveClassification(cl2)
    expect(r2!.confidence).toBeGreaterThan(r1!.confidence)
  })

  it('returns channels matching severity level', () => {
    const cl = makeChecklist({
      event_trigger: 'system_runtime',
      user_impact: 'blocked',
      impact_scope: 'widespread',
    })
    const result = deriveClassification(cl)
    expect(result!.channels.length).toBeGreaterThan(0)
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

  it('includes What section from event_trigger and what_happened', () => {
    const cl = makeChecklist({
      event_trigger: 'scheduled_system',
      what_happened: 'We are rotating all API keys.',
    })
    const story = composeStory(cl)
    expect(story).toContain('What:')
    expect(story).toContain('rotating all API keys')
  })

  it('includes Who section', () => {
    const cl = makeChecklist({
      event_trigger: 'system_runtime',
      who_affected: 'all users',
      user_impact: 'degraded',
    })
    const story = composeStory(cl)
    expect(story).toContain('Who:')
    expect(story).toContain('all users')
  })

  it('includes When section', () => {
    const cl = makeChecklist({ event_trigger: 'scheduled_system', timing: 'scheduled' })
    const story = composeStory(cl)
    expect(story).toContain('When:')
  })

  it('includes What to do section when action is required', () => {
    const cl = makeChecklist({
      event_trigger: 'scheduled_system',
      action_required: 'mandatory',
      what_to_do: 'Rotate your API keys before March 31.',
    })
    const story = composeStory(cl)
    expect(story).toContain('What to do:')
    expect(story).toContain('Rotate your API keys')
  })

  it('omits What to do section when action_required is "no" with regular text', () => {
    const cl = makeChecklist({
      event_trigger: 'system_runtime',
      action_required: 'no',
      what_to_do: 'This should not appear.',
    })
    const story = composeStory(cl)
    expect(story).not.toContain('What to do:')
  })

  it('shows "No action required" when what_to_do is "no_action"', () => {
    const cl = makeChecklist({
      event_trigger: 'system_runtime',
      action_required: 'no',
      what_to_do: 'no_action',
    })
    const story = composeStory(cl)
    expect(story).toContain('What to do:')
    expect(story).toContain('No action required')
  })

  it('includes security note when security is yes', () => {
    const cl = makeChecklist({
      event_trigger: 'system_runtime',
      security: 'yes',
    })
    const story = composeStory(cl)
    expect(story).toContain('What:')
  })

  it('separates sections with blank lines', () => {
    const cl = makeChecklist({
      event_trigger: 'scheduled_system',
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
    const cl = makeChecklist({ event_trigger: 'system_runtime' })
    const result = assessChannelQuality(cl, ['Banner'])
    expect(result).toHaveLength(1)
    expect(result[0]!.status).toBe('needs-work')
  })

  it('assesses Banner channel as good when all required fields filled', () => {
    const cl = makeChecklist({
      event_trigger: 'system_runtime',
      what_happened: 'API outage',
      timing: 'now',
      action_required: 'no',
    })
    const result = assessChannelQuality(cl, ['Banner'])
    expect(result).toHaveLength(1)
    expect(result[0]!.status).toBe('good')
  })

  it('assesses Email channel as needs-work when incomplete', () => {
    const cl = makeChecklist({ event_trigger: 'system_runtime' })
    const result = assessChannelQuality(cl, ['E-Mail'])
    expect(result).toHaveLength(1)
    expect(result[0]!.status).toBe('needs-work')
  })

  it('assesses Email channel as good when all required fields filled', () => {
    const cl = makeChecklist({
      event_trigger: 'system_runtime',
      what_happened: 'API outage',
      who_affected: 'all users',
      user_impact: 'blocked',
      what_to_do: 'Wait for resolution',
    })
    const result = assessChannelQuality(cl, ['E-Mail'])
    expect(result).toHaveLength(1)
    expect(result[0]!.status).toBe('good')
  })

  it('assesses Dashboard channel', () => {
    const cl = makeChecklist({
      event_trigger: 'system_runtime',
      what_happened: 'API outage',
    })
    const result = assessChannelQuality(cl, ['Dashboard'])
    expect(result).toHaveLength(1)
    expect(result[0]!.status).toBe('good')
  })

  it('handles multiple channels', () => {
    const cl = makeChecklist({
      event_trigger: 'system_runtime',
      what_happened: 'API outage',
      timing: 'now',
      action_required: 'mandatory',
      who_affected: 'all',
      user_impact: 'blocked',
      what_to_do: 'Wait',
    })
    const result = assessChannelQuality(cl, ['Banner', 'E-Mail', 'Dashboard'])
    expect(result).toHaveLength(3)
    expect(result.every(r => r.status === 'good')).toBe(true)
  })
})
