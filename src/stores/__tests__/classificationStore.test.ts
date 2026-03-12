import { describe, it, expect } from 'vitest'
import type { RenderableQuestion } from '@/data/story-questions'

describe('RenderableQuestion tree origin', () => {
  it('accepts tree as a valid origin', () => {
    const q: RenderableQuestion = {
      id: 'test',
      text: 'Test question',
      inputType: 'single',
      options: [],
      allowFreeform: false,
      origin: 'tree',
      targetChecklistItems: [],
    }
    expect(q.origin).toBe('tree')
  })

  it('allows omitted targetChecklistItems', () => {
    const q: RenderableQuestion = {
      id: 'test',
      text: 'Test question',
      inputType: 'single',
      options: [],
      allowFreeform: false,
      origin: 'tree',
    }
    expect(q.targetChecklistItems).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// classificationStore tests — flat sequential questions (Decision #27)
// ---------------------------------------------------------------------------
import { useClassificationStore } from '../classificationStore'

describe('classificationStore', () => {
  describe('initialization', () => {
    it('starts with empty metadata and first question = category', () => {
      const store = useClassificationStore()
      store.reset()
      expect(store.isComplete.value).toBe(false)
      expect(store.path.value).toEqual([])
      expect(store.metadata.value.category).toBeNull()
    })

    it('getCurrentQuestion returns category as first question', () => {
      const store = useClassificationStore()
      store.reset()
      const q = store.getCurrentQuestion()
      expect(q).not.toBeNull()
      expect(q!.id).toBe('category')
      expect(q!.origin).toBe('tree')
      expect(q!.inputType).toBe('single')
      expect(q!.options.length).toBe(3)
      expect(q!.allowFreeform).toBe(true)
    })
  })

  describe('answerQuestion', () => {
    it('advances to security when core_value is selected', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(0) // category: core_value
      expect(store.metadata.value.category).toBe('core_value')
      expect(store.path.value).toHaveLength(1)
      const q = store.getCurrentQuestion()
      expect(q).not.toBeNull()
      expect(q!.id).toBe('security')
    })

    it('advances to security when capability is selected', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(1) // category: capability
      expect(store.metadata.value.category).toBe('capability')
      const q = store.getCurrentQuestion()
      expect(q!.id).toBe('security')
    })

    it('advances to mgmt_form_field when management is selected', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(2) // category: management
      expect(store.metadata.value.category).toBe('management')
      const q = store.getCurrentQuestion()
      expect(q).not.toBeNull()
      expect(q!.id).toBe('mgmt_form_field')
    })

    it('records path entries correctly', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(2) // category: management
      store.answerQuestion(1) // mgmt_form_field: no
      store.answerQuestion(0) // mgmt_trigger: user
      expect(store.path.value).toHaveLength(3)
      expect(store.path.value[0]!.nodeId).toBe('category')
      expect(store.path.value[1]!.nodeId).toBe('mgmt_form_field')
      expect(store.path.value[2]!.nodeId).toBe('mgmt_trigger')
    })
  })

  // -------------------------------------------------------------------------
  // Core value path → Notification with severity
  // -------------------------------------------------------------------------
  describe('Core value path', () => {
    it('completes with 5 questions (category + security + platform_down + scope + reach)', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(0) // category: core_value
      store.answerQuestion(1) // security: no
      store.answerQuestion(1) // platform_down: no
      store.answerQuestion(0) // scope: all
      store.answerQuestion(0) // reach: all
      expect(store.isComplete.value).toBe(true)
      expect(store.result.value).not.toBeNull()
      expect(store.result.value!.informationType).toBe('Notification')
      expect(store.path.value).toHaveLength(5)
    })

    it('CRITICAL via security = yes', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(0) // category: core_value
      store.answerQuestion(0) // security: yes
      store.answerQuestion(1) // platform_down: no
      store.answerQuestion(0) // scope: all
      store.answerQuestion(0) // reach: all
      expect(store.isComplete.value).toBe(true)
      expect(store.result.value!.severity).toBe('CRITICAL')
      expect(store.result.value!.channels).toContain('Status Page')
    })

    it('CRITICAL via platform_down = yes', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(0) // category: core_value
      store.answerQuestion(1) // security: no
      store.answerQuestion(0) // platform_down: yes
      store.answerQuestion(0) // scope: all
      store.answerQuestion(0) // reach: all
      expect(store.isComplete.value).toBe(true)
      expect(store.result.value!.severity).toBe('CRITICAL')
    })

    it('HIGH via core_value + scope != none', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(0) // category: core_value
      store.answerQuestion(1) // security: no
      store.answerQuestion(1) // platform_down: no
      store.answerQuestion(1) // scope: some
      store.answerQuestion(0) // reach: all
      expect(store.isComplete.value).toBe(true)
      expect(store.result.value!.severity).toBe('HIGH')
      expect(store.result.value!.channels).toEqual(['Banner', 'Dashboard', 'E-Mail'])
    })

    it('HIGH + scope=one → no Banner (audit scope qualifier)', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(0) // category: core_value
      store.answerQuestion(1) // security: no
      store.answerQuestion(1) // platform_down: no
      store.answerQuestion(2) // scope: one
      store.answerQuestion(0) // reach: all
      expect(store.isComplete.value).toBe(true)
      expect(store.result.value!.severity).toBe('HIGH')
      expect(store.result.value!.channels).not.toContain('Banner')
      expect(store.result.value!.channels).toContain('Dashboard')
      expect(store.result.value!.channels).toContain('E-Mail')
    })

    it('LOW via scope = none', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(0) // category: core_value
      store.answerQuestion(1) // security: no
      store.answerQuestion(1) // platform_down: no
      store.answerQuestion(3) // scope: none
      store.answerQuestion(0) // reach: all
      expect(store.isComplete.value).toBe(true)
      expect(store.result.value!.severity).toBe('LOW')
      expect(store.result.value!.channels).toEqual(['Dashboard'])
    })
  })

  // -------------------------------------------------------------------------
  // Capability path → Notification with MEDIUM severity
  // -------------------------------------------------------------------------
  describe('Capability path', () => {
    it('completes with 4 questions (no platform_down question)', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(1) // category: capability
      store.answerQuestion(1) // security: no
      // platform_down is skipped (core_value only)
      store.answerQuestion(0) // scope: all
      store.answerQuestion(0) // reach: all
      expect(store.isComplete.value).toBe(true)
      expect(store.path.value).toHaveLength(4)
      expect(store.result.value!.informationType).toBe('Notification')
    })

    it('MEDIUM via capability + scope != none', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(1) // category: capability
      store.answerQuestion(1) // security: no
      store.answerQuestion(1) // scope: some
      store.answerQuestion(0) // reach: all
      expect(store.result.value!.severity).toBe('MEDIUM')
      expect(store.result.value!.channels).toEqual(['Dashboard', 'E-Mail'])
    })

    it('CRITICAL via capability + security = yes', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(1) // category: capability
      store.answerQuestion(0) // security: yes
      store.answerQuestion(0) // scope: all
      store.answerQuestion(0) // reach: all
      expect(store.result.value!.severity).toBe('CRITICAL')
    })

    it('skips platform_down question entirely', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(1) // category: capability
      store.answerQuestion(1) // security: no
      store.answerQuestion(0) // scope: all
      store.answerQuestion(0) // reach: all
      const visitedNodes = store.path.value.map(p => p.nodeId)
      expect(visitedNodes).not.toContain('platform_down')
    })
  })

  // -------------------------------------------------------------------------
  // Management path — 6 information types
  // -------------------------------------------------------------------------
  describe('Validation Messages (Management path)', () => {
    it('completes in 2 questions via management → form field yes', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(2) // category: management
      store.answerQuestion(0) // mgmt_form_field: yes
      expect(store.isComplete.value).toBe(true)
      expect(store.result.value!.informationType).toBe('Validation Messages')
      expect(store.result.value!.severity).toBeNull()
      expect(store.result.value!.channels).toEqual(['Inline'])
    })
  })

  describe('Error & Warnings (Management path)', () => {
    it('completes via user trigger + failure', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(2) // category: management
      store.answerQuestion(1) // mgmt_form_field: no
      store.answerQuestion(0) // mgmt_trigger: user
      store.answerQuestion(1) // mgmt_success: no (failed)
      expect(store.isComplete.value).toBe(true)
      expect(store.result.value!.informationType).toBe('Error & Warnings')
      expect(store.result.value!.channels).toEqual(['Inline', 'Toast'])
    })
  })

  describe('Transactional Confirmation (Management path)', () => {
    it('completes via user trigger + success + persistence', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(2) // category: management
      store.answerQuestion(1) // mgmt_form_field: no
      store.answerQuestion(0) // mgmt_trigger: user
      store.answerQuestion(0) // mgmt_success: yes
      store.answerQuestion(0) // mgmt_persistence: yes
      expect(store.isComplete.value).toBe(true)
      expect(store.result.value!.informationType).toBe('Transactional Confirmation')
      expect(store.result.value!.channels).toEqual(['Toast', 'Dashboard'])
    })
  })

  describe('Feedback (Management path)', () => {
    it('completes via user trigger + success + no persistence', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(2) // category: management
      store.answerQuestion(1) // mgmt_form_field: no
      store.answerQuestion(0) // mgmt_trigger: user
      store.answerQuestion(0) // mgmt_success: yes
      store.answerQuestion(1) // mgmt_persistence: no
      expect(store.isComplete.value).toBe(true)
      expect(store.result.value!.informationType).toBe('Feedback')
      expect(store.result.value!.channels).toEqual(['Toast'])
    })
  })

  describe('Status Display (Management path)', () => {
    it('completes via system trigger + ongoing', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(2) // category: management
      store.answerQuestion(1) // mgmt_form_field: no
      store.answerQuestion(1) // mgmt_trigger: system
      store.answerQuestion(0) // mgmt_ongoing: yes
      expect(store.isComplete.value).toBe(true)
      expect(store.result.value!.informationType).toBe('Status Display')
      expect(store.result.value!.channels).toEqual(['Dashboard'])
    })
  })

  describe('Notification fallback (Management path)', () => {
    it('completes via system trigger + not ongoing', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(2) // category: management
      store.answerQuestion(1) // mgmt_form_field: no
      store.answerQuestion(1) // mgmt_trigger: system
      store.answerQuestion(1) // mgmt_ongoing: no
      expect(store.isComplete.value).toBe(true)
      expect(store.result.value!.informationType).toBe('Notification')
      expect(store.result.value!.severity).toBe('LOW')
    })
  })

  // -------------------------------------------------------------------------
  // Domain routing — conditional questions
  // -------------------------------------------------------------------------
  describe('domain routing', () => {
    it('core_value path sees security + platform_down + scope + reach', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(0) // core_value
      store.answerQuestion(1) // security: no
      store.answerQuestion(1) // platform_down: no
      store.answerQuestion(0) // scope: all
      store.answerQuestion(0) // reach: all
      const visitedNodes = store.path.value.map(p => p.nodeId)
      expect(visitedNodes).toContain('security')
      expect(visitedNodes).toContain('platform_down')
      expect(visitedNodes).toContain('scope')
      expect(visitedNodes).toContain('reach')
      expect(visitedNodes).not.toContain('mgmt_form_field')
    })

    it('management path never visits security, platform_down, scope, reach', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(2) // management
      store.answerQuestion(0) // mgmt_form_field: yes → done
      const visitedNodes = store.path.value.map(p => p.nodeId)
      expect(visitedNodes).not.toContain('security')
      expect(visitedNodes).not.toContain('platform_down')
      expect(visitedNodes).not.toContain('scope')
      expect(visitedNodes).not.toContain('reach')
    })
  })

  // -------------------------------------------------------------------------
  // totalQuestions and answeredQuestions
  // -------------------------------------------------------------------------
  describe('totalQuestions', () => {
    it('estimates total including remaining questions', () => {
      const store = useClassificationStore()
      store.reset()
      expect(store.totalQuestions.value).toBeGreaterThan(0)
      store.answerQuestion(0) // core_value → 4 more to go
      expect(store.answeredQuestions.value).toBe(1)
      expect(store.totalQuestions.value).toBe(5) // 1 answered + 4 remaining (security, platform_down, scope, reach)
    })

    it('equals answeredQuestions when complete', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(2) // management
      store.answerQuestion(0) // form field yes → done
      expect(store.isComplete.value).toBe(true)
      expect(store.totalQuestions.value).toBe(store.answeredQuestions.value)
    })
  })

  // -------------------------------------------------------------------------
  // narrativeText
  // -------------------------------------------------------------------------
  describe('narrativeText', () => {
    it('always contains When: Now', () => {
      const store = useClassificationStore()
      store.reset()
      expect(store.narrativeText.value).toContain('When:\nNow')
    })

    it('updates What section after category answer', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(0) // core_value
      expect(store.narrativeText.value).toContain('What:')
    })

    it('includes trigger in narrative when complete', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(0) // core_value
      store.answerQuestion(1) // security: no
      store.answerQuestion(1) // platform_down: no
      store.answerQuestion(0) // scope: all
      store.answerQuestion(0) // reach: all
      expect(store.result.value?.trigger).toBeTruthy()
      expect(store.narrativeText.value).toContain(store.result.value!.trigger)
    })

    it('includes Who section after scope answer', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(0) // core_value
      store.answerQuestion(1) // security: no
      store.answerQuestion(1) // platform_down: no
      store.answerQuestion(0) // scope: all
      expect(store.narrativeText.value).toContain('Who:')
    })
  })

  // -------------------------------------------------------------------------
  // progressiveClassification
  // -------------------------------------------------------------------------
  describe('progressiveClassification', () => {
    it('returns null before first answer', () => {
      const store = useClassificationStore()
      store.reset()
      expect(store.progressiveClassification.value).toBeNull()
    })

    it('shows Notification type after core_value selected', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(0) // core_value
      const pc = store.progressiveClassification.value
      expect(pc).not.toBeNull()
      expect(pc!.type).toBe('Notification')
      expect(pc!.severity).toBeNull()
      expect(pc!.confidence).toBeLessThan(1)
    })

    it('shows CRITICAL after security=yes', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(0) // core_value
      store.answerQuestion(0) // security: yes
      const pc = store.progressiveClassification.value
      expect(pc!.severity).toBe('CRITICAL')
    })

    it('shows Management event after management selected', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(2) // management
      const pc = store.progressiveClassification.value
      expect(pc!.type).toBe('Management event')
      expect(pc!.confidence).toBeLessThan(1)
    })

    it('shows Validation Messages after management + form_field yes', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(2) // management
      store.answerQuestion(0) // form_field: yes → complete, progressive shows final
      const pc = store.progressiveClassification.value
      expect(pc!.type).toBe('Validation Messages')
    })

    it('returns full result when complete', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(0) // core_value
      store.answerQuestion(1) // security: no
      store.answerQuestion(1) // platform_down: no
      store.answerQuestion(0) // scope: all
      store.answerQuestion(0) // reach: all
      expect(store.isComplete.value).toBe(true)
      const pc = store.progressiveClassification.value
      expect(pc!.confidence).toBe(1)
      expect(pc!.severity).toBe('HIGH')
    })
  })

  // -------------------------------------------------------------------------
  // toStoryClassification adapter
  // -------------------------------------------------------------------------
  describe('toStoryClassification', () => {
    it('maps ClassificationResult to StoryClassification shape', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(0) // core_value
      store.answerQuestion(0) // security: yes
      store.answerQuestion(1) // platform_down: no
      store.answerQuestion(0) // scope: all
      store.answerQuestion(0) // reach: all
      const sc = store.toStoryClassification(store.result.value!)
      expect(sc.type).toBe('Notification')
      expect(sc.severity).toBe('CRITICAL')
      expect(sc.channels.length).toBeGreaterThan(0)
      expect(sc.confidence).toBe(1)
    })

    it('sets severity to null for non-Notification types', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(2) // management
      store.answerQuestion(1) // form field: no
      store.answerQuestion(0) // trigger: user
      store.answerQuestion(1) // success: no → Error & Warnings
      const sc = store.toStoryClassification(store.result.value!)
      expect(sc.type).toBe('Error & Warnings')
      expect(sc.severity).toBeNull()
      expect(sc.confidence).toBe(1)
    })
  })

  // -------------------------------------------------------------------------
  // getCurrentQuestion
  // -------------------------------------------------------------------------
  describe('getCurrentQuestion', () => {
    it('returns RenderableQuestion for current question', () => {
      const store = useClassificationStore()
      store.reset()
      const q = store.getCurrentQuestion()
      expect(q).not.toBeNull()
      expect(q!.origin).toBe('tree')
      expect(q!.inputType).toBe('single')
      expect(q!.options.length).toBe(3)
      expect(q!.allowFreeform).toBe(true)
      expect(q!.id).toBe('category')
    })

    it('returns null when classification is complete', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(2) // management
      store.answerQuestion(0) // form field yes → done
      expect(store.getCurrentQuestion()).toBeNull()
    })

    it('advances to correct question after each answer', () => {
      const store = useClassificationStore()
      store.reset()
      expect(store.getCurrentQuestion()!.id).toBe('category')
      store.answerQuestion(0) // core_value
      expect(store.getCurrentQuestion()!.id).toBe('security')
      store.answerQuestion(1) // no
      expect(store.getCurrentQuestion()!.id).toBe('platform_down')
      store.answerQuestion(1) // no
      expect(store.getCurrentQuestion()!.id).toBe('scope')
      store.answerQuestion(0) // all
      expect(store.getCurrentQuestion()!.id).toBe('reach')
    })
  })

  // -------------------------------------------------------------------------
  // Reset
  // -------------------------------------------------------------------------
  describe('reset', () => {
    it('clears all state to initial values', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(0) // core_value
      store.answerQuestion(0) // security: yes
      store.answerQuestion(1) // platform_down: no
      store.answerQuestion(0) // scope: all
      store.answerQuestion(0) // reach: all
      expect(store.isComplete.value).toBe(true)

      store.reset()
      expect(store.isComplete.value).toBe(false)
      expect(store.path.value).toEqual([])
      expect(store.result.value).toBeNull()
      expect(store.metadata.value.category).toBeNull()
      expect(store.getCurrentQuestion()!.id).toBe('category')
    })
  })
})
