# Architectural and Design Decisions

## 1. Placeholders in Channel Text, Real Values in Narrative

**Decision**: The LLM-generated **narrative** uses real, concrete details (service names, dates, times). The LLM-generated **channel text** (banner, email, dashboard, status page) uses `{placeholder}` tokens instead of concrete values.

**Why**: The narrative is the user's working draft — it should read as finished prose with real details. Channel text, however, is output that gets deployed across multiple event instances. Using placeholders like `{start-time}` and `{service-name}` makes the text reusable as a template.

**How**: `placeholders.json` defines all available placeholders with `examples` arrays that teach the LLM which concrete values to substitute. The text generator prompt (`storyTextGenerator.ts`) instructs the LLM to actively replace real values with placeholder tokens. The system prompt (`promptBuilder.ts`) reinforces this rule.

**History**: Originally (2026-02-26) this decision was "no placeholders anywhere." Updated 2026-03-02 to enable placeholders in channel text output.

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

## 11. Temporal Framing — Events Are Present/Past, Never Future

**Decision**: All generated text assumes the event IS happening right now or HAS JUST happened. Future tense is never used for the default case.

**Why**: Iris is a tool for documenting events that are in progress or just occurred — incident alerts, outages, completed maintenance. The core operating model is reactive (something happened → communicate it), not predictive. Using future tense ("will be unavailable") contradicts the tool's purpose and confuses recipients.

**Exception**: Scheduled events with escalation steps allow future framing ONLY in early escalation steps (e.g., "1 week before"). The at-event step ("When it occurs") still uses present tense.

**Enforcement**: The rule is documented in `content-design-principles.md` (which is injected into the LLM system prompt) and reinforced with explicit temporal framing instructions in both `promptBuilder.ts` and `storyTextGenerator.ts`.

**History**: Added 2026-03-04 after user testing revealed generated text using future dates for events that should be framed as current.

## 12. Placeholder Enforcement in Channel Text

**Decision**: Channel text (banner, dashboard, email, status page) MUST use `{placeholder}` tokens for all variable values. Concrete dates, times, service names, URLs, versions, and regions must never appear in channel output.

**Why**: Channel text is deployed across multiple event instances and should be reusable as a template. Concrete values leak context that makes the text single-use. Placeholders like `{date}` and `{service-name}` make the output a proper template that can be populated per-event.

**Relationship to Decision #1**: Decision #1 established the narrative/channel split (real values in narrative, placeholders in channel text). This decision strengthens enforcement after testing showed the LLM sometimes ignores placeholder instructions, especially with the local 14B model.

**Enforcement**: The rule is documented in `content-design-principles.md` and reinforced with "HARD REQUIREMENT" language in both `promptBuilder.ts` (system prompt) and `storyTextGenerator.ts` (user prompt). A post-processing placeholder replacement step may be added as a safety net in the future.

**History**: Added 2026-03-04 after user testing revealed generated channel text with concrete values instead of placeholder tokens.

## 13. Deterministic Classification via Decision Trees (Phase 1)

**Decision**: Replace LLM-based event classification with two chained, deterministic decision trees. Users click through 2–7 structured questions to classify event type and severity before the LLM interview starts.

**Why**: LLM-based classification was unreliable — the model frequently misinterpreted scope and severity. For example, "Users can set API Key auto rotation" was classified as impacting "all users" when it clearly affects a single user. Explicit user selections eliminate guesswork and give accurate, reproducible classification every time.

**How**: Two JSON-based trees are walked sequentially:
1. **Information-Type Tree** (`decision-tree_information-type.json`) — 5 question nodes, classifies into one of 6 types (Feedback, Validation Messages, Error & Warnings, Transactional Confirmation, Status Display, Notification).
2. **Notification-Severity Tree** (`decision-tree_notification-severity.json`) — 6 question nodes, only entered when type = "Notification". Determines CRITICAL / HIGH / MEDIUM / LOW severity with channel recommendations.

Trees are chained via a `continueWith` field on result nodes. The `classificationStore.ts` manages tree walking, and the transition between trees is seamless — the user sees one continuous question flow.

**Trade-off**: Users answer a few more explicit questions upfront, but classification accuracy is 100% by definition (the user chose it). The LLM interview that follows (Phase 2) can focus on extraction and narrative quality rather than trying to infer classification from freeform text.

**History**: Added 2026-03-12. Motivated by persistent LLM classification errors in pipeline evaluation.

## 14. Progressive Classification Narrative (W-Headings from Tree Answers)

**Decision**: Build a structured W-heading narrative progressively during classification, before any LLM involvement. Each tree answer maps to a sentence in one of the four W-heading sections (What / Who / When / What to do).

**Why**: The narrative textarea in the sidebar would be empty during the entire classification phase (2–7 questions). This feels broken — the user sees no feedback. Instead, a rules-based mapper (`classificationNarrativeBuilder.ts`) translates each answer into a plain-English sentence and slots it into the correct W-heading section. The narrative grows in real time as the user clicks options.

**How**: A mapping table covers all 11 question nodes across both trees. Each mapper function takes the selected option label, matches it with `string.includes()`, and returns a `NarrativeContribution` specifying:
- Which section it belongs to (`what`, `who`, `when`, `whatToDo`)
- The text to insert
- Whether to `set` (replace) or `append` (add detail after existing text)

The `When:` section is hardcoded to `NOW` because events in Iris are always happening right now (see Decision #11). When classification completes, the narrative is seeded into the editable textarea as the starting point for Phase 2.

**Example**: After answering "No — it happens in the background" → "A specific event or announcement" → "No — some or all services work" → "No" → "No — they're blocked" → "Many users", the narrative reads:
```
What:
A background system event occurred. An event notification needs to be communicated to users. Part of the platform is still operational.

Who:
Users are blocked from completing their tasks. Many users are affected.

When:
NOW
```

**History**: Added 2026-03-12. Part of the Phase 1 classification flow implementation.

## 15. Simplified Channel Names in Classification Results

**Decision**: Channel names in classification results use short labels — `Banner`, `Dashboard`, `E-Mail`, `Status Page` — not descriptive variants like `Banner (persistent, must acknowledge)` or `Email (High Importance)`.

**Why**: The descriptive names were useful during internal design (to distinguish banner types) but confusing in the user-facing ClassificationTile. Users don't need to know whether a banner is "persistent, must acknowledge" vs. "persistent, dismissible" — that's a downstream implementation detail. Short names are clearer and match the Figma designs.

**How**: Updated all result nodes in `decision-tree_notification-severity.json` to use simplified channel names. Also unified email naming to `E-Mail` (matching Telekom convention) and fixed the `assessChannelQuality()` substring matcher in `story-classification.ts` to use `channel.includes('Mail')` instead of `channel.includes('Email')`.

**History**: Added 2026-03-12. Changed after Figma design review showed clean, short channel tags.

## 16. ClassificationTile — No Tone Section

**Decision**: The ClassificationTile in the sidebar shows only Information Type, Severity, and Channels. There is no Tone section.

**Why**: Tone was part of an earlier design iteration but was removed from the Figma designs (node `209:4830`). The classification trees don't produce a tone value, and tone is better addressed during text generation (Phase 3) where the LLM can adapt tone to channel constraints.

**How**: Removed the `tile-classification__bottom` flex wrapper that held Channels and Tone side-by-side. Channels became a standalone section, direct child of the root container. Removed `story.tone` i18n keys from both `en.ts` and `de.ts`.

**History**: Added 2026-03-12. Aligned with Figma design for the classification sidebar.
