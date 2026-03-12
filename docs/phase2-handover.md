# Phase 2 Handover: Flat Classification → Story Interview Integration

*Updated: 2026-03-12*
*Status: Phase 1 restructured (flat questions), ready for Phase 2 implementation*

---

## What Changed Since v1 of This Document

Phase 1 was **restructured from chained decision trees to flat sequential questions** with conditional visibility. The old tree-walking approach (`decisionTree.ts`, two JSON trees) has been replaced by `classification-questions.ts` with a `Phase1Metadata` object and `classifyFromMetadata()` deterministic rules.

**Key differences for Phase 2:**
- `pathEntries` now contain flat question IDs (`category`, `security`, `scope`, `reach`, etc.) instead of tree node IDs (`domain_context`, `svc_proximate_trigger`, etc.)
- The three-category split (Core value / Capability / Management) replaces the old Service/Management binary
- Severity is derived deterministically from metadata, not from tree traversal
- Management path uses the same flat flow (form_field → trigger → success → persistence/ongoing), not a separate tree

---

## What Phase 2 Is

Phase 2 collects the **"Story"** of the event — the specific details needed to generate relevant UI text in Phase 3. The LLM-powered interview asks the user freeform questions and extracts structured data.

**Phase 1 (restructured, complete)** classifies *what kind of event* this is via 3–5 structured clicks.
**Phase 2 (next)** collects *what specifically happened* via guided freeform.
**Phase 3 (exists)** generates channel text from the structured data.

## The Core Idea

Phase 1 produces a `Phase1Metadata` object with the user's answers, plus a deterministic classification result. Phase 2 should use this data in two ways:

### 1. Guide Story Questions

Phase 1 metadata tells us *exactly what kind of event* we're dealing with. Use this to ask more targeted questions.

**Example:** If `metadata.category = 'core_value'` and `metadata.scope = 'one'`, Phase 2 can ask:

> "Which specific service or API is affected?"

instead of the generic:

> "What is affected?"

**More examples by category:**
- `category = 'core_value'` + `security = true` → ask about data exposure, compliance impact, affected credentials
- `category = 'capability'` + `scope = 'all'` → ask about which supporting feature (file upload, export, search)
- `category = 'management'` + `mgmt_form_field = true` → ask about which form, which field, what validation rule
- `category = 'management'` + `mgmt_trigger = 'system'` → ask about which background process, what status changed

### 2. Correct User Input

Humans describe events in general terms, even when the event is specific. Phase 1 metadata can normalize this.

**Example:** `metadata.scope = 'one'` but the user writes "Users are unable to access the deployment dashboard." Phase 1 tells us this affects a *single* service — normalize to specific language.

**Example:** `metadata.category = 'management'` but user writes "the API is down." Phase 1 context tells us this is an admin UI issue — perhaps the API *console* is down, not the API itself. The LLM can ask a clarifying follow-up.

## Available Data from Phase 1

After classification completes, `classificationStore.ts` exposes:

```typescript
// The metadata — all structured answers
metadata: Phase1Metadata = {
  category: 'core_value' | 'capability' | 'management' | null
  security: boolean | null
  platform_down: boolean | null
  scope: 'all' | 'some' | 'one' | 'none' | null
  reach: 'all' | 'group' | 'single' | null
  // Management-only:
  mgmt_form_field: boolean | null
  mgmt_trigger: 'user' | 'system' | null
  mgmt_success: boolean | null
  mgmt_persistence: boolean | null
  mgmt_ongoing: boolean | null
}

// The classification result (deterministic from metadata)
result: {
  informationType: string       // e.g. "Notification", "Validation Messages"
  severity: string              // "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
  channels: string[]            // e.g. ["Banner", "Dashboard", "E-Mail"]
}

// The full path of answers (every question + chosen option)
path: Array<{
  nodeId: string                // e.g. "category", "security", "scope"
  questionText: string          // e.g. "What category does this affect?"
  chosenLabel: string           // e.g. "Core product functionality"
}>

// The progressive narrative (W-heading format)
narrativeText: string           // "**What:** A core product notification about..."
```

## Key Metadata Fields to Exploit

| Field | Value | What it tells Phase 2 | How to use it |
|---|---|---|---|
| `category` | `core_value` | Event affects what users pay for (APIs, models) | Use service vocabulary: API, endpoint, consumer, request |
| `category` | `capability` | Event affects supporting features | Ask which feature: upload, export, search, sync |
| `category` | `management` | Event affects admin UI | Use UI vocabulary: form, screen, dashboard, setting |
| `security` | `true` | Security/compliance involved | Ask about data exposure, affected credentials, compliance scope |
| `platform_down` | `true` | Complete platform outage | Skip "which service?" — everything is affected |
| `scope` | `one` | Single service affected | Ask "Which specific service?" — constrain to singular |
| `scope` | `all` | All services affected | Use broad impact language, skip scope questions |
| `reach` | `single` | One user affected | Ask for user context, specific scenario |
| `reach` | `all` | All users affected | Universal language, no audience qualification needed |
| `mgmt_form_field` | `true` | Inline form validation issue | Ask: which form, which field, what validation rule |
| `mgmt_trigger` | `system` | System-initiated event | Ask about which process, what status changed |
| `mgmt_success` | `false` | User action failed | Ask about error message, HTTP code, what they tried |

## Implementation Approach

### Option A: Seed the LLM prompt (recommended start)

Pass the classification metadata and narrative into the story extraction prompt as context. The LLM uses this to:
- Ask more targeted follow-up questions
- Validate freeform input against classification constraints
- Use domain-appropriate vocabulary

This requires minimal code changes — just injecting context into existing LLM prompts.

### Option B: Conditional story questions

Add conditional logic to `story-questions.ts` that shows/hides questions based on `Phase1Metadata`. For example, skip "What is the impact scope?" if `metadata.scope` already established it.

More deterministic but requires more UI work. Can be added incrementally.

### Option C: Always-confirm normalization (Decision #26)

Every Phase 2 LLM-normalized field uses the confirm/change pattern:
- High confidence → pre-selected value, source quote shown, user clicks Confirm
- Low confidence → same view, Change visually encouraged
- Total failure (LLM down) → predefined categories shown directly

The LLM is a convenience layer, not a dependency — the flow works without it.

### Recommended: Start with A + C

Seed the prompt (A) and use the confirm pattern (C) for every extracted field. Add conditional questions (B) incrementally where the LLM isn't reliable enough.

## Files to Start With

| File | What to do |
|---|---|
| `src/services/llm/storyExtractorPromptBuilder.ts` | Inject `Phase1Metadata` + narrative as prompt context |
| `src/stores/eventStoryStore.ts` | Already has access to `classificationResult` — wire `metadata` too |
| `src/stores/classificationStore.ts` | Source of all Phase 1 data (metadata, result, path, narrative) |
| `src/data/story-questions.ts` | Modify conditions for questions that overlap with Phase 1 answers |
| `src/data/classification-questions.ts` | Reference for Phase1Metadata type and question definitions |

## Design Principles

1. **Phase 1 constrains, Phase 2 explores** — Classification narrows the event space; the story interview fills in the details within that space.
2. **Never ask what we already know** — If Phase 1 established `scope = 'one'`, don't ask "how many services are affected?"
3. **Correct gently** — When freeform input contradicts Phase 1 data, ask a clarifying question rather than silently overriding.
4. **Category vocabulary matters** — Core value events use API/consumer/request language. Management events use UI/user/form language. Consistent vocabulary reduces cognitive load.
5. **Always confirm** — Every LLM-normalized field is user-validated. No silent misclassification.

## Code Quality Context

The code architecture audit (`docs/code-architecture-audit.md`) identified these items relevant to Phase 2 work:

| Finding | Relevance to Phase 2 |
|---|---|
| `eventStoryStore.ts` at 610 LOC, 57 exports | Phase 2 changes will touch this store — consider splitting first |
| 12 catch blocks are console-only | Phase 2 LLM calls need proper error surfacing to user |
| `CHANNEL_METADATA` not centralized | Phase 2 prompts will need channel constraints — extract first |
| `maxTokens = 4096` hardcoded 9× | Phase 2 prompts may need different token budgets |
| No `eventStoryStore` tests | Add tests before modifying the store for Phase 2 integration |

**Recommendation:** Address the HIGH priority items from the code audit (split store, add tests, extract channel metadata) before starting Phase 2 implementation.

---

## Resolved: Severity Tree `workflow_scope` Redesign

The old `workflow_scope` question no longer exists. The flat classification system uses:
- `scope`: `all | some | one | none` — pure breakage scale
- `reach`: `all | group | single` — audience size (does NOT affect severity)

Severity is derived deterministically by `classifyFromMetadata()`:
- `security = true` → CRITICAL
- `platform_down = true` → CRITICAL
- `category = core_value` + `scope != none` → HIGH
- `category = capability` + `scope != none` → MEDIUM
- `scope = none` → LOW

The scope qualifier affects *channels* (HIGH + scope=one → no Banner) but not the severity label. This resolves the old mixing of breakage scope with message type.

---
*Created: 2026-03-12 | Updated: 2026-03-12*
