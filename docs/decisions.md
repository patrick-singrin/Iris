# Architectural and Design Decisions

## 1. No Placeholders in Narrative

**Decision**: The LLM-generated narrative shown to the user must use real, concrete details (service names, dates, times) — never generic placeholders like `{service_name}` or `[DATE]`.

**Why**: Placeholders make the narrative feel like a template rather than a finished draft. The whole point of the guided flow is that the user provides specifics, and the LLM turns them into polished prose.

**Implication**: The placeholder system (`src/data/placeholders.ts`, `src/data/placeholders.json`) is preserved for a future template-generation step where users can create reusable templates from completed narratives. The placeholder imports in `storyExtractor.ts` are commented out but intentionally kept.

## 2. W-Heading Narrative Format

**Decision**: Narratives use a structured W-heading format: `What:`, `Who:`, `When:`, `What to do:`.

**Why**: Consistent structure helps recipients scan event notifications quickly. These four headings cover the essential information for any operational event.

## 3. Robust JSON Parse Pipeline (Defense in Depth)

**Decision**: Instead of trusting the LLM to return clean JSON, we built a multi-stage repair pipeline that handles every common LLM output quirk.

**Why**: Local LLMs (via LM Studio) are unpredictable. In testing, we encountered:
- Markdown code fences wrapping JSON (`\`\`\`json ... \`\`\``)
- Trailing conversational text after the JSON ("I hope this helps!")
- Literal newlines and control characters inside JSON string values
- Unescaped quotes inside string values (`"the "Payment API" service"`)
- Single quotes instead of double quotes (`{'items': [...]}`)
- JavaScript-style comments (`// no items found`)
- Truncated responses (cut off mid-string or mid-object)
- Missing values and trailing commas

Each failure mode gets its own targeted fix, applied in sequence. See [JSON Parse Pipeline](./json-parse-pipeline.md) for the full technical breakdown.

## 4. Stack-Based JSON Structure Closing

**Decision**: Use a LIFO stack to track JSON nesting order instead of simple brace/bracket counters.

**Why**: When closing a truncated JSON response like `{"items":[{"id":"foo"`, counters would produce `]}}` (close all arrays then all objects), but the correct closing is `}]}` (close inner object, then array, then outer object). The stack tracks opening ORDER so closures are applied in the correct reverse order.

## 5. Regex Fallback Extraction

**Decision**: When all JSON repair strategies fail, extract items and story via regex as an ultimate fallback.

**Why**: Some LLM outputs are so malformed (e.g., unescaped quotes that break string boundary detection) that no JSON repair can fix them. Rather than showing the user an error, we regex-extract whatever structured data we can. A partial result is better than no result.

## 6. Shared `robustJsonParse()` for Both Parsers

**Decision**: Both `parseAnalysisResponse()` and `parseTextAnalysisResponse()` use the same `robustJsonParse()` function.

**Why**: Previously, `parseTextAnalysisResponse()` was missing `fixJsonQuirks()` which caused certain responses to fail only in text-analysis mode. Unifying through a single pipeline ensures both paths get all fixes.

## 7. Local LLM (LM Studio) vs Cloud API

**Decision**: Story generation runs against a local LLM via LM Studio, not a cloud API.

**Why**: Data privacy — event details may contain sensitive operational information. Running locally keeps data on-premises. The trade-off is less reliable JSON output from smaller models, which motivated the robust parse pipeline.

## 8. Progressive Narrative Updates

**Decision**: The narrative updates after every question answer, not just at the end.

**Why**: Users get immediate feedback on how their answers shape the notification. This helps them realize if they need to add more detail or correct something before moving on.

**Implication**: The story text flow was fixed to prevent the LLM's response from immediately overwriting a freshly-typed user answer (race condition between user input and LLM response rendering).

## 9. Classification Fields with Allowed Values

**Decision**: Classification-critical fields (event_kind, user_impact, timing, etc.) have strict allowed values defined in code.

**Why**: The LLM must map user input to a fixed set of classification values. The prompt includes the allowed values, and the parser validates against them. This ensures downstream systems get structured, predictable data regardless of LLM creativity.

## 10. No Vue Router

**Decision**: View switching is handled by a simple `activeView` ref in `appStore.ts`.

**Why**: The app is a single-purpose tool, not a multi-page SPA. A full router adds complexity without benefit. Views are switched programmatically.
