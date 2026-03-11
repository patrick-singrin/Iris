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
