import { describe, it, expect } from 'vitest'
import {
  getClassificationQuestions,
  createEmptyMetadata,
  findNextQuestion,
  countRemainingQuestions,
  type Phase1Metadata,
} from '../classification-questions'

// ---------------------------------------------------------------------------
// Question definitions integrity
// ---------------------------------------------------------------------------

describe('getClassificationQuestions', () => {
  it('returns an array of question definitions', () => {
    const questions = getClassificationQuestions()
    expect(questions.length).toBeGreaterThanOrEqual(10)
  })

  it('all questions have unique IDs', () => {
    const questions = getClassificationQuestions()
    const ids = questions.map(q => q.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('all questions have at least 2 options', () => {
    const questions = getClassificationQuestions()
    for (const q of questions) {
      expect(q.options.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('all options have non-empty value and label', () => {
    const questions = getClassificationQuestions()
    for (const q of questions) {
      for (const opt of q.options) {
        expect(opt.value).toBeTruthy()
        expect(opt.label).toBeTruthy()
      }
    }
  })

  it('category is always the first question', () => {
    const questions = getClassificationQuestions()
    expect(questions[0]?.id).toBe('category')
  })

  it('category has 3 options: core_value, capability, management', () => {
    const questions = getClassificationQuestions()
    const cat = questions[0]!
    expect(cat.options.map(o => o.value)).toEqual(['core_value', 'capability', 'management'])
  })
})

// ---------------------------------------------------------------------------
// createEmptyMetadata
// ---------------------------------------------------------------------------

describe('createEmptyMetadata', () => {
  it('all fields are null', () => {
    const m = createEmptyMetadata()
    expect(m.category).toBeNull()
    expect(m.security).toBeNull()
    expect(m.platform_down).toBeNull()
    expect(m.scope).toBeNull()
    expect(m.reach).toBeNull()
    expect(m.mgmt_form_field).toBeNull()
    expect(m.mgmt_trigger).toBeNull()
    expect(m.mgmt_success).toBeNull()
    expect(m.mgmt_persistence).toBeNull()
    expect(m.mgmt_ongoing).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Condition functions — which questions are reachable
// ---------------------------------------------------------------------------

describe('question conditions', () => {
  const questions = getClassificationQuestions()
  const findQ = (id: string) => questions.find(q => q.id === id)!

  describe('core_value path', () => {
    it('category is always visible', () => {
      expect(findQ('category').condition(createEmptyMetadata())).toBe(true)
    })

    it('security is visible for core_value', () => {
      const m: Phase1Metadata = { ...createEmptyMetadata(), category: 'core_value' }
      expect(findQ('security').condition(m)).toBe(true)
    })

    it('platform_down is visible for core_value', () => {
      const m: Phase1Metadata = { ...createEmptyMetadata(), category: 'core_value' }
      expect(findQ('platform_down').condition(m)).toBe(true)
    })

    it('scope is visible for core_value', () => {
      const m: Phase1Metadata = { ...createEmptyMetadata(), category: 'core_value' }
      expect(findQ('scope').condition(m)).toBe(true)
    })

    it('reach is visible for core_value', () => {
      const m: Phase1Metadata = { ...createEmptyMetadata(), category: 'core_value' }
      expect(findQ('reach').condition(m)).toBe(true)
    })

    it('management questions are NOT visible for core_value', () => {
      const m: Phase1Metadata = { ...createEmptyMetadata(), category: 'core_value' }
      expect(findQ('mgmt_form_field').condition(m)).toBe(false)
      expect(findQ('mgmt_trigger').condition(m)).toBe(false)
    })
  })

  describe('capability path', () => {
    it('security is visible for capability', () => {
      const m: Phase1Metadata = { ...createEmptyMetadata(), category: 'capability' }
      expect(findQ('security').condition(m)).toBe(true)
    })

    it('platform_down is NOT visible for capability', () => {
      const m: Phase1Metadata = { ...createEmptyMetadata(), category: 'capability' }
      expect(findQ('platform_down').condition(m)).toBe(false)
    })

    it('scope is visible for capability', () => {
      const m: Phase1Metadata = { ...createEmptyMetadata(), category: 'capability' }
      expect(findQ('scope').condition(m)).toBe(true)
    })
  })

  describe('management path', () => {
    it('mgmt_form_field is visible for management', () => {
      const m: Phase1Metadata = { ...createEmptyMetadata(), category: 'management' }
      expect(findQ('mgmt_form_field').condition(m)).toBe(true)
    })

    it('mgmt_trigger requires form_field = false', () => {
      const m: Phase1Metadata = { ...createEmptyMetadata(), category: 'management', mgmt_form_field: false }
      expect(findQ('mgmt_trigger').condition(m)).toBe(true)
    })

    it('mgmt_trigger is NOT visible when form_field = true', () => {
      const m: Phase1Metadata = { ...createEmptyMetadata(), category: 'management', mgmt_form_field: true }
      expect(findQ('mgmt_trigger').condition(m)).toBe(false)
    })

    it('mgmt_success requires trigger = user', () => {
      const m: Phase1Metadata = { ...createEmptyMetadata(), category: 'management', mgmt_trigger: 'user' }
      expect(findQ('mgmt_success').condition(m)).toBe(true)
    })

    it('mgmt_success is NOT visible when trigger = system', () => {
      const m: Phase1Metadata = { ...createEmptyMetadata(), category: 'management', mgmt_trigger: 'system' }
      expect(findQ('mgmt_success').condition(m)).toBe(false)
    })

    it('mgmt_persistence requires success = true', () => {
      const m: Phase1Metadata = { ...createEmptyMetadata(), category: 'management', mgmt_success: true }
      expect(findQ('mgmt_persistence').condition(m)).toBe(true)
    })

    it('mgmt_ongoing requires trigger = system', () => {
      const m: Phase1Metadata = { ...createEmptyMetadata(), category: 'management', mgmt_trigger: 'system' }
      expect(findQ('mgmt_ongoing').condition(m)).toBe(true)
    })

    it('core_value questions are NOT visible for management', () => {
      const m: Phase1Metadata = { ...createEmptyMetadata(), category: 'management' }
      expect(findQ('security').condition(m)).toBe(false)
      expect(findQ('platform_down').condition(m)).toBe(false)
      expect(findQ('scope').condition(m)).toBe(false)
      expect(findQ('reach').condition(m)).toBe(false)
    })
  })
})

// ---------------------------------------------------------------------------
// applyAnswer functions
// ---------------------------------------------------------------------------

describe('applyAnswer functions', () => {
  const questions = getClassificationQuestions()
  const findQ = (id: string) => questions.find(q => q.id === id)!

  it('category applies string value', () => {
    const m = createEmptyMetadata()
    findQ('category').applyAnswer(m, 'core_value')
    expect(m.category).toBe('core_value')
  })

  it('security applies boolean', () => {
    const m = createEmptyMetadata()
    findQ('security').applyAnswer(m, 'yes')
    expect(m.security).toBe(true)
    findQ('security').applyAnswer(m, 'no')
    expect(m.security).toBe(false)
  })

  it('platform_down applies boolean', () => {
    const m = createEmptyMetadata()
    findQ('platform_down').applyAnswer(m, 'yes')
    expect(m.platform_down).toBe(true)
  })

  it('scope applies string value', () => {
    const m = createEmptyMetadata()
    findQ('scope').applyAnswer(m, 'some')
    expect(m.scope).toBe('some')
  })

  it('mgmt_trigger applies string value', () => {
    const m = createEmptyMetadata()
    findQ('mgmt_trigger').applyAnswer(m, 'system')
    expect(m.mgmt_trigger).toBe('system')
  })
})

// ---------------------------------------------------------------------------
// findNextQuestion
// ---------------------------------------------------------------------------

describe('findNextQuestion', () => {
  const questions = getClassificationQuestions()

  it('returns category as first question for empty metadata', () => {
    const result = findNextQuestion(questions, createEmptyMetadata(), 0)
    expect(result).not.toBeNull()
    expect(result!.question.id).toBe('category')
    expect(result!.index).toBe(0)
  })

  it('returns null when all questions exhausted', () => {
    const result = findNextQuestion(questions, createEmptyMetadata(), questions.length)
    expect(result).toBeNull()
  })

  it('skips invisible questions', () => {
    // After selecting management, questions 1-4 (security, platform_down, scope, reach) should be skipped
    const m: Phase1Metadata = { ...createEmptyMetadata(), category: 'management' }
    const result = findNextQuestion(questions, m, 1) // start after category
    expect(result).not.toBeNull()
    expect(result!.question.id).toBe('mgmt_form_field')
  })

  it('returns null when no more visible questions (management + form_field=yes)', () => {
    const m: Phase1Metadata = { ...createEmptyMetadata(), category: 'management', mgmt_form_field: true }
    // Start after mgmt_form_field (index 6 in the array)
    const mgmtFieldIndex = questions.findIndex(q => q.id === 'mgmt_form_field')
    const result = findNextQuestion(questions, m, mgmtFieldIndex + 1)
    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// countRemainingQuestions
// ---------------------------------------------------------------------------

describe('countRemainingQuestions', () => {
  const questions = getClassificationQuestions()

  it('counts all visible questions from start for core_value', () => {
    const m: Phase1Metadata = { ...createEmptyMetadata(), category: 'core_value' }
    // After category (index 0), remaining should be: security, platform_down, scope, reach = 4
    const count = countRemainingQuestions(questions, m, 1)
    expect(count).toBe(4)
  })

  it('counts all visible questions from start for capability', () => {
    const m: Phase1Metadata = { ...createEmptyMetadata(), category: 'capability' }
    // After category: security, scope, reach = 3 (no platform_down)
    const count = countRemainingQuestions(questions, m, 1)
    expect(count).toBe(3)
  })

  it('counts management questions correctly', () => {
    const m: Phase1Metadata = { ...createEmptyMetadata(), category: 'management' }
    // After category: mgmt_form_field = 1 (others need further conditions)
    const count = countRemainingQuestions(questions, m, 1)
    expect(count).toBe(1)
  })

  it('counts zero when no visible questions remain', () => {
    const m: Phase1Metadata = { ...createEmptyMetadata(), category: 'management', mgmt_form_field: true }
    const mgmtFieldIndex = questions.findIndex(q => q.id === 'mgmt_form_field')
    const count = countRemainingQuestions(questions, m, mgmtFieldIndex + 1)
    expect(count).toBe(0)
  })
})
