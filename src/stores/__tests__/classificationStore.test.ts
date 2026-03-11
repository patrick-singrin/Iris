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
// Task 2+: classificationStore tests
// ---------------------------------------------------------------------------
import { useClassificationStore } from '../classificationStore'

describe('classificationStore', () => {
  describe('initialization', () => {
    it('starts with information-type tree at entry node', () => {
      const store = useClassificationStore()
      store.reset()
      expect(store.currentTreeId.value).toBe('information-type')
      expect(store.currentNodeId.value).toBe('start')
      expect(store.isComplete.value).toBe(false)
      expect(store.path.value).toEqual([])
    })
  })

  describe('answerQuestion', () => {
    it('advances to next node on answer', () => {
      const store = useClassificationStore()
      store.reset()
      // Answer "Yes — triggered by the user" (option 0)
      store.answerQuestion(0)
      expect(store.currentNodeId.value).toBe('user_problem_check')
      expect(store.path.value).toHaveLength(1)
      expect(store.path.value[0]!.selectedLabel).toBe('Yes — triggered by the user')
    })

    it('records path entries correctly', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(0) // "Yes — triggered by the user"
      store.answerQuestion(0) // "Yes — there's a problem"
      expect(store.path.value).toHaveLength(2)
      expect(store.path.value[0]!.questionText).toBe('Is the user actively doing something?')
      expect(store.path.value[1]!.questionText).toBe('Did something go wrong?')
    })
  })

  describe('non-Notification result', () => {
    it('completes when reaching a non-Notification result node', () => {
      const store = useClassificationStore()
      store.reset()
      // Path to "Error & Warnings": start → user_problem_check → result_error_warning
      store.answerQuestion(0) // Yes — triggered by user
      store.answerQuestion(0) // Yes — there's a problem
      expect(store.isComplete.value).toBe(true)
      expect(store.result.value).not.toBeNull()
      expect(store.result.value!.informationType).toBe('Error & Warnings')
      expect(store.result.value!.severity).toBeNull()
      expect(store.result.value!.channels).toEqual(['Inline at point of action'])
    })
  })

  // -------------------------------------------------------------------------
  // Task 3: Tree chaining (Notification -> severity)
  // -------------------------------------------------------------------------
  describe('tree chaining (Notification -> severity)', () => {
    it('seamlessly transitions to severity tree for Notification type', () => {
      const store = useClassificationStore()
      store.reset()
      // Path to Notification: start -> system_temporality -> result_notification
      // start: option 1 = "No — it happens independently"
      store.answerQuestion(1)
      // system_temporality: option 1 = "A specific event or announcement"
      store.answerQuestion(1)

      // Should now be in severity tree
      expect(store.currentTreeId.value).toBe('notification-severity')
      expect(store.currentNodeId.value).toBe('platform')
      expect(store.isComplete.value).toBe(false)
    })

    it('completes with severity when finishing severity tree', () => {
      const store = useClassificationStore()
      store.reset()
      // Path to Notification
      store.answerQuestion(1) // No — it happens independently
      store.answerQuestion(1) // A specific event or announcement
      // Now in severity tree at 'platform'
      // Answer: "Yes — complete outage" -> r_critical_outage
      store.answerQuestion(0)

      expect(store.isComplete.value).toBe(true)
      expect(store.result.value).not.toBeNull()
      expect(store.result.value!.informationType).toBe('Notification')
      expect(store.result.value!.severity).toBe('CRITICAL')
      expect(store.result.value!.channels.length).toBeGreaterThan(0)
    })

    it('tracks total path across both trees', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(1) // info-type tree Q1
      store.answerQuestion(1) // info-type tree Q2 -> chains
      store.answerQuestion(0) // severity tree Q1 -> result
      // 3 questions total across both trees
      expect(store.path.value).toHaveLength(3)
      expect(store.answeredQuestions.value).toBe(3)
    })
  })
})
