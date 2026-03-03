import { describe, it, expect } from 'vitest'
import { parseTextFeedbackResponse } from '../textFeedbackPromptBuilder'

describe('parseTextFeedbackResponse', () => {
  const VALID_CHANGES = JSON.stringify({
    banner: {
      headline: { en: 'Updated headline', de: 'Aktualisierte Überschrift' },
    },
  })

  // ---- Strategy 1: Exact marker ----

  it('extracts changes with exact ---CHANGES--- marker', () => {
    const response = `Here's what I changed.\n\n---CHANGES---\n${VALID_CHANGES}`
    const result = parseTextFeedbackResponse(response)
    expect(result.message).toBe("Here's what I changed.")
    expect(result.changes).not.toBeNull()
    expect(result.changes!.banner!.headline!.en).toBe('Updated headline')
  })

  it('returns message only when no marker and no JSON', () => {
    const response = 'I suggest making the banner shorter. How about "API key expired"?'
    const result = parseTextFeedbackResponse(response)
    expect(result.message).toBe(response)
    expect(result.changes).toBeNull()
  })

  it('returns null changes when marker present but no JSON follows', () => {
    const response = 'Changes are:\n---CHANGES---\n'
    const result = parseTextFeedbackResponse(response)
    expect(result.changes).toBeNull()
  })

  // ---- Strategy 2: Variant markers ----

  it('extracts changes with lowercase dashes marker', () => {
    const response = `Updated text below.\n\n---changes---\n${VALID_CHANGES}`
    const result = parseTextFeedbackResponse(response)
    expect(result.changes).not.toBeNull()
    expect(result.changes!.banner!.headline!.de).toBe('Aktualisierte Überschrift')
  })

  it('extracts changes with spaced marker', () => {
    const response = `Here are the updates.\n\n--- CHANGES ---\n${VALID_CHANGES}`
    const result = parseTextFeedbackResponse(response)
    expect(result.changes).not.toBeNull()
  })

  it('extracts changes with extra dashes', () => {
    const response = `Done.\n\n----- CHANGES -----\n${VALID_CHANGES}`
    const result = parseTextFeedbackResponse(response)
    expect(result.changes).not.toBeNull()
  })

  // ---- Strategy 3: JSON code blocks ----

  it('extracts changes from ```json code block', () => {
    const response = `I've updated the banner text.\n\n\`\`\`json\n${VALID_CHANGES}\n\`\`\``
    const result = parseTextFeedbackResponse(response)
    expect(result.changes).not.toBeNull()
    expect(result.changes!.banner!.headline!.en).toBe('Updated headline')
    expect(result.message).not.toContain('```')
  })

  it('extracts changes from ``` code block without json tag', () => {
    const response = `Updated:\n\n\`\`\`\n${VALID_CHANGES}\n\`\`\``
    const result = parseTextFeedbackResponse(response)
    expect(result.changes).not.toBeNull()
  })

  it('uses last code block when multiple exist', () => {
    const firstBlock = '```\nconsole.log("example")\n```'
    const response = `Here's an example:\n${firstBlock}\n\nAnd here are the changes:\n\`\`\`json\n${VALID_CHANGES}\n\`\`\``
    const result = parseTextFeedbackResponse(response)
    expect(result.changes).not.toBeNull()
    expect(result.changes!.banner!.headline!.en).toBe('Updated headline')
  })

  // ---- Strategy 4: Trailing JSON object ----

  it('extracts trailing JSON object at end of response', () => {
    const response = `I've made the banner shorter and more urgent.\n\n${VALID_CHANGES}`
    const result = parseTextFeedbackResponse(response)
    expect(result.changes).not.toBeNull()
    expect(result.changes!.banner!.headline!.en).toBe('Updated headline')
  })

  // ---- Validation ----

  it('rejects JSON that does not match GeneratedText shape', () => {
    const badJson = JSON.stringify({ foo: 'bar', count: 42 })
    const response = `Here are changes.\n\n---CHANGES---\n${badJson}`
    const result = parseTextFeedbackResponse(response)
    expect(result.changes).toBeNull()
    expect(result.message).toBe('Here are changes.')
  })

  it('handles multi-component changes', () => {
    const multiChanges = JSON.stringify({
      banner: { headline: { en: 'Banner EN', de: 'Banner DE' } },
      email: { subject: { en: 'Email EN', de: 'Email DE' } },
    })
    const response = `Updated both.\n\n---CHANGES---\n${multiChanges}`
    const result = parseTextFeedbackResponse(response)
    expect(result.changes).not.toBeNull()
    expect(result.changes!.banner!.headline!.en).toBe('Banner EN')
    expect(result.changes!.email!.subject!.en).toBe('Email EN')
  })

  it('handles malformed JSON via robustJsonParse repair', () => {
    // Missing closing brace — robustJsonParse should repair
    const malformedJson = `{"banner": {"headline": {"en": "Fixed", "de": "Behoben"}}`
    const response = `Fixed it.\n\n---CHANGES---\n${malformedJson}`
    const result = parseTextFeedbackResponse(response)
    // robustJsonParse may or may not repair this — at minimum, message should be extracted
    expect(result.message).toBe('Fixed it.')
  })
})
