import { describe, it, expect } from 'vitest'
import {
  stripMarkdownFences,
  stripJsonComments,
  fixSingleQuotes,
  sanitizeJsonControlChars,
  fixJsonQuirks,
  closeJsonStructure,
  tryRepairJson,
  regexFallbackExtraction,
  robustJsonParse,
} from '../jsonRepair'

// ---------------------------------------------------------------------------
// stripMarkdownFences
// ---------------------------------------------------------------------------

describe('stripMarkdownFences', () => {
  it('removes complete ```json ... ``` fences', () => {
    const input = '```json\n{"items":[]}\n```'
    expect(stripMarkdownFences(input)).toBe('{"items":[]}')
  })

  it('removes complete ``` ... ``` fences (no language tag)', () => {
    const input = '```\n{"items":[]}\n```'
    expect(stripMarkdownFences(input)).toBe('{"items":[]}')
  })

  it('handles truncated response (opening fence, no closing)', () => {
    const input = '```json\n{"items":[{"id":"foo"'
    expect(stripMarkdownFences(input)).toBe('{"items":[{"id":"foo"')
  })

  it('strips trailing conversational text after JSON', () => {
    const input = '{"items":[]} I hope this helps!'
    expect(stripMarkdownFences(input)).toBe('{"items":[]}')
  })

  it('preserves valid JSON without fences', () => {
    const input = '{"items":[],"story":"hello"}'
    expect(stripMarkdownFences(input)).toBe('{"items":[],"story":"hello"}')
  })

  it('removes trailing incomplete fence (``)', () => {
    const input = '{"items":[]}\n``'
    expect(stripMarkdownFences(input)).toBe('{"items":[]}')
  })

  it('does not strip trailing text that looks like JSON', () => {
    const input = '{"a":1},{"b":2}'
    // The comma after } looks like more JSON, so it should not be stripped
    expect(stripMarkdownFences(input)).toBe('{"a":1},{"b":2}')
  })
})

// ---------------------------------------------------------------------------
// stripJsonComments
// ---------------------------------------------------------------------------

describe('stripJsonComments', () => {
  it('removes single-line // comments', () => {
    const input = '{"items":[] // no items found\n}'
    expect(JSON.parse(stripJsonComments(input))).toEqual({ items: [] })
  })

  it('removes multi-line /* */ comments', () => {
    const input = '{"items":[] /* empty */ }'
    expect(JSON.parse(stripJsonComments(input))).toEqual({ items: [] })
  })

  it('does not strip // inside string values', () => {
    const input = '{"url":"https://example.com"}'
    expect(stripJsonComments(input)).toBe(input)
  })

  it('handles unterminated multi-line comments gracefully', () => {
    const input = '{"items":[] /* never closed'
    const result = stripJsonComments(input)
    // Should strip the comment content (reaches end of string)
    expect(result).toBe('{"items":[] ')
  })
})

// ---------------------------------------------------------------------------
// fixSingleQuotes
// ---------------------------------------------------------------------------

describe('fixSingleQuotes', () => {
  it('converts single-quoted keys and values to double-quoted', () => {
    const input = "{'items':[],'story':'hello'}"
    expect(JSON.parse(fixSingleQuotes(input))).toEqual({ items: [], story: 'hello' })
  })

  it('does not modify already double-quoted JSON', () => {
    const input = '{"items":[]}'
    expect(fixSingleQuotes(input)).toBe(input)
  })

  it('escapes double quotes inside single-quoted strings', () => {
    const input = "{'text':'the \"Payment API\" service'}"
    const result = fixSingleQuotes(input)
    expect(JSON.parse(result).text).toBe('the "Payment API" service')
  })

  it('skips strings that do not start with single-quoted JSON', () => {
    const input = 'not json at all'
    expect(fixSingleQuotes(input)).toBe(input)
  })
})

// ---------------------------------------------------------------------------
// sanitizeJsonControlChars
// ---------------------------------------------------------------------------

describe('sanitizeJsonControlChars', () => {
  it('escapes literal newlines inside string values', () => {
    const input = '{"story":"line1\nline2"}'
    const result = sanitizeJsonControlChars(input)
    expect(JSON.parse(result).story).toBe('line1\nline2')
  })

  it('escapes literal tabs inside string values', () => {
    const input = '{"story":"col1\tcol2"}'
    const result = sanitizeJsonControlChars(input)
    expect(JSON.parse(result).story).toBe('col1\tcol2')
  })

  it('escapes literal carriage returns', () => {
    const input = '{"story":"line1\r\nline2"}'
    const result = sanitizeJsonControlChars(input)
    expect(JSON.parse(result).story).toBe('line1\r\nline2')
  })

  it('does not double-escape already-escaped sequences', () => {
    const input = '{"story":"line1\\nline2"}'
    const result = sanitizeJsonControlChars(input)
    expect(result).toBe(input)
  })

  it('does not touch newlines outside strings', () => {
    const input = '{\n  "items": []\n}'
    const result = sanitizeJsonControlChars(input)
    expect(JSON.parse(result)).toEqual({ items: [] })
  })
})

// ---------------------------------------------------------------------------
// fixJsonQuirks
// ---------------------------------------------------------------------------

describe('fixJsonQuirks', () => {
  it('fixes missing values (":}" → ":null}")', () => {
    const input = '{"key":}'
    expect(JSON.parse(fixJsonQuirks(input))).toEqual({ key: null })
  })

  it('fixes missing values before comma (":," → ":null,")', () => {
    const input = '{"a":,"b":"ok"}'
    expect(JSON.parse(fixJsonQuirks(input))).toEqual({ a: null, b: 'ok' })
  })

  it('removes trailing commas in arrays', () => {
    const input = '{"items":["a","b",]}'
    expect(JSON.parse(fixJsonQuirks(input))).toEqual({ items: ['a', 'b'] })
  })

  it('removes trailing commas in objects', () => {
    const input = '{"a":"1","b":"2",}'
    expect(JSON.parse(fixJsonQuirks(input))).toEqual({ a: '1', b: '2' })
  })

  it('strips markdown bold markers inside string values', () => {
    const input = '{"text":"the **Payment API** service"}'
    expect(JSON.parse(fixJsonQuirks(input))).toEqual({ text: 'the Payment API service' })
  })
})

// ---------------------------------------------------------------------------
// closeJsonStructure
// ---------------------------------------------------------------------------

describe('closeJsonStructure', () => {
  it('closes unclosed object', () => {
    const input = '{"items":[]'
    const result = closeJsonStructure(input)
    expect(JSON.parse(result)).toEqual({ items: [] })
  })

  it('closes nested structures in correct LIFO order', () => {
    // {"items":[{"id":"foo" → should close with }]}
    const input = '{"items":[{"id":"foo"'
    const result = closeJsonStructure(input)
    expect(JSON.parse(result)).toEqual({ items: [{ id: 'foo' }] })
  })

  it('closes unclosed string before closing structures', () => {
    const input = '{"story":"truncated text'
    const result = closeJsonStructure(input)
    expect(JSON.parse(result)).toEqual({ story: 'truncated text' })
  })

  it('removes trailing comma before closing', () => {
    const input = '{"items":["a","b",'
    const result = closeJsonStructure(input)
    expect(JSON.parse(result)).toEqual({ items: ['a', 'b'] })
  })
})

// ---------------------------------------------------------------------------
// tryRepairJson
// ---------------------------------------------------------------------------

describe('tryRepairJson', () => {
  it('returns valid JSON as-is', () => {
    const input = '{"items":[]}'
    expect(tryRepairJson(input)).toBe(input)
  })

  it('repairs truncated JSON by closing structures', () => {
    const input = '{"items":[{"id":"foo"'
    const result = tryRepairJson(input)
    expect(result).not.toBeNull()
    expect(JSON.parse(result!)).toEqual({ items: [{ id: 'foo' }] })
  })

  it('repairs by truncating at last complete object', () => {
    const input = '{"items":[{"id":"a"},{"id":"b' // second item truncated
    const result = tryRepairJson(input)
    expect(result).not.toBeNull()
    const parsed = JSON.parse(result!)
    // Should at least preserve the first complete item
    expect(parsed.items.length).toBeGreaterThanOrEqual(1)
    expect(parsed.items[0].id).toBe('a')
  })

  it('returns null for completely unparseable input', () => {
    const input = 'not json at all'
    expect(tryRepairJson(input)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// regexFallbackExtraction
// ---------------------------------------------------------------------------

describe('regexFallbackExtraction', () => {
  it('extracts items from malformed JSON', () => {
    const input = '{"items":[{"id":"event_kind","value":"system_change","description":"API rotation","evidence":"rotating API keys"}]}'
    const result = regexFallbackExtraction(input)
    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toEqual({
      id: 'event_kind',
      value: 'system_change',
      description: 'API rotation',
      evidence: 'rotating API keys',
    })
  })

  it('extracts story from malformed JSON', () => {
    const input = '{"items":[],"story":"What:\\nSomething happened"}'
    const result = regexFallbackExtraction(input)
    expect(result.story).toBe('What:\nSomething happened')
  })

  it('returns empty result for gibberish', () => {
    const result = regexFallbackExtraction('totally broken output')
    expect(result.items).toHaveLength(0)
    expect(result.story).toBeNull()
  })

  it('extracts multiple items', () => {
    const input = '{"items":[{"id":"event_kind","value":"system_change","description":"change","evidence":"change"},{"id":"timing","value":"now","description":"immediate","evidence":"right now"}]}'
    const result = regexFallbackExtraction(input)
    expect(result.items).toHaveLength(2)
    expect(result.items[0]!.id).toBe('event_kind')
    expect(result.items[1]!.id).toBe('timing')
  })
})

// ---------------------------------------------------------------------------
// robustJsonParse — full pipeline integration tests
// ---------------------------------------------------------------------------

describe('robustJsonParse', () => {
  it('parses clean JSON', () => {
    const input = '{"items":[],"story":"What:\\nTest"}'
    const result = robustJsonParse(input)
    expect(result.items).toEqual([])
    expect(result.story).toBe('What:\nTest')
  })

  it('handles markdown-fenced JSON', () => {
    const input = '```json\n{"items":[],"story":"hello"}\n```'
    const result = robustJsonParse(input)
    expect(result.items).toEqual([])
  })

  it('handles single-quoted JSON', () => {
    const input = "{'items':[],'story':'hello'}"
    const result = robustJsonParse(input)
    expect(result.items).toEqual([])
    expect(result.story).toBe('hello')
  })

  it('handles JSON with comments', () => {
    const input = '{"items":[] // empty\n,"story":"hello"}'
    const result = robustJsonParse(input)
    expect(result.story).toBe('hello')
  })

  it('handles literal newlines in string values', () => {
    const input = '{"items":[],"story":"What:\nSomething\n\nWho:\nEveryone"}'
    const result = robustJsonParse(input)
    expect(result.story).toBe('What:\nSomething\n\nWho:\nEveryone')
  })

  it('handles trailing commas', () => {
    const input = '{"items":["a","b",],"story":"test",}'
    const result = robustJsonParse(input)
    expect(result.items).toEqual(['a', 'b'])
  })

  it('handles truncated response (closes structures)', () => {
    const input = '{"items":[{"id":"event_kind","value":"system_change","description":"change","evidence":"we are changing'
    const result = robustJsonParse(input)
    expect(Array.isArray(result.items)).toBe(true)
  })

  it('handles markdown fences + trailing text', () => {
    const input = '```json\n{"items":[],"story":"test"}\n```\nI hope this helps!'
    const result = robustJsonParse(input)
    expect(result.story).toBe('test')
  })

  it('handles missing values and trailing commas combined', () => {
    const input = '{"items":[],"story":,"extra":}'
    const result = robustJsonParse(input)
    expect(result.items).toEqual([])
    expect(result.story).toBeNull()
  })

  it('handles bold markdown inside values', () => {
    const input = '{"items":[{"id":"what_happened","value":"**API** rotation","description":"API change","evidence":"rotating **API** keys"}]}'
    const result = robustJsonParse(input)
    const items = result.items as Array<{ value: string; evidence: string }>
    expect(items[0]!.value).toBe('API rotation')
    expect(items[0]!.evidence).toBe('rotating API keys')
  })

  it('falls back to regex extraction when JSON is unrepairable', () => {
    // Unescaped quotes break all JSON repair strategies
    const input = '{"items":[{"id":"what_happened","value":"the "Payment API" broke","description":"API failure","evidence":"Payment API broke"}],"story":"What:\\nThe Payment API broke"}'
    const result = robustJsonParse(input)
    // Regex fallback should extract the story at minimum
    expect(result.story || result.items).toBeTruthy()
  })

  it('throws on completely empty/gibberish input', () => {
    expect(() => robustJsonParse('completely broken garbage')).toThrow(
      'Failed to parse response after all repair strategies',
    )
  })

  it('handles story as object instead of string', () => {
    const input = '{"items":[],"story":{"headline":"Test","content":["line1","line2"]}}'
    const result = robustJsonParse(input)
    // robustJsonParse just parses — the story-as-object handling is in storyExtractor
    expect(result.story).toEqual({ headline: 'Test', content: ['line1', 'line2'] })
  })
})
