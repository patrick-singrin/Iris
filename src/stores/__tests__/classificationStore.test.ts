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

  // -------------------------------------------------------------------------
  // Task 4: totalQuestions and Narrative4W
  // -------------------------------------------------------------------------
  describe('totalQuestions', () => {
    it('estimates total including remaining questions on longest path', () => {
      const store = useClassificationStore()
      store.reset()
      // At start of info-type tree, total should be > 0
      expect(store.totalQuestions.value).toBeGreaterThan(0)
      // After answering first question, total should adjust
      store.answerQuestion(0)
      // answeredQuestions increased by 1
      expect(store.answeredQuestions.value).toBe(1)
      // total should still be reasonable (2-13 range across both trees)
      expect(store.totalQuestions.value).toBeGreaterThanOrEqual(2)
      expect(store.totalQuestions.value).toBeLessThanOrEqual(13)
    })

    it('equals answeredQuestions when complete', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(0) // triggered by user
      store.answerQuestion(0) // problem -> Error & Warnings
      expect(store.isComplete.value).toBe(true)
      expect(store.totalQuestions.value).toBe(store.answeredQuestions.value)
    })
  })

  describe('narrative4W', () => {
    it('always has when = NOW', () => {
      const store = useClassificationStore()
      store.reset()
      expect(store.narrative4W.value.when).toBe('NOW')
    })

    it('fills who from scope questions in severity tree', () => {
      const store = useClassificationStore()
      store.reset()
      // Get to severity tree
      store.answerQuestion(1) // No — independent
      store.answerQuestion(1) // A specific event -> Notification -> chains
      // severity tree: platform
      store.answerQuestion(1) // No — some services work -> security
      store.answerQuestion(1) // No security -> impact
      store.answerQuestion(0) // No — blocked -> blocked_scope
      store.answerQuestion(0) // Many users -> r_high_blocked_many

      expect(store.narrative4W.value.who).toBe('Many users')
    })

    it('includes trigger in what field when complete', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(1) // No — independent
      store.answerQuestion(1) // Specific event -> chains
      store.answerQuestion(0) // complete outage -> CRITICAL result
      expect(store.result.value?.trigger).toBeTruthy()
      expect(store.narrative4W.value.what).toContain(store.result.value!.trigger)
    })
  })

  // -------------------------------------------------------------------------
  // Task 5: toStoryClassification adapter
  // -------------------------------------------------------------------------
  describe('toStoryClassification', () => {
    it('maps ClassificationResult to StoryClassification shape', () => {
      const store = useClassificationStore()
      store.reset()
      // Path to CRITICAL
      store.answerQuestion(1) // No — independent
      store.answerQuestion(1) // Specific event -> chains
      store.answerQuestion(0) // complete outage
      const sc = store.toStoryClassification(store.result.value!)
      expect(sc.type).toBe('Notification')
      expect(sc.severity).toBe('CRITICAL')
      expect(sc.channels.length).toBeGreaterThan(0)
      expect(sc.confidence).toBe(1)
    })

    it('sets severity to null for non-Notification types', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(0) // triggered by user
      store.answerQuestion(0) // problem -> Error & Warnings
      const sc = store.toStoryClassification(store.result.value!)
      expect(sc.type).toBe('Error & Warnings')
      expect(sc.severity).toBeNull()
      expect(sc.confidence).toBe(1)
    })
  })

  // -------------------------------------------------------------------------
  // getCurrentQuestion coverage
  // -------------------------------------------------------------------------
  describe('getCurrentQuestion', () => {
    it('returns RenderableQuestion for current tree node', () => {
      const store = useClassificationStore()
      store.reset()
      const q = store.getCurrentQuestion()
      expect(q).not.toBeNull()
      expect(q!.origin).toBe('tree')
      expect(q!.inputType).toBe('single')
      expect(q!.options.length).toBeGreaterThan(0)
      expect(q!.allowFreeform).toBe(false)
      expect(q!.id).toBe('start')
    })

    it('returns null when classification is complete', () => {
      const store = useClassificationStore()
      store.reset()
      store.answerQuestion(0) // Yes — triggered by user
      store.answerQuestion(0) // Yes — problem -> Error & Warnings result
      expect(store.getCurrentQuestion()).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // narrative4W.whatToDo coverage
  // -------------------------------------------------------------------------
  describe('narrative4W.whatToDo', () => {
    // The severity tree (decision-tree_notification-severity.json) does not
    // currently contain a node with id "action". The narrative4W computed
    // property does check for entry.nodeId === 'action' to populate whatToDo,
    // but no path through the current tree reaches such a node.
    //
    // When an "action" node is added to the severity tree in a future
    // revision, a test should be added here that walks to it and verifies
    // narrative4W.whatToDo gets populated with the selected label.

    it('defaults to empty string when no action node is visited', () => {
      const store = useClassificationStore()
      store.reset()
      // Walk to a CRITICAL result — no action node on this path
      store.answerQuestion(1) // No — independent
      store.answerQuestion(1) // Specific event -> Notification -> chains
      store.answerQuestion(0) // complete outage -> CRITICAL
      expect(store.isComplete.value).toBe(true)
      expect(store.narrative4W.value.whatToDo).toBe('')
    })
  })
})
