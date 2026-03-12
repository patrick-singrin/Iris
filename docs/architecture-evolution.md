# Architecture Evolution: From Tree-First Classification to Hybrid Data Collection + Rule-Based Evaluation

*Created: 2026-03-12. Documents the architectural shift from Phase 1 classification trees to a hybrid model where structured questions + LLM-normalized freetext feed a rule-based classification engine.*

---

## 1. What Changed and Why

### The original model (Phase 1 v1, Decisions #13–#21)

```
Phase 1 (Classification)  →  Phase 2 (Story)  →  Phase 3 (Text Gen)
  decision trees               LLM interview       LLM generates
  determine type +             collects details     channel text
  severity + channels
```

Phase 1 was the classifier. Two chained decision trees (information-type v6, notification-severity v3) walked the user through 2–7 structured questions to produce a deterministic Information Type, Severity, and Channel recommendation. Classification happened *before* the LLM was involved at all.

### The problems that surfaced

1. **The `workflow_scope` question mixed breakage with message content.** Four options (all broken / some broken / action needed / informational) tangled severity classification with Phase 2/3 concerns (whether the notification needs a call-to-action).

2. **"Workflow" was too vague.** It conflated core value delivery (API works, models respond) with supporting features (file upload, dashboard widgets). A broken API and a broken file upload are fundamentally different in urgency, but the tree treated them the same.

3. **The severity tree was 7 questions deep on the longest path.** The research recommends 3–4 max. Q0 domain split + platform gate + security gate + workflow_scope = too many clicks before reaching a result.

4. **Classification before detail collection is backwards.** The tree forced type classification based on minimal information. Moving classification to *after* detail collection means rules can evaluate richer, normalized data.

### The new model

```
Phase 1                →  Phase 2                →  Classification      →  Phase 3
Essential metadata        Guided freetext            Rule-based             Text generation
(structured clicks)       (LLM normalizes to         evaluation             (LLM generates
                           predefined categories)    (deterministic)         channel text)
```

Phase 1 and Phase 2 are **data collection**. Classification is a **separate step** that consumes all normalized data and applies deterministic rules. The LLM's role changes from "not involved in classification" to "normalizer that maps freetext to predefined categories" — it never *decides* classification, it only prepares data for rules that do.

---

## 2. The Three-Category Domain Split

### From two categories to three

The original Q0 split Service vs. Management into two domains. This missed a crucial middle layer.

| Category | What it is | Examples | If broken... |
|---|---|---|---|
| **Core value** | What users pay for — the product's primary function | API calls, LLM model responses, billing, pipelines that depend on the API | User isn't getting what they pay for |
| **Capability** | Supporting features that enhance the experience | File upload, export, search, monitoring dashboard, console widgets | Inconvenient but core product works |
| **Management** | The admin console/UI where users configure things | Form validation, settings page, API key creation flow, billing config | UI issue during configuration |

### Why three categories matter

**Core value vs. capability resolves the severity question.** A broken API (core value) and a broken file upload (capability) need different urgency levels. The old tree couldn't distinguish these — both were "Service domain" events.

**The three categories map to different severity behaviors:**
- Core value broken → HIGH (user isn't getting what they pay for, needs to know NOW)
- Capability broken → MEDIUM (inconvenient, but core product works)
- Management → enters the type classification path (validation, error, feedback, etc.) but doesn't need severity in the same way — these are UI-level events

**The three categories map to different Phase 2 strategies:**
- Core value → ask about affected services, SLAs, workarounds, downstream impact
- Capability → ask about the feature, alternative paths, expected fix timeline
- Management → ask about the form/screen, the user action, error details

### Connection to the Service/Management split

The original two-way split maps into the three-way split:
- Old "Service" → now split into **Core value** and **Capability**
- Old "Management" → remains **Management**

The key distinction the old model missed: not all service-domain events are equally urgent. The API being down is fundamentally different from file upload being broken, even though both are "service" events.

---

## 3. Severity Model: Core Value vs. Capability vs. Management

### The principle

Severity measures how much the **individual recipient** is blocked from getting what they pay for. Reach (how many users) determines who to contact and what each audience hears — it never affects severity.

### The severity mapping

| Trigger | Severity | Channels |
|---|---|---|
| Security or compliance issue | CRITICAL | Banner + Dashboard + E-Mail + Status Page |
| Entire platform down | CRITICAL | Banner + Dashboard + E-Mail + Status Page |
| Core value affected (any breakage) | HIGH | Banner + Dashboard + E-Mail |
| Capability affected | MEDIUM | Dashboard + E-Mail |
| Nothing broken (informational) | LOW | Dashboard |

### Key insights behind this mapping

**"If something is broken, communicate it urgently."** The degree of breakage within core value (all services vs. one service) matters for the *narrative* and *audience targeting* but not for the *urgency of communication*. If a user's pipeline is broken, they need to know — whether it's one endpoint or all of them.

**CRITICAL is reserved for systemic/infrastructure events.** Platform-wide outage and security breaches are categorically different from individual service issues — they require the most aggressive communication channels (including Status Page).

**Capability breakage is MEDIUM, not HIGH.** The user's core workflows still function. File upload being broken is not the same as the API being down. The user doesn't need a banner for this — Dashboard + E-Mail is sufficient.

**Management events don't have severity in this sense.** A form validation error or a settings save confirmation aren't "broken things that need urgency." They're UI events that need the right *type* classification (Validation, Error, Feedback, etc.) and the right *component* (inline, toast, modal).

### The expired API key example (the litmus test)

"A user's API key expired and they can't call the LLM API."

- **Category:** Core value (the API is what they pay for)
- **Severity:** HIGH (they're blocked from the core product)
- **Reach:** One user (but reach doesn't affect severity)
- **Channels:** Banner + Dashboard + E-Mail
- **For the user:** "Your API key has expired. Generate a new key to restore access."

The old tree (blocked × one user) produced LOW. This model produces HIGH. The user who can't use the API they're paying for deserves urgent communication — regardless of whether they're the only one affected.

---

## 4. Phase 1: Essential Metadata (Structured Clicks)

### What Phase 1 asks

Phase 1 collects only the metadata that **cannot be reliably extracted from freetext** and that **constrains everything downstream**.

```
Q1: What is this about?
    ├─ The core product — APIs, models, what users pay for
    ├─ A platform feature — something that supports the experience
    └─ The management interface — where users configure things

Q2: (if Core value or Capability) Is this a security or compliance issue?
    ├─ Yes
    └─ No

Q3: (if Core value) Is the entire platform down?
    ├─ Yes
    └─ No

Q4: (if Core value or Capability) How much is affected?
    ├─ All
    ├─ Some
    ├─ One
    └─ None

Q5: Who is affected?
    ├─ Everyone using the service
    ├─ A specific user group
    └─ A single user
```

### What Phase 1 does NOT ask

Everything that the LLM can reliably extract from Phase 2 freetext:
- Trigger (user action vs. system) — "user clicked..." vs. "the system..." is obvious from context
- Success/failure — "failed", "error", "worked" are easy to extract
- Persistence (need record?) — "confirmation number", "receipt" signals this
- Ongoing vs. discrete — "still happening" vs. "occurred at 2am" is extractable
- Form field check — "validation error on email field" is self-evident

### Design principles for Phase 1

1. **Minimum viable metadata.** Only ask what can't be extracted from freetext.
2. **Every question constrains Phase 2.** If an answer doesn't change what Phase 2 asks or how it normalizes, it doesn't belong in Phase 1.
3. **Binary or small fixed set.** 2–4 options max per question.
4. **Observable, not categorical.** Questions describe what anyone can see, not UX taxonomy.

---

## 5. Phase 2: Guided Freetext with LLM Normalization

### The core pattern

```
Phase 1 metadata constrains the questions
        ↓
User writes short freetext answers to guided questions
        ↓
LLM normalizes each answer to predefined categories
        ↓
LLM corrects unconscious mistakes using Phase 1 as ground truth
        ↓
Structured data mapped to allowed values
```

### How Phase 1 shapes Phase 2

| Phase 1 answer | Phase 2 behavior |
|---|---|
| Core value | Ask: "Which service is affected?" "What are users experiencing?" Use API/service vocabulary. |
| Capability | Ask: "Which feature isn't working?" "What happens when users try?" Use feature vocabulary. |
| Management | Ask: "What screen or form is this about?" "What did the user do?" Use UI vocabulary. |
| Scope = One | Use singular: "Which service is affected?" Correct plural to singular. |
| Scope = All | Use plural: "Which services are affected?" Use broad impact language. |
| Reach = Single user | Correct "users can't..." to "a user can't..." |

### LLM normalization (not evaluation)

The LLM's job is to map freetext to a predefined set of information items. It never decides classification — it only prepares structured data.

Example:
```
User writes: "Users can't call the LLM API because their key expired"

Phase 1 context: category = core_value, reach = single_user

LLM normalizes:
  - Corrected text: "A user can't call the LLM API because their key expired"
  - Extracted fields:
    { service: "llm_api",
      problem: "access_blocked",
      cause: "key_expired",
      userAction: "key_renewal_required" }
```

### Predefined information items

Every freetext answer must map to predefined categories. The allowed values are defined in code (extending `story-classification.ts`). The LLM prompt includes these allowed values so it knows what to normalize to.

This is the same pattern already used in the extraction pipeline — `storyExtractor` maps freetext to `event_kind`, `user_impact`, `timing` etc. The difference: Phase 1 metadata makes extraction more constrained and therefore more reliable.

---

## 6. Classification: Rule-Based Evaluation

### When classification happens

Classification happens **after** both Phase 1 and Phase 2 have collected and normalized all data. It is a deterministic function:

```
classificationResult = evaluate(phase1Metadata, phase2NormalizedFields)
```

No LLM involvement. Pure rules.

### What the rules produce

- **Information Type** — one of the 6 types (Validation, Error & Warning, Transactional Confirmation, Feedback, Status Display, Notification)
- **Severity** — CRITICAL / HIGH / MEDIUM / LOW (only for Notification type)
- **Channels** — determined by type + severity
- **Audience segments** — determined by reach + type (who gets what version of the message)

### Why this is better than tree-first classification

| Tree-first (old) | Rule-based after data collection (new) |
|---|---|
| Classification based on 2–7 abstract clicks | Classification based on rich normalized data |
| User must understand what questions mean for classification | User describes their reality; rules do the mapping |
| LLM not involved (100% deterministic but limited input) | LLM normalizes freetext; rules evaluate (deterministic evaluation, richer input) |
| Type decided before knowing details | Type decided with full context |
| 7 questions on longest path | 3–5 Phase 1 clicks + 2–3 Phase 2 freetext answers |

---

## 7. What This Means for the Existing Codebase

### What stays

- **`classificationStore.ts`** — still the central store, but now manages Phase 1 metadata collection rather than tree walking. The tree-walking logic may be simplified.
- **`classificationNarrativeBuilder.ts`** — still builds progressive narrative, but from Phase 1 metadata + Phase 2 normalized fields rather than tree path entries.
- **`story-classification.ts`** — still the single source of truth for allowed values. Extended with new predefined categories for Phase 2 normalization.
- **The 6 information types** — unchanged. The types are the right taxonomy (validated by research).
- **The severity × channel matrix** (Decision #20) — updated to the new 4-tier model.
- **Phase 3 text generation** — unchanged. Consumes classification result + structured data.

### What changes

- **Decision trees (`decision-tree_*.json`)** — dramatically simplified or replaced. Phase 1 becomes 3–5 structured questions, not a branching tree.
- **Phase 2 LLM prompts** — enhanced to include Phase 1 metadata as context for normalization and correction.
- **Classification logic** — new deterministic rule engine that consumes Phase 1 + Phase 2 data and produces type + severity + channels.
- **Q0 domain split** — expanded from 2 (Service/Management) to 3 (Core value/Capability/Management).

### Migration path

This is an evolution, not a rewrite. The existing tree questions become either:
- Phase 1 structured questions (domain, security, platform, scope, reach)
- Phase 2 extraction targets (trigger, success/failure, persistence, ongoing/discrete)
- Classification rules (the mapping logic that was implicit in tree structure becomes explicit rules)

---

## 8. Open Questions

1. **Exact wording for the three-way Q1 split.** "Core value / Capability / Management" is the internal model. The user-facing question needs behavioral, observable language — not these abstract labels.

2. **Which Phase 2 questions are mandatory vs. conditional?** Some questions only make sense for certain categories. Need to define the question matrix per category.

3. **How to handle the Management path.** Management events (validation, error, feedback) may not need Phase 2 freetext at all — the tree questions were already sufficient. Should Management stay as a simplified tree?

4. **Predefined categories for Phase 2 normalization.** What are the exact allowed values the LLM normalizes to? These need to be defined in `story-classification.ts`.

5. **LLM reliability for normalization.** Constrained extraction (mapping to 5 predefined fields with small value sets) is much easier than open-ended classification. But needs validation — especially with the local 14B model.

6. **Progressive feedback during Phase 2.** The current narrative builds during tree clicks. How does it update during freetext? After each answer? After LLM normalization completes?

7. ~~**Fallback when LLM normalization fails.**~~ **RESOLVED (Decision #26).** Always-confirm pattern: the user always sees and confirms the LLM's mapping. Three states, one UI component (reuses existing confirm-extraction component): high confidence → pre-selected, low confidence → highlighted, total failure → nothing pre-selected. The confirm step IS the fallback. No separate failure UI needed.

---

## 9. Decisions That Carry Forward

These decisions from the original architecture remain valid and unchanged:

- **Decision #11** — Temporal framing: events are present/past, never future
- **Decision #14** — Progressive narrative (mechanism changes, principle stays)
- **Decision #15** — Simplified channel names
- **Decision #17** — Severity assumes NOW (peak impact)
- **Decision #19** — Severity = single-user perspective (no reach)
- **Decision #20** — Channels bound to type + severity (updated severity tiers)
- **Decision #21** — Reach → Phase 3 audience segmentation

These decisions are superseded or evolved:

- **Decision #13** — Deterministic trees → evolved to hybrid (structured clicks + LLM normalization + deterministic rules)
- **Decision #16** — Service/Management split → evolved to Core value/Capability/Management three-way split
- **Decision #18** — ClassificationTile no Tone → still valid, tile now shows progressive data from both phases

---

*This document captures the architectural direction as of 2026-03-12. Audited against research + industry best practices — see `docs/architecture-audit.md`. All HIGH risks resolved (Decision #26). Moderate gaps to address during implementation.*
