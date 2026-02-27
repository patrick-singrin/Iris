# Event Classification Concept v3.0

## Purpose

Iris helps product teams **document platform events before they happen** so that proper end-user communication is in place. The classification system determines which of six communication types an event belongs to, which then drives UI component selection, text generation, and channel delivery.

## Research Synthesis

The redesign is informed by 9 research papers covering event classification, bilingual UI text generation, and conceptual modeling of events in software engineering.

### Key Insights Applied

**1. Observable-feature classification** (Pitakrat et al., 2014 — SCAPE Framework)
Machine-learning event classifiers achieve high accuracy by extracting concrete, observable features from events — not by asking abstract questions. Applied: every question in the new tree asks about something the product team *concretely knows* about their event.

**2. Domain taxonomy + contextual metadata** (Al-Fedaghi, 2020/2024 — Thinging Machine; Zhu et al., 2019 — SVN Activity Mining)
Effective event classification requires (a) a well-defined domain taxonomy and (b) contextual metadata attached to each event. Applied: 6 clearly-bounded types with type-specific context forms that capture metadata the LLM needs for text generation.

**3. UI text disambiguation through context** (Koneru et al., 2023 — NMT for Software Localization)
Short UI texts (buttons, labels, messages) are highly ambiguous without context — especially for EN↔DE translation. Widget type, position, and surrounding context are critical for correct translations. Applied: each classification type maps to specific UI components with field-level constraints, giving the LLM explicit context for bilingual generation.

**4. Parallel bilingual generation over translation** (Lapalme, 2023 — Data-to-Text Bilingual Generation)
Generating parallel texts from structured data is more reliable than translating one language to another. Applied: the LLM generates EN and DE text simultaneously from the same structured event data, ensuring semantic equivalence.

**5. Avoid circular reasoning in taxonomies** (Synthesis paper — Classification of Events in SE)
Event categories should be derivable from observable properties, not require the classifier to already know the answer. Applied: eliminated the old tree's questions like "Is this always visible as a live status indicator?" which presupposed knowledge of the classification result.

---

## The Six Communication Types

| # | Type | Trigger | Temporality | Channel |
|---|------|---------|-------------|---------|
| 1 | **Feedback** | User action | Transient (auto-dismiss) | Toast |
| 2 | **Validation Messages** | User typing in form | While field is active | Inline field message |
| 3 | **Error & Warnings** | User action fails | Until resolved | Inline at point of action |
| 4 | **Transactional Confirmation** | User completes significant action | Persistent record | Confirmation screen/modal |
| 5 | **Status Display** | System state or user-initiated process | Ongoing (real-time) | Badge, indicator, progress bar |
| 6 | **Notification** | System/admin event | Delivered at specific time | Banner, Dashboard, Email |

### Type Definitions

**Feedback** — Immediate, transient acknowledgment of a completed user action. Confirms the system received and processed input. Auto-dismisses after a few seconds.
*Examples:* "Settings saved", "API key copied to clipboard", "Configuration updated"

**Validation Messages** — Real-time input guidance during form entry. Helps users enter valid data before submission. Appears inline next to the relevant field.
*Examples:* "API key name must be 3–50 characters", "Required: select at least one model"

**Error & Warnings** — Communicates problems requiring user attention or corrective action. Displayed inline at the point where the problem occurred.
*Examples:* "API rate limit exceeded", "Permission denied", "Connection lost"

**Transactional Confirmation** — Documents and confirms completion of significant transactions that serve as records. The user may need to reference this information later.
*Examples:* "API key created — copy it now", "Subscription activated — Invoice #12345"

**Status Display** — Real-time visibility into current system state or process progress. Always visible, updates automatically. Can be system-level (service health) or user-initiated (upload progress).
*Examples:* "API Status: Operational", "Upload progress: 67%", "Quota: 85%"

**Notification** — Proactive messages about events, changes, or announcements not triggered by the user's current action. Delivered through multiple channels based on severity.
*Examples:* "Scheduled maintenance March 5", "Model deprecated April 15", "New feature available"

---

## Decision Tree Design

### Design Principles

1. **Ask what the documenter knows, not what they need to conclude** — Each question is about concrete, observable event characteristics
2. **Maximum 4 questions per path** — Short, decisive classification
3. **No circular reasoning** — Questions never presuppose knowledge of the classification result
4. **Two-pivot architecture** — First pivot separates user-triggered from system-triggered events; second pivot distinguishes within each branch

### Tree Structure

```
Q1: "Is the end user actively doing something when this event occurs?"
│
├── YES (user-triggered) ──────────────────────────────────────────────
│   │
│   Q2: "Is there a problem, error, or warning?"
│   ├── YES ──→ ERROR & WARNINGS
│   │
│   └── NO
│       │
│       Q3: "Is this about guiding the user's input in a form field?"
│       ├── YES ──→ VALIDATION MESSAGES
│       │
│       └── NO
│           │
│           Q4: "What best describes the outcome?"
│           ├── "A record or receipt the user needs to keep"
│           │   ──→ TRANSACTIONAL CONFIRMATION
│           │
│           ├── "An ongoing process begins that shows progress"
│           │   ──→ STATUS DISPLAY
│           │
│           └── "The action is simply acknowledged"
│               ──→ FEEDBACK
│
└── NO (system/admin-triggered) ───────────────────────────────────────
    │
    Q5: "Does this represent an ongoing condition or a specific event?"
    ├── "An ongoing condition that may change at any time"
    │   ──→ STATUS DISPLAY
    │
    └── "A specific event, change, or announcement"
        ──→ NOTIFICATION
            └── continues to Severity Assessment
```

### Path Analysis

| Classification | Path | Questions |
|----------------|------|-----------|
| Error & Warnings | Q1(yes) → Q2(yes) | 2 |
| Validation Messages | Q1(yes) → Q2(no) → Q3(yes) | 3 |
| Transactional Confirmation | Q1(yes) → Q2(no) → Q3(no) → Q4(record) | 4 |
| Status Display (process) | Q1(yes) → Q2(no) → Q3(no) → Q4(process) | 4 |
| Feedback | Q1(yes) → Q2(no) → Q3(no) → Q4(acknowledged) | 4 |
| Status Display (system) | Q1(no) → Q5(ongoing) | 2 |
| Notification | Q1(no) → Q5(event) | 2 |

**Average path length:** ~3 questions
**Maximum path length:** 4 questions (was: 4 in v2.0, but several paths had circular reasoning)

### Improvement Over v2.0

| Aspect | v2.0 (old) | v3.0 (new) |
|--------|------------|------------|
| Entry question | "What triggered this event?" (3 options: user / admin / system) | "Is the user doing something?" (2 options: yes / no) |
| Circular questions | "Is this always visible as a live status indicator?" — requires knowing the answer type | Eliminated — all questions ask about observable characteristics |
| Admin vs System distinction | Separate branches for admin and system events, leading to duplicate questions | Merged — both are "not user-triggered", distinguished by temporality |
| Status Display paths | 3 separate result nodes with identical classification | 2 result nodes: user-initiated process vs system state |
| Max questions | 4 | 4 (same, but no circular reasoning) |
| Three-way split for user outcomes | Not present — feedback/transactional was binary | Q4 cleanly separates record / process / acknowledgment |

---

## Notification Sub-Classification

When an event is classified as **Notification**, the wizard continues to a severity assessment. This determines urgency, channel selection, and escalation behavior.

The severity assessment (existing `decision-tree_notification-severity.json`) remains unchanged — its questions about platform status, security, user impact, and scope are concrete and answerable.

### Notification Channels

| Channel | Description |
|---------|-------------|
| **LLM Hub Web UI** | In-app banners and dashboard notifications |
| **Email** | Sent to affected user groups based on severity |
| **API Responses** | Status headers or error codes in API responses |

### Severity Levels

| Level | Trigger | Channels |
|-------|---------|----------|
| CRITICAL | Platform down, security breach, widespread blocking | Banner (must acknowledge) + Dashboard + Email (High) |
| HIGH | Major degradation, many users affected, urgent action needed | Banner (dismissible) + Dashboard + Email (High) |
| MEDIUM | Partial impact, few users blocked, action recommended | Dashboard + Email (Normal) |
| LOW | Informational only, no user impact | Dashboard only |

---

## Verification: LLM Hub Scenarios

| Scenario | Q1 | Q2 | Q3 | Q4 | Q5 | Result |
|----------|----|----|----|----|----|---------|
| User gets "rate limit exceeded" | Yes | Yes | — | — | — | **Error & Warnings** ✓ |
| "API key name must be 3–50 chars" | Yes | No | Yes | — | — | **Validation** ✓ |
| "Settings saved" after user clicks save | Yes | No | No | Acknowledged | — | **Feedback** ✓ |
| User creates API key, sees key value | Yes | No | No | Record | — | **Transactional** ✓ |
| File upload shows progress bar | Yes | No | No | Process | — | **Status Display** ✓ |
| "API Status: Operational" on dashboard | No | — | — | — | Ongoing | **Status Display** ✓ |
| "Maintenance on March 5, 2–4 AM" | No | — | — | — | Event | **Notification** ✓ |
| "Model gpt-3.5 deprecated April 15" | No | — | — | — | Event | **Notification** ✓ |
| "Quota usage: 85%" indicator | No | — | — | — | Ongoing | **Status Display** ✓ |
| Admin deploys new model version | No | — | — | — | Event | **Notification** ✓ |

All 10 scenarios classify correctly without ambiguity.

---

## Integration with Existing System

The new decision tree JSON (`decision-tree_information-type.json` v3.0) is a **drop-in replacement** for v2.0. The tree walker infrastructure (`decisionTree.ts`, `types/decisionTree.ts`), wizard store, and all downstream consumers remain unchanged because:

1. The JSON schema is identical (question nodes with options, result nodes with classification/channels/continueWith)
2. All 6 classification type names are unchanged
3. The `continueWith` chain to `notification-severity` is preserved
4. Result nodes still include `classification`, `purpose`, `examples`, `channels`
5. The `contentTemplates.ts` type-key mapping is unaffected

No code changes required — only the decision tree data file is updated.
