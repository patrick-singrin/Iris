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

## 16. Service vs. Management UI Domain Split (Classification Q0)

**Decision**: Add a domain context question (Q0) as the new entry point of the information-type classification tree. Before asking about form fields or triggers, ask: "Is this about the service your product provides, or about the interface where users manage it?"

**Why (the crucial insight)**: The LLM Serving platform has two fundamentally different communication contexts:
- **Service domain** — The API itself: outages, degradation, rate limits, model deprecation, scheduled maintenance, auto-rotated API keys. These are events the system produces, affecting API consumers.
- **Management UI domain** — The web console: form validation, settings changes, API key creation flows, billing configuration. These are events during direct user interaction.

This split matters because:
1. **Type distribution differs per domain.** Service events cluster toward Notification and Status Display. Management events cluster toward Validation, Feedback, Error, and Transactional Confirmation. Knowing the domain up front prunes irrelevant branches.
2. **Channels differ.** Service events → email, banner, dashboard, status page. Management events → inline validation, toasts, modals.
3. **Severity only applies to Service events.** A Management UI Validation Message doesn't need severity. A Service Notification does. The domain split determines whether to chain to the severity tree.
4. **A single feature can produce events in both domains.** Example: "API key with 30-day auto-rotation" — the creation (form + confirmation) is Management UI; the auto-rotation event (system acted) is Service. The domain is determined by the *event context*, not the feature.

**Research backing:**
- IBM Carbon: "task-generated vs. system-generated" as primary organizing dimension
- Salesforce Lightning: Step 1 is "system-type vs. feedback-type"
- Lyft / Linzi Berry: "Informative vs. Decisional" as first split
- Stripe: Completely separate notification systems for service health alerts vs. dashboard management notifications
- Control plane / data plane architecture: the Management UI is the control plane; the API is the data plane

**How**: Added `domain_context` as the new entry node in `decision-tree_information-type.json`. Two options: "Service — something about the API or platform" vs. "Management — something about the interface." Both route to the existing `form_field_check` node (Management) or skip straight to `proximate_trigger` (Service), since Service events never involve form field validation.

**History**: Added 2026-03-12. Emerged from discussion about API key auto-rotation as a scenario spanning both domains. The domain split was identified as crucial — without it, service events walk through irrelevant UI-focused questions.

## 17. Severity Classification Assumes NOW (When = NOW, Escalation Is Separate)

**Decision**: Severity classification always assumes the event IS happening right now, at peak impact. Timing-based urgency (lead time, advance notice) is an escalation concern, not a classification concern.

**Why**: Classifying severity at peak impact means the severity rating is stable — a "scheduled platform maintenance" is CRITICAL because when it happens, the whole platform is down. The severity doesn't change based on whether you're documenting it 30 days in advance or during the outage. What changes is the *urgency of communication*, which is a Phase 3 escalation concern.

If severity incorporated timing, you'd need to reclassify the same event repeatedly as the countdown progresses (30 days out → LOW, 5 days → MEDIUM, tomorrow → HIGH, during → CRITICAL). This is error-prone and defeats the purpose of one-time classification.

**The separation:**
- **Phase 1 (Classification)**: What type? What severity at peak impact? → `When = NOW`
- **Phase 2 (Description)**: What happened? Who's affected? Details.
- **Phase 3 (Escalation)**: Communication timeline — different channels activate at different lead times, all using the same underlying severity.

**Research backing**: PagerDuty's "always assume the worst" principle. Google SRE's separation of impact assessment from response urgency. The severity tree description already stated this: "When is always NOW — when someone documents an event in Iris, the event exists now. Lead time and delivery scheduling are Phase 3 (escalation) concerns, not classification concerns."

**History**: Added 2026-03-12. Confirmed after discussion about whether timing should affect severity. Concluded that severity is intrinsic (impact at peak) while urgency is extrinsic (distance to the event), and these must remain separate.

## 18. ClassificationTile — No Tone Section

**Decision**: The ClassificationTile in the sidebar shows only Information Type, Severity, and Channels. There is no Tone section.

**Why**: Tone was part of an earlier design iteration but was removed from the Figma designs (node `209:4830`). The classification trees don't produce a tone value, and tone is better addressed during text generation (Phase 3) where the LLM can adapt tone to channel constraints.

**How**: Removed the `tile-classification__bottom` flex wrapper that held Channels and Tone side-by-side. Channels became a standalone section, direct child of the root container. Removed `story.tone` i18n keys from both `en.ts` and `de.ts`.

**History**: Added 2026-03-12. Aligned with Figma design for the classification sidebar.

## 19. Severity = Single-User Workflow Impact (No Reach)

**Decision**: Severity measures the impact on a **single user's workflows**, not the number of affected users. The severity tree asks "How much of YOUR work is affected?" with workflow scope options (all / some / one / none), replacing the previous "blocked / degraded / no impact" × "many / few / one user" matrix.

**Why (the crucial insight)**: A user who can't work has a critical problem — regardless of whether they're alone or one of thousands. The previous tree tangled two independent dimensions:
- **Workflow scope** (how much of the individual's work is broken) — this IS severity
- **Reach** (how many users are affected) — this is NOT severity

Example: "API key auto-rotated, one user's integration breaks." The old tree produced LOW (blocked × one user). But from that user's perspective, their workflow is completely broken — that's not LOW. Severity should reflect the recipient's experience, because notifications are always addressed to ONE person about THEIR situation.

**The redesigned severity tree** (6 nodes, down from 12):
```
Platform down? ──Yes──→ CRITICAL
       │ No
Security/compliance? ──Yes──→ CRITICAL
       │ No
How much of YOUR work is affected?
  ├─ All workflows broken       → HIGH
  ├─ Some workflows broken      → MEDIUM
  ├─ None, but action needed    → MEDIUM
  └─ None, just informational   → LOW
```

**What was removed**: The `blocked_scope` and `degraded_scope` nodes that asked "How many users?" are eliminated. The `impact` node's "blocked / degraded / no impact" framing is replaced with workflow scope. The "degraded" concept is dissolved entirely — partial breakage is captured by "some workflows broken."

**History**: Added 2026-03-12. Emerged from holistic review of all 15 scenarios through both trees, which revealed that reach was distorting severity for single-user and single-workflow events.

## 20. Channels Bound to Event Type + Severity (Not Reach)

**Decision**: Which communication channels to use is determined by the combination of **event type** (from tree 1) and **severity** (from tree 2) — never by reach. For the five non-Notification event types, channels are fixed (inline hint, toast, modal, etc.). For Notifications, severity determines the channel set and urgency:

| Notification × Severity | Channels | Behavior |
|------------------------|----------|----------|
| CRITICAL | Banner + Dashboard + E-Mail + Status Page | Banner persistent, E-Mail high priority |
| HIGH | Banner + Dashboard + E-Mail | Banner prominent but dismissible |
| MEDIUM | Dashboard + E-Mail | No banner |
| LOW | Dashboard | Dashboard item only |

**Why**: The previous model used reach to modulate channels (few users → fewer channels). But if a user experiences a CRITICAL event, they should receive an email to be reached faster — regardless of whether one person or a thousand are affected. The channel selection serves the *recipient*, and every recipient deserves communication proportional to *their* impact.

**Dimensional model**: Event type determines the *communication pattern* (only Notifications need multi-channel). Severity determines the *urgency within that pattern*. Each dimension does one job. This replaces the previous flat cross-product of severity × reach → 10 result nodes.

**History**: Added 2026-03-12. Follows directly from Decision #19 — once reach is removed from severity, it has no reason to remain in channel selection either.

## 21. Reach → Phase 3 Audience Segmentation (Not Phase 1 Severity)

**Decision**: Reach is captured in Phase 1 as a **parallel metadata question** (not inside the severity tree) and used in Phase 3 for **audience segmentation** — generating different text for different user groups through potentially different channels.

**Why**: Reach isn't a number ("how many users"). It's an audience question: *who* needs to know, and what does each group need to hear? A global outage produces fundamentally different notifications for different audiences:
- **Admin** → E-Mail with technical details and required actions
- **End user** → E-Mail explaining the situation, no action required

This means the same event can produce multiple notification variants, each tailored to its audience's needs and responsibilities.

**Phase 1 reach question** (parallel to severity, not inside it):
```
Who is affected?
  ├─ Everyone using the service
  ├─ A specific user group
  └─ A single user
```

This does NOT affect severity. It feeds downstream:
- **Phase 2** uses it to guide LLM interview questions ("Which group is affected?" / "Which workflow is broken for the user?") and to **correct user input** — if Phase 1 says "single user" but the user describes the event with "users" (plural), Phase 2 can enforce consistency.
- **Phase 3** uses it for audience-specific text generation, channel selection per audience, and escalation timing.

**The three-phase model**:

| Phase | Determines | Key Inputs |
|-------|-----------|------------|
| **Phase 1 — Classification** | Event type, severity (single-user perspective), audience (reach) | Structured questions — deterministic |
| **Phase 2 — Story** | Detailed event description, guided by Phase 1 | LLM interview — adaptive questions, consistency correction |
| **Phase 3 — Text Generation** | UI text per audience × channel × escalation phase | LLM generation — uses Phase 1 + Phase 2 as input |

**History**: Added 2026-03-12. Emerged from discussion about API key auto-rotation classification. The insight that "reach defines who to contact, not which channels to use" led to reframing reach as audience segmentation. The further insight that Phase 1 metadata can guide and correct Phase 2 input established the three-phase information flow model.

## 22. Classification Moves After Phase 2 (Hybrid Data Collection + Rule-Based Evaluation)

**Decision**: Classification (Information Type, Severity, Channels) is no longer determined by Phase 1 decision trees alone. Instead, Phase 1 collects essential structured metadata, Phase 2 collects guided freetext that the LLM normalizes to predefined categories, and a **rule-based evaluation engine** classifies the event deterministically from the combined normalized data.

**Why**: The original tree-first model forced classification based on minimal information (2–7 abstract clicks). Moving classification to after data collection means rules evaluate richer, normalized data. The LLM's role changes from "not involved" to "normalizer" — it maps freetext to predefined categories but never decides classification. The evaluation stays 100% deterministic.

**The new flow**:

| Step | What happens | Method |
|------|-------------|--------|
| Phase 1 | Collect essential metadata (domain, security, platform, scope, reach) | Structured clicks (3–5 questions) |
| Phase 2 | Collect event details, normalize to predefined categories | LLM-guided freetext + normalization |
| Classification | Evaluate all normalized data → type, severity, channels | Deterministic rules |
| Phase 3 | Generate channel text per audience | LLM text generation |

**Key principle**: The LLM normalizes (understanding), rules evaluate (judgment). The LLM never classifies.

**What this supersedes**: Decision #13 (deterministic trees as sole classifier). The trees evolve into Phase 1 structured questions. The deterministic guarantee is preserved — it just operates on richer input.

**Full design**: See `docs/architecture-evolution.md`.

**History**: Added 2026-03-12. Emerged from audit of decision trees against research document, which revealed that the tree was 85% right but the remaining gaps (workflow_scope mixing concerns, 7-question paths, missing core-value/capability distinction) required a structural change rather than incremental tree edits.

## 23. Three-Category Domain Split: Core Value / Capability / Management

**Decision**: The Q0 domain split expands from two categories (Service / Management) to three: **Core value**, **Capability**, and **Management**. This replaces Decision #16's two-way split.

**Why (the crucial insight)**: Not all service-domain events are equally urgent. The API being down (core value) is fundamentally different from file upload being broken (capability), even though both are "service" events. The distinction:

- **Core value** = what users pay for. APIs, LLM models, billing, pipelines that depend on the service. If this breaks, the user isn't getting what they pay for.
- **Capability** = supporting features that enhance the experience. File upload, export, search, monitoring dashboard. If this breaks, it's inconvenient but the core product works.
- **Management** = the admin console/UI where users configure things. Form validation, settings page, API key creation flow. These are UI-level events, not service-level.

**How this affects severity**:
- Core value affected → HIGH (user is blocked from what they pay for)
- Capability affected → MEDIUM (inconvenient but core product works)
- Management events → type classification (validation, error, feedback) but no severity in the notification sense

**The expired API key litmus test**: "User's API key expired, can't call LLM API." This is core value — the user can't use what they pay for → HIGH. Under the old model (blocked × one user) this was LOW. The three-category model gets it right.

**What this supersedes**: Decision #16 (Service/Management two-way split). The Management category is unchanged. Service splits into Core value and Capability.

**History**: Added 2026-03-12. Emerged from discussion about whether "file upload is broken" and "API is down" should have the same urgency. The insight: core value delivery (what users pay for) is categorically different from supporting features.

## 24. Severity Simplified: Core Value = HIGH, Capability = MEDIUM, Nothing = LOW

**Decision**: Severity is determined primarily by *what kind of thing* is broken, not by the *degree of breakage*. If core value is affected in any way, it's HIGH. If a capability is affected, it's MEDIUM. If nothing is broken, it's LOW. CRITICAL is reserved for systemic/infrastructure events (platform down, security breach).

**The severity model**:

| Trigger | Severity | Channels |
|---|---|---|
| Security or compliance issue | CRITICAL | Banner + Dashboard + E-Mail + Status Page |
| Entire platform down | CRITICAL | Banner + Dashboard + E-Mail + Status Page |
| Core value affected (any breakage) | HIGH | Banner + Dashboard + E-Mail |
| Capability affected | MEDIUM | Dashboard + E-Mail |
| Nothing broken (informational) | LOW | Dashboard |

**Why**: "If something is broken, communicate it urgently." The degree of breakage (all services vs. one service) matters for the *narrative* (what you say) and *audience targeting* (who you tell), but not for the *urgency of communication*. A user whose pipeline is broken needs to know now — whether it's one endpoint or all of them.

**What was removed**: The `workflow_scope` question's 4 options (all/some/action needed/informational) are replaced. The All/Some/One/None scale still exists as Phase 1 metadata for shaping Phase 2 questions, but it no longer drives severity. Severity is driven by the category (core value vs. capability vs. nothing broken).

**What this supersedes**: The severity mapping from Decision #19 (all workflows → HIGH, some → MEDIUM, action needed → MEDIUM, informational → LOW). The principle from #19 (severity = single-user perspective, no reach) is preserved.

**History**: Added 2026-03-12. Emerged from the insight that "workflow" conflated core value delivery with supporting features, and that within core value, all breakage warrants the same urgency.

## 25. LLM as Normalizer, Not Evaluator

**Decision**: In the new hybrid architecture, the LLM's role in classification is strictly **normalization** — mapping freetext to predefined categories. The LLM never decides type, severity, or channels. It only prepares structured data for deterministic rules.

**Why**: The original Decision #13 replaced LLM-based classification with trees because the LLM was unreliable at classification. The new architecture reintroduces the LLM but in a constrained role: extracting/normalizing freetext to a small set of predefined values (5 fields, small value sets each). This is a fundamentally easier task than open-ended classification, and Phase 1 metadata provides guardrails that further constrain extraction.

**The normalization pattern**:
```
Phase 1 context: category = core_value, reach = single_user
User writes: "Users can't call the LLM API because their key expired"
LLM normalizes:
  - Corrected text: "A user can't call the LLM API because their key expired"
  - { service: "llm_api", problem: "access_blocked", cause: "key_expired" }
Rules evaluate the structured fields → type, severity, channels
```

**Correction behavior**: Phase 1 metadata serves as ground truth for correcting unconscious mistakes in freetext. If Phase 1 says "single user" but the user writes "users" (plural), the LLM corrects to singular. The LLM uses Phase 1 as constraints, not the other way around.

**Reliability expectation**: Constrained extraction (mapping to predefined categories with Phase 1 guardrails) should be significantly more reliable than open-ended classification. Needs validation — especially with the local 14B model.

**History**: Added 2026-03-12. The key insight: the old pipeline failed because the LLM did understanding AND evaluation. Separating these — LLM understands, rules evaluate — preserves deterministic classification while enabling richer input.

## 26. Always-Confirm Pattern for LLM Normalization (Phase 2)

**Decision**: Every LLM-normalized field in Phase 2 must be confirmed by the user before it enters the classification pipeline. The confirm step IS the fallback — there is no separate error/failure UI.

**Context**: The architecture audit (2026-03-12) flagged LLM normalization fallback as the single remaining HIGH risk. The product owner's insight: the user should always see and confirm how the LLM mapped their input. This eliminates the need for separate success/failure paths.

**Pattern**:
```
User writes freetext → LLM normalizes → Show predefined options with best match pre-selected → User confirms or corrects
```

**Three states, one UI component** (reuses the existing "confirm extraction" component from Figma node 102:4397):
- **High confidence**: Normalized value shown with source quote, user clicks Confirm
- **Low confidence / partial**: Same view, but Change is visually encouraged
- **Total failure (LLM down)**: No pre-filled value, predefined categories shown directly via Change view

**Why this works**:
- The LLM is a convenience layer, not a dependency — the flow works with or without it
- Every normalized field is user-validated — no silent misclassification possible
- No separate fallback UI to design, build, or test — one component, three states
- Full transparency: user always sees the mapping and its source

**What this means for implementation**:
- Every Phase 2 question defines its predefined categories (in `story-classification.ts`)
- The confirm component receives: normalized value (nullable), source quote, and predefined option list
- If LLM returns null/garbage → component shows options with nothing pre-selected
- The freetext escape hatch ("Or type your own answer") remains for edge cases

**Resolves**: Architecture audit HIGH risk (LLM fallback), Open Question #7 (fallback when normalization fails).

**History**: Added 2026-03-12. Driven by the product owner's principle: "the user should always confirm what the LLM understood and how it did the mapping."

## 27. Phase 1 Restructured: Flat Sequential Questions Replacing Decision Trees

**Decision**: Replace the two chained JSON decision trees (information-type v6.0.0, notification-severity v3.0.0) with a flat array of 10 conditional questions in `src/data/classification-questions.ts`. Deterministic rules in `classifyFromMetadata()` derive Information Type, Severity, and Channels from accumulated `Phase1Metadata`.

**Why**: The tree walker was architecturally sound but operationally complex — two JSON files with 20+ nodes each, chained transitions, and node-ID-based narrative mapping. The flat question model achieves the same outcomes with simpler code: each question has a `condition(metadata) => boolean` function for visibility and an `applyAnswer(metadata, value)` function for state updates. No tree loading, no node traversal, no chain transitions.

**What changed**:
- `src/data/classification-questions.ts` — NEW: 10 question definitions, `Phase1Metadata` type, `PathEntry` (migrated from `types/decisionTree.ts`)
- `src/data/story-classification.ts` — ADDED: `classifyFromMetadata()` pure function with severity rules (CRITICAL/HIGH/MEDIUM/LOW) + channel mapping + Management type classification
- `src/stores/classificationStore.ts` — REWRITTEN internals: `metadata` + `currentQuestionIndex` replace `currentTreeId` + `currentNodeId`. Same public API.
- `src/services/classificationNarrativeBuilder.ts` — REWRITTEN `NARRATIVE_MAP`: keys changed from tree node IDs to flat question IDs
- Obsolete files removed: `decision-tree_information-type.json`, `decision-tree_notification-severity.json`, `services/decisionTree.ts`, `types/decisionTree.ts`

**What didn't change**: Public API of `classificationStore` (same `path`, `result`, `isComplete`, `answerQuestion`, `getCurrentQuestion`, `toStoryClassification`). View components (`EventStoryView.vue`, `StoryQuestion.vue`, `StoryPanel.vue`) required zero changes. Phase 2 story interview and Phase 3 text generation remain untouched.

**Key design detail**: The scope qualifier from the architecture audit (§2) is implemented — HIGH severity with `scope=one` drops the Banner channel, preventing intrusive notifications for single-service issues.

**History**: Added 2026-03-12. Implements the Phase 1 restructuring planned in the architecture evolution document. All severity rules, channel mappings, and Management type classifications are derived from Decisions #22–#26.
