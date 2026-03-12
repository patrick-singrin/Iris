import { describe, it, expect } from 'vitest'
import { buildProgressiveNarrative } from '../classificationNarrativeBuilder'
import type { PathEntry } from '@/types/decisionTree'

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
    it('returns What + When sections with defaults', () => {
      const text = buildProgressiveNarrative([])
      expect(text).toContain('What:\n')
      expect(text).toContain('When:\nNOW')
      // No Who or What to do sections
      expect(text).not.toContain('Who:')
      expect(text).not.toContain('What to do:')
    })
  })

  // -------------------------------------------------------------------------
  // Information-Type Tree — 5 question nodes
  // -------------------------------------------------------------------------

  describe('info-type tree: start', () => {
    it('maps "acting right now" to user-facing event', () => {
      const text = buildProgressiveNarrative([
        entry('start', 'Yes — the user is acting right now'),
      ])
      expect(text).toContain('A user-facing event occurred during active interaction.')
    })

    it('maps background to background event', () => {
      const text = buildProgressiveNarrative([
        entry('start', 'No — it happens in the background'),
      ])
      expect(text).toContain('A background system event occurred.')
    })
  })

  describe('info-type tree: user_problem_check', () => {
    it('maps "problem" to something went wrong (append)', () => {
      const text = buildProgressiveNarrative([
        entry('start', 'Yes — the user is acting right now'),
        entry('user_problem_check', 'Yes — there\'s a problem'),
      ])
      expect(text).toContain('A user-facing event occurred')
      expect(text).toContain('Something went wrong.')
    })

    it('maps "worked" to action completed', () => {
      const text = buildProgressiveNarrative([
        entry('start', 'Yes — the user is acting right now'),
        entry('user_problem_check', 'No — everything worked'),
      ])
      expect(text).toContain('The action completed successfully.')
    })
  })

  describe('info-type tree: user_form_check', () => {
    it('maps "guides" to form guidance (set)', () => {
      const text = buildProgressiveNarrative([
        entry('start', 'Yes — the user is acting right now'),
        entry('user_problem_check', 'No — everything worked'),
        entry('user_form_check', 'Yes — it guides users through a form'),
      ])
      expect(text).toContain('A form field needs user guidance.')
    })

    it('maps "completed an action" to append', () => {
      const text = buildProgressiveNarrative([
        entry('start', 'Yes — the user is acting right now'),
        entry('user_problem_check', 'No — everything worked'),
        entry('user_form_check', 'No — the user completed an action'),
      ])
      expect(text).toContain('The user completed an action.')
    })
  })

  describe('info-type tree: user_outcome', () => {
    it('maps "record" to transaction reference', () => {
      const text = buildProgressiveNarrative([
        entry('user_outcome', 'A permanent record'),
      ])
      expect(text).toContain('A completed transaction the user needs to reference.')
    })

    it('maps "progress" to process started', () => {
      const text = buildProgressiveNarrative([
        entry('user_outcome', 'Something showing progress'),
      ])
      expect(text).toContain('A process was started that shows progress.')
    })

    it('maps acknowledgment to brief acknowledgment', () => {
      const text = buildProgressiveNarrative([
        entry('user_outcome', 'A quick acknowledgment'),
      ])
      expect(text).toContain('A brief acknowledgment of a completed action.')
    })
  })

  describe('info-type tree: system_temporality', () => {
    it('maps "live status" to live system status', () => {
      const text = buildProgressiveNarrative([
        entry('system_temporality', 'It shows a live status'),
      ])
      expect(text).toContain('A live system status needs to be displayed.')
    })

    it('maps event/announcement to notification', () => {
      const text = buildProgressiveNarrative([
        entry('system_temporality', 'A specific event or announcement'),
      ])
      expect(text).toContain('An event notification needs to be communicated to users.')
    })
  })

  // -------------------------------------------------------------------------
  // Notification-Severity Tree — 6 question nodes
  // -------------------------------------------------------------------------

  describe('severity tree: platform', () => {
    it('maps "complete outage" to platform down (append)', () => {
      const text = buildProgressiveNarrative([
        entry('platform', 'Yes — complete outage'),
      ])
      expect(text).toContain('The entire platform is down.')
    })

    it('maps "some or all" to partially operational', () => {
      const text = buildProgressiveNarrative([
        entry('platform', 'No — some or all services work'),
      ])
      expect(text).toContain('Part of the platform is still operational.')
    })
  })

  describe('severity tree: security', () => {
    it('maps "security or compliance" to security issue', () => {
      const text = buildProgressiveNarrative([
        entry('security', 'Yes — security or compliance'),
      ])
      expect(text).toContain('This involves a security or compliance issue.')
    })

    it('produces no contribution for "No"', () => {
      const base = buildProgressiveNarrative([])
      const withNo = buildProgressiveNarrative([entry('security', 'No')])
      // The "No" answer should not add any text beyond the base
      expect(withNo).toBe(base)
    })
  })

  describe('severity tree: impact', () => {
    it('maps "blocked" to users blocked (who section)', () => {
      const text = buildProgressiveNarrative([
        entry('impact', 'No — they\'re blocked'),
      ])
      expect(text).toContain('Who:\n')
      expect(text).toContain('Users are blocked from completing their tasks.')
    })

    it('maps "degraded" to degraded service', () => {
      const text = buildProgressiveNarrative([
        entry('impact', 'Partially — it\'s degraded'),
      ])
      expect(text).toContain('Users experience degraded service but can still work.')
    })

    it('maps "no impact" to not impacted', () => {
      const text = buildProgressiveNarrative([
        entry('impact', 'Yes — no impact on their work'),
      ])
      expect(text).toContain('Users are not currently impacted.')
    })
  })

  describe('severity tree: blocked_scope', () => {
    it('maps "Many" to many users', () => {
      const text = buildProgressiveNarrative([
        entry('impact', 'No — they\'re blocked'),
        entry('blocked_scope', 'Many users'),
      ])
      expect(text).toContain('Many users are affected.')
    })

    it('maps "One" to single user', () => {
      const text = buildProgressiveNarrative([
        entry('impact', 'No — they\'re blocked'),
        entry('blocked_scope', 'One user'),
      ])
      expect(text).toContain('A single user is affected.')
    })

    it('maps "A few" to limited group', () => {
      const text = buildProgressiveNarrative([
        entry('impact', 'No — they\'re blocked'),
        entry('blocked_scope', 'A few users'),
      ])
      expect(text).toContain('A limited group of users is affected.')
    })
  })

  describe('severity tree: degraded_scope', () => {
    it('maps "Many" to many users', () => {
      const text = buildProgressiveNarrative([
        entry('impact', 'Partially — it\'s degraded'),
        entry('degraded_scope', 'Many users'),
      ])
      expect(text).toContain('Many users are affected.')
    })

    it('maps "One" to single user', () => {
      const text = buildProgressiveNarrative([
        entry('impact', 'Partially — it\'s degraded'),
        entry('degraded_scope', 'One user'),
      ])
      expect(text).toContain('A single user is affected.')
    })
  })

  describe('severity tree: action', () => {
    it('maps "action required" to whatToDo section', () => {
      const text = buildProgressiveNarrative([
        entry('action', 'Yes — action required'),
      ])
      expect(text).toContain('What to do:\n')
      expect(text).toContain('Users need to take action.')
    })

    it('maps "informational" to no action', () => {
      const text = buildProgressiveNarrative([
        entry('action', 'No — just informational'),
      ])
      expect(text).toContain('What to do:\n')
      expect(text).toContain('No action required')
    })
  })

  // -------------------------------------------------------------------------
  // Cross-tree paths (full walkthrough)
  // -------------------------------------------------------------------------

  describe('full notification path (both trees)', () => {
    it('populates all four W-heading sections', () => {
      const text = buildProgressiveNarrative([
        // Info-type tree
        entry('start', 'No — it happens in the background'),
        entry('system_temporality', 'A specific event or announcement'),
        // Severity tree
        entry('platform', 'No — some or all services work'),
        entry('security', 'No'),
        entry('impact', 'No — they\'re blocked'),
        entry('blocked_scope', 'Many users'),
      ])
      expect(text).toContain('What:\n')
      expect(text).toContain('Who:\n')
      expect(text).toContain('When:\nNOW')
      // No action node visited, so no "What to do:" section
      expect(text).not.toContain('What to do:')
    })

    it('includes whatToDo section when action node visited', () => {
      const text = buildProgressiveNarrative([
        entry('start', 'No — it happens in the background'),
        entry('system_temporality', 'A specific event or announcement'),
        entry('platform', 'No — some or all services work'),
        entry('security', 'No'),
        entry('impact', 'Yes — no impact on their work'),
        entry('action', 'Yes — action required'),
      ])
      expect(text).toContain('What to do:\n')
      expect(text).toContain('Users need to take action.')
    })
  })

  // -------------------------------------------------------------------------
  // Result trigger
  // -------------------------------------------------------------------------

  describe('resultTrigger', () => {
    it('appends trigger to What section', () => {
      const text = buildProgressiveNarrative(
        [entry('start', 'No — it happens in the background')],
        'Complete platform outage',
      )
      expect(text).toContain('Trigger: Complete platform outage')
    })

    it('uses trigger as What text when path produces no What text', () => {
      const text = buildProgressiveNarrative([], 'Security/compliance issue')
      expect(text).toContain('Security/compliance issue')
    })
  })

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------

  describe('edge cases', () => {
    it('skips unknown nodeIds gracefully', () => {
      const text = buildProgressiveNarrative([
        entry('nonexistent_node', 'Some answer'),
        entry('start', 'Yes — the user is acting right now'),
      ])
      expect(text).toContain('A user-facing event occurred')
    })

    it('section ordering is What > Who > When > What to do', () => {
      const text = buildProgressiveNarrative([
        entry('impact', 'No — they\'re blocked'),
        entry('action', 'Yes — action required'),
        entry('start', 'Yes — the user is acting right now'),
      ])
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
