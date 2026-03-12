import { describe, it, expect } from 'vitest'
import { buildProgressiveNarrative } from '../classificationNarrativeBuilder'
import type { PathEntry } from '@/data/classification-questions'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function entry(nodeId: string, selectedLabel: string, questionText = ''): PathEntry {
  return { nodeId, questionText, selectedLabel }
}

// ---------------------------------------------------------------------------
// Empty / minimal paths
// ---------------------------------------------------------------------------

describe('buildProgressiveNarrative', () => {
  describe('empty path', () => {
    it('returns all four W-sections with defaults', () => {
      const text = buildProgressiveNarrative([])
      expect(text).toContain('What:\n-')
      expect(text).toContain('Who:\n-')
      expect(text).toContain('When:\nNow')
      expect(text).toContain('What to do:\n-')
    })
  })

  // -------------------------------------------------------------------------
  // Core questions (Q1–Q5) — flat question IDs
  // -------------------------------------------------------------------------

  describe('category question', () => {
    it('maps core_value label to core product event', () => {
      const text = buildProgressiveNarrative([
        entry('category', 'Core product — the main APIs and services'),
      ])
      expect(text).toContain('An event affecting the core product.')
    })

    it('maps capability/feature/platform label to platform feature event', () => {
      const text = buildProgressiveNarrative([
        entry('category', 'Platform feature — supporting capabilities'),
      ])
      expect(text).toContain('An event affecting a platform feature.')
    })

    it('maps management label to management interface event', () => {
      const text = buildProgressiveNarrative([
        entry('category', 'Management interface — the admin console'),
      ])
      expect(text).toContain('An event in the management interface.')
    })
  })

  describe('security question', () => {
    it('maps "yes" to security issue (append)', () => {
      const text = buildProgressiveNarrative([
        entry('category', 'Core product — the main APIs and services'),
        entry('security', 'Yes — security or compliance issue'),
      ])
      expect(text).toContain('An event affecting the core product.')
      expect(text).toContain('A security or compliance issue.')
    })

    it('produces no contribution for "No" (routing answer)', () => {
      const base = buildProgressiveNarrative([
        entry('category', 'Core product — the main APIs and services'),
      ])
      const withNo = buildProgressiveNarrative([
        entry('category', 'Core product — the main APIs and services'),
        entry('security', 'No'),
      ])
      expect(withNo).toBe(base)
    })
  })

  describe('platform_down question', () => {
    it('maps "yes/complete" to platform down (append)', () => {
      const text = buildProgressiveNarrative([
        entry('platform_down', 'Yes — complete outage'),
      ])
      expect(text).toContain('The entire platform is down.')
    })

    it('produces no contribution for "No"', () => {
      const base = buildProgressiveNarrative([])
      const withNo = buildProgressiveNarrative([
        entry('platform_down', 'No — some services still work'),
      ])
      expect(withNo).toBe(base)
    })
  })

  describe('scope question', () => {
    it('maps "nothing/none" to whatToDo section', () => {
      const text = buildProgressiveNarrative([
        entry('scope', 'Nothing is broken — informational'),
      ])
      expect(text).toContain('What to do:')
      expect(text).toContain('No action required — informational event.')
    })

    it('maps "all" to who section', () => {
      const text = buildProgressiveNarrative([
        entry('scope', 'All services are affected'),
      ])
      expect(text).toContain('Who:')
      expect(text).toContain('All services are affected.')
    })

    it('maps "some" to who section', () => {
      const text = buildProgressiveNarrative([
        entry('scope', 'Some services are affected'),
      ])
      expect(text).toContain('Who:')
      expect(text).toContain('Some services are affected.')
    })

    it('maps "one/single" to who section', () => {
      const text = buildProgressiveNarrative([
        entry('scope', 'One service is affected'),
      ])
      expect(text).toContain('Who:')
      expect(text).toContain('A single service is affected.')
    })
  })

  describe('reach question', () => {
    it('maps "everyone/all" to who section (append)', () => {
      const text = buildProgressiveNarrative([
        entry('scope', 'All services are affected'),
        entry('reach', 'Everyone — all users'),
      ])
      expect(text).toContain('All services are affected.')
      expect(text).toContain('All users are affected.')
    })

    it('maps "group" to who section', () => {
      const text = buildProgressiveNarrative([
        entry('reach', 'A specific group of users'),
      ])
      expect(text).toContain('A specific user group is affected.')
    })

    it('maps single user to who section', () => {
      const text = buildProgressiveNarrative([
        entry('reach', 'A single user'),
      ])
      expect(text).toContain('A single user is affected.')
    })
  })

  // -------------------------------------------------------------------------
  // Management questions (M1–M5)
  // -------------------------------------------------------------------------

  describe('mgmt_form_field question', () => {
    it('maps "yes" to form field guidance', () => {
      const text = buildProgressiveNarrative([
        entry('mgmt_form_field', 'Yes — it guides input in a form field'),
      ])
      expect(text).toContain('A form field needs input guidance.')
    })

    it('produces no contribution for "No"', () => {
      const base = buildProgressiveNarrative([])
      const withNo = buildProgressiveNarrative([
        entry('mgmt_form_field', 'No — it\'s not about a specific field'),
      ])
      expect(withNo).toBe(base)
    })
  })

  describe('mgmt_trigger question', () => {
    it('maps "user" to user action', () => {
      const text = buildProgressiveNarrative([
        entry('mgmt_trigger', 'A user action'),
      ])
      expect(text).toContain('The user performed an action.')
    })

    it('maps "system" to background event', () => {
      const text = buildProgressiveNarrative([
        entry('mgmt_trigger', 'The system did it automatically'),
      ])
      expect(text).toContain('A background system event occurred.')
    })
  })

  describe('mgmt_success question', () => {
    it('maps "no/failed" to failure (append)', () => {
      const text = buildProgressiveNarrative([
        entry('mgmt_trigger', 'A user action'),
        entry('mgmt_success', 'No — it failed'),
      ])
      expect(text).toContain('The user performed an action.')
      expect(text).toContain('Something went wrong.')
    })

    it('maps "yes/succeeded" to success', () => {
      const text = buildProgressiveNarrative([
        entry('mgmt_trigger', 'A user action'),
        entry('mgmt_success', 'Yes — it succeeded'),
      ])
      expect(text).toContain('The action succeeded.')
    })
  })

  describe('mgmt_persistence question', () => {
    it('maps "yes" to record needed', () => {
      const text = buildProgressiveNarrative([
        entry('mgmt_persistence', 'Yes — they need a record'),
      ])
      expect(text).toContain('The user needs a record of this transaction.')
    })

    it('maps "no" to brief acknowledgment', () => {
      const text = buildProgressiveNarrative([
        entry('mgmt_persistence', 'No — a brief acknowledgment'),
      ])
      expect(text).toContain('A brief acknowledgment of a completed action.')
    })
  })

  describe('mgmt_ongoing question', () => {
    it('maps "yes/ongoing" to live system status', () => {
      const text = buildProgressiveNarrative([
        entry('mgmt_ongoing', 'Yes — ongoing live status'),
      ])
      expect(text).toContain('A live system status needs to be displayed.')
    })

    it('maps "no" to event notification', () => {
      const text = buildProgressiveNarrative([
        entry('mgmt_ongoing', 'No — one-time event'),
      ])
      expect(text).toContain('An event notification needs to reach users.')
    })
  })

  // -------------------------------------------------------------------------
  // Full paths (cross-question)
  // -------------------------------------------------------------------------

  describe('full core_value path', () => {
    it('populates What + Who + When for HIGH path', () => {
      const text = buildProgressiveNarrative([
        entry('category', 'Core product — APIs'),
        entry('security', 'No'),
        entry('platform_down', 'No'),
        entry('scope', 'All services affected'),
        entry('reach', 'Everyone — all users'),
      ])
      expect(text).toContain('What:\n')
      expect(text).toContain('Who:\n')
      expect(text).toContain('All services are affected.')
      expect(text).toContain('All users are affected.')
      expect(text).toContain('When:\nNow')
    })

    it('CRITICAL path includes platform down', () => {
      const text = buildProgressiveNarrative([
        entry('category', 'Core product — APIs'),
        entry('security', 'No'),
        entry('platform_down', 'Yes — complete outage'),
        entry('scope', 'All services affected'),
        entry('reach', 'Everyone'),
      ])
      expect(text).toContain('An event affecting the core product.')
      expect(text).toContain('The entire platform is down.')
    })
  })

  describe('full management path', () => {
    it('Error & Warnings path shows user action + failure', () => {
      const text = buildProgressiveNarrative([
        entry('category', 'Management interface — admin'),
        entry('mgmt_form_field', 'No'),
        entry('mgmt_trigger', 'A user action'),
        entry('mgmt_success', 'No — it failed'),
      ])
      expect(text).toContain('The user performed an action.')
      expect(text).toContain('Something went wrong.')
    })

    it('Transactional Confirmation path shows persistence', () => {
      const text = buildProgressiveNarrative([
        entry('category', 'Management interface'),
        entry('mgmt_form_field', 'No'),
        entry('mgmt_trigger', 'A user action'),
        entry('mgmt_success', 'Yes — succeeded'),
        entry('mgmt_persistence', 'Yes — need record'),
      ])
      expect(text).toContain('The user needs a record of this transaction.')
    })
  })

  // -------------------------------------------------------------------------
  // Result trigger
  // -------------------------------------------------------------------------

  describe('resultTrigger', () => {
    it('appends trigger to What section', () => {
      const text = buildProgressiveNarrative(
        [entry('category', 'Core product — APIs')],
        'Core product — all services',
      )
      expect(text).toContain('Trigger: Core product — all services')
    })

    it('uses trigger as What text when path produces no What text', () => {
      const text = buildProgressiveNarrative([], 'Security/compliance issue')
      expect(text).toContain('Security/compliance issue')
    })
  })

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------

  describe('always shows all 4 W-sections', () => {
    it('management path includes Who and What to do defaults', () => {
      const text = buildProgressiveNarrative([
        entry('category', 'Management interface — admin'),
        entry('mgmt_form_field', 'No'),
        entry('mgmt_trigger', 'A user action'),
        entry('mgmt_success', 'No — it failed'),
      ])
      expect(text).toContain('Who:\n-')
      expect(text).toContain('What to do:\n-')
    })

    it('core_value path with scope includes What to do default', () => {
      const text = buildProgressiveNarrative([
        entry('category', 'Core product — APIs'),
        entry('scope', 'All services are affected'),
        entry('reach', 'Everyone — all users'),
      ])
      expect(text).toContain('Who:\nAll services are affected.')
      expect(text).toContain('What to do:\n-')
    })

    it('single question still shows all 4 sections', () => {
      const text = buildProgressiveNarrative([
        entry('category', 'Core product — APIs'),
      ])
      expect(text).toContain('What:\n')
      expect(text).toContain('Who:\n')
      expect(text).toContain('When:\n')
      expect(text).toContain('What to do:\n')
    })
  })

  describe('edge cases', () => {
    it('skips unknown nodeIds gracefully', () => {
      const text = buildProgressiveNarrative([
        entry('nonexistent_node', 'Some answer'),
        entry('mgmt_trigger', 'A user action'),
      ])
      expect(text).toContain('The user performed an action.')
    })

    it('section ordering is What > Who > When > What to do', () => {
      const text = buildProgressiveNarrative([])
      const whatIdx = text.indexOf('What:')
      const whoIdx = text.indexOf('Who:')
      const whenIdx = text.indexOf('When:')
      const whatToDoIdx = text.indexOf('What to do:')
      expect(whatIdx).toBeLessThan(whoIdx)
      expect(whoIdx).toBeLessThan(whenIdx)
      expect(whenIdx).toBeLessThan(whatToDoIdx)
    })
  })
})
