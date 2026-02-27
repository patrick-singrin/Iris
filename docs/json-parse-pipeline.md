# JSON Parse Pipeline

## Overview

The `robustJsonParse()` function in `src/services/llm/storyExtractor.ts` is a multi-stage pipeline that transforms messy LLM output into valid JSON. It handles the full spectrum of quirks that local LLMs produce.

## Pipeline Stages

```
Raw LLM output
  |
  v
1. stripMarkdownFences()    — Remove ```json ... ``` wrappers and trailing text
  |
  v
2. stripJsonComments()      — Remove // and /* */ comments outside strings
  |
  v
3. fixSingleQuotes()        — Convert single-quoted JSON to double-quoted
  |
  v
4. sanitizeJsonControlChars() — Escape literal newlines, tabs, etc. inside strings
  |
  v
5. fixJsonQuirks()          — Fix trailing commas, missing values, etc.
  |
  v
6. tryRepairJson()          — Close unclosed braces/brackets for truncated responses
  |
  v
7. JSON.parse()             — Standard parse attempt
  |
  v
8. regexFallbackExtraction() — Last resort: extract items + story via regex
```

## Stage Details

### 1. `stripMarkdownFences()`

LLMs often wrap JSON in markdown code fences. This strips them. Also strips trailing conversational text after the last `}` (e.g., "I hope this helps!").

**Handles**:
```
```json
{"items":[], "story":"..."}
```
Here is the result!
```

### 2. `stripJsonComments()`

Walks character-by-character, tracking whether we're inside a string. Strips `//` line comments and `/* */` block comments that appear outside strings.

**Handles**:
```json
{
  "items": [], // no items found
  "story": "The event..." /* main narrative */
}
```

### 3. `fixSingleQuotes()`

Some LLMs produce single-quoted JSON. This converts `'` to `"` while respecting escaped quotes and apostrophes inside strings. Only activates when the input looks like single-quoted JSON (starts with `{'` or `['`).

**Handles**:
```
{'items': [{'id': 'event_kind', 'value': 'system_change'}]}
```

### 4. `sanitizeJsonControlChars()`

JSON strings cannot contain literal newlines, tabs, or other control characters. This escapes them only when they appear inside string values.

**Handles**:
```json
{"story": "Line one
Line two	with tab"}
```

### 5. `fixJsonQuirks()`

Fixes common structural issues:
- Trailing commas before `}` or `]`
- Missing values in key-value pairs (`"key": `)
- Other minor structural issues

### 6. `tryRepairJson()`

For truncated responses (LLM stopped mid-output). Two strategies:

1. **`closeJsonStructure()`** — Uses a LIFO stack to track nesting order of `{` and `[`. If the response ends mid-string, closes the string first, then pops the stack to close structures in correct order.

2. **`truncateAndClose()`** — Finds the last complete `}` and closes remaining structures from there. Falls back to second-to-last `}` if first attempt fails.

**Stack-based closing example**:
```
Input:  {"items":[{"id":"foo"
Stack:  ['{', '[', '{']
Close:  "foo"  →  }  →  ]  →  }
Result: {"items":[{"id":"foo"}]}
```

### 7. `JSON.parse()`

Standard parse. If this succeeds, we have valid JSON and return it.

### 8. `regexFallbackExtraction()`

When all repair strategies fail, extract data via regex patterns:

- **Items**: Regex matches `"id":"...", "value":"...", "description":"...", "evidence":"..."` patterns
- **Story**: Regex matches `"story":"..."` at the end of the response

Returns whatever it can extract. A partial result is better than an error.

## Test Coverage

The pipeline was validated against 14 test cases representing real LLM output patterns:

| # | Test Case | Status |
|---|-----------|--------|
| 1 | Clean JSON (no issues) | Pass |
| 2 | Wrapped in markdown code fences | Pass |
| 3 | Literal newlines inside string values | Pass |
| 4 | Trailing commas before `}` or `]` | Pass |
| 5 | Missing values in key-value pairs | Pass |
| 6 | Combined fences + newlines + trailing commas | Pass |
| 7 | Extra text after JSON | Pass |
| 8 | Truncated mid-object | Pass |
| 9 | Deeply nested with multiple quirks | Pass |
| 10 | Empty items with valid story | Pass |
| 11 | Truncated mid-string value | Pass |
| 12 | Unescaped quotes inside string values | Pass |
| 13 | Single quotes instead of double quotes | Pass |
| 14 | JSON with `//` comments | Pass |

All 14 tests pass. Tests were run via a standalone Node.js script (`test-parse-pipeline.mjs`, since deleted) that copied the pipeline functions and exercised each case.
