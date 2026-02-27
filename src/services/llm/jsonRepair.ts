/**
 * JSON Repair Pipeline — handles common LLM output quirks.
 *
 * Each function targets one class of malformed JSON. They are applied
 * in sequence by `robustJsonParse()`, which is the single entry point
 * used by both `parseAnalysisResponse()` and `parseTextAnalysisResponse()`.
 *
 * See docs/json-parse-pipeline.md for the full technical breakdown.
 */

// ---------------------------------------------------------------------------
// Stage 1: Strip markdown code fences
// ---------------------------------------------------------------------------

/**
 * Strip markdown code fences from LLM response.
 * Handles both complete fences (```json ... ```) and truncated responses
 * where the closing fence is missing (e.g. due to maxTokens cutoff).
 */
export function stripMarkdownFences(raw: string): string {
  let str = raw.trim()

  // Try complete fence first (opening + closing)
  const fenceMatch = str.match(/```(?:json)?\s*([\s\S]*)\s*```\s*$/)
  if (fenceMatch) return fenceMatch[1]!.trim()

  // Truncated response — opening fence but no closing fence
  if (str.startsWith('```')) {
    str = str.replace(/^```(?:json)?\s*\n?/, '')
  }

  // Remove trailing incomplete fence (e.g. response ends with "```" or "``")
  str = str.replace(/`{1,3}\s*$/, '')

  // Strip any trailing text after the last } (e.g. "I hope this helps!")
  const lastBrace = str.lastIndexOf('}')
  if (lastBrace >= 0 && lastBrace < str.length - 1) {
    const trailing = str.substring(lastBrace + 1).trim()
    // Only strip if what follows doesn't look like more JSON
    if (trailing && !/^[,\]}\[]/.test(trailing)) {
      str = str.substring(0, lastBrace + 1)
    }
  }

  return str.trim()
}

// ---------------------------------------------------------------------------
// Stage 2: Strip comments
// ---------------------------------------------------------------------------

/**
 * Strip single-line (//) and multi-line comments from JSON.
 * Only strips comments that are OUTSIDE string values.
 */
export function stripJsonComments(str: string): string {
  let result = ''
  let inString = false
  let escape = false

  for (let i = 0; i < str.length; i++) {
    const ch = str[i]

    if (escape) { result += ch; escape = false; continue }
    if (ch === '\\' && inString) { result += ch; escape = true; continue }
    if (ch === '"') { inString = !inString; result += ch; continue }

    if (!inString) {
      // Single-line comment: skip to end of line
      if (ch === '/' && str[i + 1] === '/') {
        const eol = str.indexOf('\n', i)
        i = eol >= 0 ? eol - 1 : str.length
        continue
      }
      // Multi-line comment: skip to closing */
      if (ch === '/' && str[i + 1] === '*') {
        const end = str.indexOf('*/', i + 2)
        i = end >= 0 ? end + 1 : str.length
        continue
      }
    }

    result += ch
  }

  return result
}

// ---------------------------------------------------------------------------
// Stage 3: Fix single quotes
// ---------------------------------------------------------------------------

/**
 * Convert single-quoted JSON strings to double-quoted.
 * Only applies when the input appears to use single quotes for structure.
 */
export function fixSingleQuotes(str: string): string {
  // Only apply if the string looks like single-quoted JSON
  // (starts with {' or [' and doesn't start with {" or [")
  const trimmed = str.trim()
  if (!/^[{[]\s*'/.test(trimmed)) return str

  let result = ''
  let inString = false
  let quote = ''
  let escape = false

  for (let i = 0; i < str.length; i++) {
    const ch = str[i]

    if (escape) { result += ch; escape = false; continue }
    if (ch === '\\') { result += ch; escape = true; continue }

    if (!inString) {
      if (ch === "'") {
        result += '"'
        inString = true
        quote = "'"
        continue
      }
      if (ch === '"') {
        result += '"'
        inString = true
        quote = '"'
        continue
      }
    } else {
      if (ch === quote) {
        result += '"'
        inString = false
        continue
      }
      // Escape double quotes inside single-quoted strings
      if (quote === "'" && ch === '"') {
        result += '\\"'
        continue
      }
    }

    result += ch
  }

  return result
}

// ---------------------------------------------------------------------------
// Stage 4: Sanitize control characters
// ---------------------------------------------------------------------------

/**
 * Escape literal control characters (newlines, tabs, etc.) that appear
 * inside JSON string values. LLMs often output raw newlines in strings
 * instead of the required \\n escape sequence.
 */
export function sanitizeJsonControlChars(str: string): string {
  let result = ''
  let inString = false
  let escape = false

  for (let i = 0; i < str.length; i++) {
    const ch = str[i]

    if (escape) {
      result += ch
      escape = false
      continue
    }

    if (ch === '\\' && inString) {
      result += ch
      escape = true
      continue
    }

    if (ch === '"') {
      inString = !inString
      result += ch
      continue
    }

    if (inString) {
      if (ch === '\n') { result += '\\n'; continue }
      if (ch === '\r') { result += '\\r'; continue }
      if (ch === '\t') { result += '\\t'; continue }
    }

    result += ch
  }

  return result
}

// ---------------------------------------------------------------------------
// Stage 5: Fix common quirks
// ---------------------------------------------------------------------------

/**
 * Fix common LLM JSON quirks:
 * - Missing values: `"key":}` or `"key":,` → `"key":null}` / `"key":null,`
 * - Trailing commas: `[...,]` or `{...,}` → `[...]` / `{...}`
 * - Markdown bold markers inside values: `**text**` → `text`
 */
export function fixJsonQuirks(str: string): string {
  let fixed = str.replace(/:\s*([,}\]])/g, ':null$1')
  fixed = fixed.replace(/,\s*([}\]])/g, '$1')
  fixed = fixed.replace(/"([^"]*?\*\*[^"]*?)"/g, (match) => {
    return match.replace(/\*\*/g, '')
  })
  return fixed
}

// ---------------------------------------------------------------------------
// Stage 6: Structure repair (truncated responses)
// ---------------------------------------------------------------------------

/** Close unclosed strings, brackets, and braces in correct nesting order. */
export function closeJsonStructure(str: string): string {
  let inString = false
  let escape = false
  const stack: string[] = [] // track opening order

  for (const ch of str) {
    if (escape) { escape = false; continue }
    if (ch === '\\' && inString) { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') stack.push('{')
    else if (ch === '}') { if (stack.length && stack[stack.length - 1] === '{') stack.pop() }
    else if (ch === '[') stack.push('[')
    else if (ch === ']') { if (stack.length && stack[stack.length - 1] === '[') stack.pop() }
  }

  let result = str
  if (inString) result += '"'
  // Remove trailing comma before we close structures
  result = result.replace(/,\s*$/, '')
  // Close in reverse nesting order (LIFO)
  while (stack.length > 0) {
    const opener = stack.pop()
    result += opener === '{' ? '}' : ']'
  }
  return result
}

/** Truncate at last complete `}` and close remaining structures. */
function truncateAndClose(str: string): string | null {
  const lastBrace = str.lastIndexOf('}')
  if (lastBrace <= 0) return null

  const truncated = str.substring(0, lastBrace + 1)
  const closed = closeJsonStructure(truncated)
  try { JSON.parse(closed); return closed } catch { /* continue */ }

  // Try second-to-last }
  const secondLast = str.lastIndexOf('}', lastBrace - 1)
  if (secondLast > 0) {
    const truncated2 = str.substring(0, secondLast + 1)
    const closed2 = closeJsonStructure(truncated2)
    try { JSON.parse(closed2); return closed2 } catch { /* give up */ }
  }

  return null
}

/**
 * Try to repair truncated JSON by closing open braces/brackets.
 * Returns the repaired string or null if unfixable.
 */
export function tryRepairJson(str: string): string | null {
  try {
    JSON.parse(str)
    return str
  } catch {
    // Strategy 1: close unclosed structures
    const repaired = closeJsonStructure(str)
    if (repaired) {
      try { JSON.parse(repaired); return repaired } catch { /* try next */ }
    }

    // Strategy 2: truncate at last complete item and close
    return truncateAndClose(str)
  }
}

// ---------------------------------------------------------------------------
// Stage 7: Regex fallback extraction
// ---------------------------------------------------------------------------

export interface RegexFallbackResult {
  items: Array<{ id: string; value: string; description: string; evidence: string }>
  story: string | null
}

/**
 * Ultimate fallback: extract items and story from malformed JSON via regex.
 * Used when all other repair strategies fail (e.g. unescaped quotes).
 */
export function regexFallbackExtraction(raw: string): RegexFallbackResult {
  const items: Array<{ id: string; value: string; description: string; evidence: string }> = []

  // Extract individual item objects using a lenient pattern
  const itemPattern = /"id"\s*:\s*"([^"]*?)"\s*,\s*"value"\s*:\s*"([^"]*?)"\s*,\s*"description"\s*:\s*"([^"]*?)"\s*,\s*"evidence"\s*:\s*"([^"]*?)"/g
  let m
  while ((m = itemPattern.exec(raw)) !== null) {
    items.push({ id: m[1]!, value: m[2]!, description: m[3]!, evidence: m[4]! })
  }

  // Extract story string — find "story" : " then capture until the closing quote
  // that's followed by whitespace and } (end of root object)
  let story: string | null = null
  const storyMatch = raw.match(/"story"\s*:\s*"([\s\S]*?)"\s*\}?\s*(?:```)?$/)
  if (storyMatch) {
    story = storyMatch[1]!
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\t/g, '\t')
      .trim() || null
  }

  return { items, story }
}

// ---------------------------------------------------------------------------
// Public entry point: full pipeline
// ---------------------------------------------------------------------------

/**
 * Run the full repair pipeline on a raw LLM response string and return
 * a parsed object. Throws only if all strategies (including regex
 * fallback) fail to extract anything useful.
 */
export function robustJsonParse(raw: string): Record<string, unknown> {
  let jsonStr = stripMarkdownFences(raw)
  jsonStr = stripJsonComments(jsonStr)
  jsonStr = fixSingleQuotes(jsonStr)
  jsonStr = sanitizeJsonControlChars(jsonStr)
  jsonStr = fixJsonQuirks(jsonStr)

  const repaired = tryRepairJson(jsonStr)
  if (repaired) jsonStr = repaired

  try {
    return JSON.parse(jsonStr)
  } catch {
    // Regex fallback — extract items and story from malformed JSON
    const fallback = regexFallbackExtraction(raw)
    if (fallback.items.length > 0 || fallback.story) {
      console.warn('[jsonRepair] Used regex fallback for malformed JSON')
      return { items: fallback.items, story: fallback.story }
    }
    throw new Error('Failed to parse response after all repair strategies')
  }
}
