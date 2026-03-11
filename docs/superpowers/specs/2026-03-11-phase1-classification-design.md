# Phase 1: Classification Flow — Design Spec

**Date:** 2026-03-11
**Status:** Draft
**Scope:** Phase 1 only — classification. No transition to Phase 2 (extraction) or Phase 3 (text generation).

---

## 1. Overview

Phase 1 replaces the current LLM-based classification with a deterministic decision-tree flow. The user answers 2–7 questions to classify an event into one of six information types. If the type is "Notification," a second tree determines severity (CRITICAL / HIGH / MEDIUM / LOW) and recommended channels.

**Why deterministic:** LLM-based classification was tried and produced unreliable results (e.g., "Users can set API Key auto rotation" → LLM guessed "all users" when it's really "single user"). Explicit user selections give accurate classification.

---

## 2. Architecture

### 2.1 Decision Trees

Two chained JSON trees, loaded via `src/services/decisionTree.ts`:

1. **`decision-tree_information-type.json`** (v3.1.0) — 5 question nodes, 7 result nodes. Classifies into: Feedback, Validation Messages, Error & Warnings, Transactional Confirmation, Status Display, Notification.
2. **`decision-tree_notification-severity.json`** (v2.0.0) — 6 question nodes, 8 result nodes. Determines CRITICAL / HIGH / MEDIUM / LOW with channel recommendations.

**Chaining:** The information-type tree's "Notification" result has a `continueWith` field pointing to the severity tree. The walker transitions seamlessly — no UI break (Option A: seamless continuation).

**Design decision — When is always NOW:** The severity tree has no "planned for later" branch. When someone documents an event in Iris, the event exists NOW. Lead time / delivery scheduling are Phase 3 (escalation) concerns.

### 2.2 New Store: `classificationStore.ts`

Manages tree-walking state. Plain Vue `ref`/`reactive` — no Pinia.

**State:**
- `currentTreeId: Ref<string>` — Which tree is active (`'information-type'` or `'notification-severity'`)
- `currentNodeId: Ref<string>` — Current node in the active tree
- `path: Ref<PathEntry[]>` — Ordered list of answered questions + selected options
- `result: Ref<ClassificationResult | null>` — Final result after both trees complete
- `isComplete: Ref<boolean>` — Whether classification is done
- `totalQuestions: ComputedRef<number>` — Estimated total (adjusts per path)
- `answeredQuestions: ComputedRef<number>` — How many answered so far
- `narrative4W: ComputedRef<Narrative4W>` — Progressive Who/What/When/What-to-do

**Key type:**
```typescript
interface ClassificationResult {
  informationType: string        // e.g., "Notification"
  severity: string | null        // e.g., "CRITICAL" (only for Notifications)
  channels: string[]             // e.g., ["Banner", "Dashboard", "Email"]
  trigger: string                // e.g., "Complete platform outage"
  path: PathEntry[]              // Full decision path for traceability
}

interface Narrative4W {
  who: string                    // From scope questions
  what: string                   // From impact + trigger
  when: string                   // Always "NOW"
  whatToDo: string               // From action questions
}
```

**Methods:**
- `answerQuestion(optionIndex: number)` — Select an option by its index, advance to the next node. Internal steps:
  1. Get current question node from active tree
  2. Get selected option at `optionIndex`
  3. Push `PathEntry { nodeId, questionText, selectedLabel: option.label }` to `path`
  4. Set `currentNodeId = option.next`
  5. If next node is a result with `continueWith` → load next tree, set `currentNodeId` to its `entryNode`, update `currentTreeId`
  6. If next node is a result without `continueWith` → build `ClassificationResult`, set `isComplete = true`
- `reset()` — Clear all state, restart from information-type entry node
- `getCurrentQuestion()` — Returns current node as a `RenderableQuestion` (or null if at result)

**`totalQuestions` algorithm:** Count the maximum number of remaining question nodes on any path from the current node to a leaf, then add `answeredQuestions`. Since the trees are small and acyclic, this is a simple recursive max-depth traversal computed on each answer. Combined range: 2–7 total questions across both trees.

### 2.3 Integration Point

The classification flow is the new **entry point** for the event story. The existing `EventStoryView.vue` checks `classificationStore.isComplete`:
- **If false** → renders the classification flow (tree walker questions in main area, simplified sidebar)
- **If true** → shows the result card in main area

No new `activeView` value is needed — the `'event-story'` view handles both states. For Phase 1 scope, the flow stops after classification completes — there is no transition to Phase 2 or 3.

The existing `eventStoryStore.ts` will eventually consume the classification result for Phase 2/3, but that deep wiring is out of scope. The only Phase 1 change to `eventStoryStore.ts` is exposing a `classificationResult` ref that `StoryPanel.vue` can read for the sidebar's `ClassificationTile`.

---

## 3. UI Components

### 3.1 Component Reuse

The existing component library covers ~90% of the Figma design. Key reuse:

| Figma Element | Existing Component | Changes Needed |
|---|---|---|
| Input panel (question card) | `StoryQuestion.vue` | Adapt props to accept tree question format |
| Radio tiles | `RadioTile.vue` | None — matches Figma exactly |
| Hotkey badges | `HotkeyBadge.vue` | None |
| Collapse/expand | `StoryQuestion.vue` (built-in) | None |
| Freeform textarea | `StoryQuestion.vue` (built-in) | Not used for tree questions (`allowFreeform: false`). Freeform handled via FreeformEscapeHatch. |
| Continue button | `StoryQuestion.vue` (built-in) | None (reuse `scale-button`) |
| Classification tile | `ClassificationTile.vue` | Update to accept tree-based classification |
| Sidebar layout | `StoryPanel.vue` | Simplify for Phase 1 (no reasoning tile) |
| Two-column layout | `EventStoryView.vue` | Reuse layout structure |
| Conversation history | `StoryDialog.vue` + `AnswerTile.vue` | Not used during classification — answered questions shown via `classificationStore.path` with a lightweight list (question text + selected label). Reused after classification completes in Phase 2/3. |
| Icons | `AppIcon.vue` | None |

### 3.2 New Component: `ClassificationProgress.vue`

A step-based progress bar replacing the current verified/unverified progress bar during classification.

**Figma reference:** `progress-bar-phase-1` component — 6px track bar with percentage fill + info text.

**Props:**
```typescript
{
  current: number    // Questions answered so far
  total: number      // Estimated total questions on current path
  complete: boolean  // Whether classification is fully done
}
```

**Visual:**
- Track: 6px height, `var(--telekom-color-ui-faint)` background, rounded
- Fill: `var(--telekom-color-primary-standard)` (magenta) for Phase 1 progress
- Info text: "Step {current} of {total}" (or "Classification complete" with checkmark when done)
- Smooth width transition on each answer (`transition: width 0.3s ease`)

### 3.3 New Component: `FreeformEscapeHatch.vue`

Per-question LLM-assisted option matching when the user doesn't understand the options.

**Trigger:** A text link below the options: "Not sure? Describe what's happening instead"

**Props:**
```typescript
{
  question: QuestionNode       // Current tree question with all options
  visible: boolean             // Whether the escape hatch is open
}
```

**Emits:**
```typescript
{
  selectOption: [optionIndex: number]  // When user accepts the LLM suggestion
  close: []                            // When user dismisses
}
```

**Flow:**
1. User clicks "Not sure? Describe what's happening instead" → text field appears
2. User types freeform text and submits
3. Enriched prompt sent to LLM containing:
   - Question text + helper text
   - All available options with their helper text
   - User's freeform input
   - Instructions: map to the most appropriate option, return option label + 1-2 sentence explanation + confidence level
4. LLM response displayed:
   - Suggested option highlighted with explanation underneath
   - Confidence indicator (high/medium/low)
   - Two actions: **"Use this"** (emits `selectOption`) / **"Try again"** (clears text field)
5. After 3 retries on the same question: nudge message "Having trouble? Try selecting one of the options directly — the helper text under each option explains what it covers."

**Edge case — LLM unavailable:** If no LLM is configured (settings store), the escape hatch link is not rendered. The tree works fully without it.

**Edge case — LLM can't map:** Response: "I couldn't match your description to any of the options. Try describing what's happening on your platform."

### 3.4 Adapted Component: `StoryQuestion.vue`

The existing component needs a thin adapter to accept decision tree questions:

**Current props interface:**
```typescript
{ question: RenderableQuestion }
```

**Prerequisite — `RenderableQuestion` type change:** The `origin` union in `src/data/story-questions.ts` must be extended from `'default' | 'verify' | 'followup'` to include `'tree'`. The `targetChecklistItems` field must be made optional (it is required today but tree questions have no checklist targets).

**Tree question mapping** (done in the store or a utility):
```typescript
function treeNodeToRenderable(node: QuestionNode, nodeId: string): RenderableQuestion {
  return {
    id: nodeId,
    text: node.text,
    helpText: node.description,
    inputType: 'single',              // Tree questions are always single-choice
    options: node.options.map((opt, idx) => ({
      value: String(idx),              // Option index as string
      label: opt.label,
      description: opt.description,
    })),
    allowFreeform: false,              // Handled by FreeformEscapeHatch separately
    origin: 'tree',
    targetChecklistItems: [],          // Tree questions don't target checklist items
  }
}
```

**Event handling chain:** `StoryQuestion.vue` emits `answer: [selectedOptions: string[], freeformText: string]` where `selectedOptions[0]` is the string option value (here, the option index as a string). The parent component (classification flow in `EventStoryView.vue`) converts this to a number and calls `classificationStore.answerQuestion(parseInt(selectedOptions[0], 10))`. This keeps `StoryQuestion.vue` unchanged — the translation happens in the parent handler, not the component.

This mapping means `StoryQuestion.vue` can render tree questions without changes to its existing option/button rendering. The one template addition: a conditional block between the options area and the Continue button that renders the `FreeformEscapeHatch` trigger link when `origin === 'tree'` and an LLM is configured in the settings store.

### 3.5 Result Display

When both trees complete (or just the info-type tree for non-Notification types), the result is shown in a result card in the main area:

**Content:**
- Information type tag (colored, using existing `ClassificationTile` tag styles)
- Severity tag (if Notification, using existing severity styles)
- Channels list (if Notification)
- Trigger summary text
- "Phase 1 complete" indicator

The sidebar's `ClassificationTile` also updates reactively as the store's `result` ref populates.

**ClassificationTile adaptation:** The existing `ClassificationTile.vue` accepts `StoryClassification` (fields: `type`, `severity`, `channels`, `confidence`). The tree-based `ClassificationResult` has `informationType` instead of `type` and no `confidence`. An adapter in `classificationStore.ts` maps the result:

```typescript
function toStoryClassification(result: ClassificationResult): StoryClassification {
  return {
    type: result.informationType,
    severity: result.severity as StoryClassification['severity'],
    channels: result.channels,
    confidence: 1,  // Deterministic classification = full confidence
  }
}
```

During Phase 1, the `ConfidenceBar` renders at 100% (deterministic). The `TYPE_TAG_STYLES` map in `ClassificationTile.vue` must be extended with the tree's information type values:

| Tree Value | Tag Style |
|---|---|
| `Notification` | Teal (already exists) |
| `Error & Warnings` | Danger (key change from `'Error or issue'`) |
| `Status Display` | Cyan (key change from `'System change'`) |
| `Feedback` | Default (grey) |
| `Validation Messages` | Default (grey) |
| `Transactional Confirmation` | Default (grey) |

The existing keys (`'Error or issue'`, `'System change'`, `'Process update'`) remain for backward compatibility with Phase 2/3 LLM classification.

**Locale note:** The existing `deriveClassification` in `story-classification.ts` uses i18n-translated strings for `type` (e.g., `t('sq.type.notification')`), which are also used as `TYPE_TAG_STYLES` lookup keys. The tree uses English literal strings (`"Notification"`, `"Error & Warnings"`). To avoid locale mismatch, the new tree-based keys in `TYPE_TAG_STYLES` use English literals. A future cleanup should move all tag style keys to locale-independent constants, but that refactor is out of scope.

---

## 4. Sidebar

### 4.1 Phase 1 Sidebar Structure

The sidebar during Phase 1 classification uses the existing `StoryPanel.vue` structure, simplified:

1. **Event textarea** — Initially empty, progressively fills with 4W narrative as questions are answered. Read-only during classification (user doesn't type here in Phase 1).
2. **Classification progress bar** — `ClassificationProgress.vue` underneath the textarea, showing "Step X of Y"
3. **Classification tile** — Shows information type and severity as they become known. Initially shows "Not enough data" state.

**Not shown during Phase 1:**
- Model selector (no LLM needed for deterministic classification)
- Product context toggle (Phase 2/3 concern)
- Reasoning tile (no LLM reasoning to show)

**Conditional rendering mechanism:** `StoryPanel.vue` imports `classificationStore` and computes `isClassifying = !classificationStore.isComplete`. Sections are wrapped with `v-if="!isClassifying"` (ModelSelector, product context row, ReasoningTile). The event textarea gets `:readonly="isClassifying"`. The progress bar slot switches between `ClassificationProgress` (when classifying) and the existing `ProgressBar` (after classification).

### 4.2 4W Narrative Progressive Fill

The event textarea in the sidebar fills progressively as the user answers classification questions. Each answer maps to one of the 4W fields:

| Tree Answer | 4W Field | Example |
|---|---|---|
| Scope questions (blocked_scope, degraded_scope) | **Who** | "Many users" / "A few users" |
| Impact question answer | **What** | "Users are blocked" / "Service is degraded" |
| Result trigger text | **What** (appended) | "Complete platform outage" |
| Always | **When** | "NOW" |
| Action question | **What to do** | "Action required" / "Informational only" |

**Format in textarea:**
```
Who: Many users
What: Users are blocked — Complete platform outage
When: NOW
What to do: No action required — informational only
```

**Non-Notification types:** For information types that don't chain to the severity tree (Feedback, Validation Messages, etc.), the 4W narrative may only have 1–2 fields filled (e.g., just "What" from the type result). This is expected — the partial narrative shows what was classified. Fields without data are omitted from the textarea (no empty "Who:" lines).

---

## 5. Text Conventions

### 5.1 Helper Text Convention

Each question has two levels of helper text with distinct purposes:

- **Question helper** (`description` on QuestionNode) — Frames what to think about. Helps the user understand the question when the question text alone might be ambiguous. Never repeats the answer options.
- **Answer helper** (`description` on QuestionOption) — Disambiguates between options. Gives concrete examples so the user can confidently pick one.

The two must never overlap. If the question helper mentions examples, the answer helpers should not repeat them.

### 5.2 Content Design Principles Applied

All tree text follows the project's content design principles:
- Plain language — no jargon, no UX terminology
- Active voice — "Can users still do their work?" not "Is user work impacted?"
- Specific over vague — concrete examples in answer helpers
- Concise — questions fit in one line, helpers in one line
- Role-agnostic — understandable by PMs, devs, and incident responders

### 5.3 i18n Keys

New keys needed (both `en.ts` and `de.ts`):

| Key | EN Value |
|---|---|
| `classification.progress.step` | `"Step {current} of {total}"` |
| `classification.progress.complete` | `"Classification complete"` |
| `classification.escapeHatch.trigger` | `"Not sure? Describe what's happening instead"` |
| `classification.escapeHatch.useThis` | `"Use this"` |
| `classification.escapeHatch.tryAgain` | `"Try again"` |
| `classification.escapeHatch.nudge` | `"Having trouble? Try selecting one of the options directly — the helper text under each option explains what it covers."` |
| `classification.escapeHatch.noMatch` | `"I couldn't match your description to any of the options. Try describing what's happening on your platform."` |
| `classification.result.title` | `"Classification Result"` |
| `classification.result.phase1Complete` | `"Phase 1 complete"` |
| `classification.result.trigger` | `"Trigger"` |
| `classification.result.channels` | `"Recommended channels"` |

---

## 6. Data Flow

```
User starts event story
    ↓
Load information-type tree
    ↓
Show first question (tree.entryNode)
    ↓
User selects option → store records PathEntry → advance to next node
    ↓
[If question node] → Show next question, update 4W narrative
[If result node with continueWith] → Seamlessly load severity tree, continue questions
[If result node without continueWith] → Classification complete
    ↓
Display result card in main area
Update ClassificationTile in sidebar
Mark progress bar as complete
```

---

## 7. Scope Boundaries

### In Scope
- Tree walker store (`classificationStore.ts`)
- Classification progress bar (`ClassificationProgress.vue`)
- Freeform escape hatch (`FreeformEscapeHatch.vue`)
- Tree question → RenderableQuestion adapter
- 4W narrative progressive fill in sidebar
- Result display after classification
- Seamless tree chaining (info-type → severity)
- Keyboard shortcuts (1-4 for options, Enter to continue)

### Out of Scope
- Phase 2 (LLM extraction) transition
- Phase 3 (text generation) transition
- History/back navigation between questions
- Severity classification for non-Notification types
- Escalation recommendations
- Persistence (save/restore classification state across page refreshes)

---

## 8. File Map

New files:
```
src/stores/classificationStore.ts          — Tree-walking state management
src/components/event-story/ClassificationProgress.vue  — Step-based progress bar
src/components/event-story/FreeformEscapeHatch.vue     — LLM-assisted option mapping
```

Modified files:
```
src/data/story-questions.ts                     — Add 'tree' to RenderableQuestion origin union, make targetChecklistItems optional
src/components/event-story/EventStoryView.vue   — Add classification flow branch (import classificationStore, conditional render)
src/components/event-story/StoryQuestion.vue    — Add escape hatch trigger link for tree questions
src/components/event-story/StoryPanel.vue       — Conditional Phase 1 mode (hide ModelSelector, product context, ReasoningTile)
src/components/event-story/ClassificationTile.vue — Extend TYPE_TAG_STYLES with tree info-type values
src/stores/eventStoryStore.ts                   — Expose classificationResult ref for sidebar consumption (minimal)
src/i18n/en.ts                                  — New i18n keys for classification flow
src/i18n/de.ts                                  — German translations
```

Unchanged (reused as-is):
```
src/components/event-story/RadioTile.vue
src/components/event-story/HotkeyBadge.vue
src/components/event-story/StoryDialog.vue
src/components/event-story/AnswerTile.vue
src/components/shared/AppIcon.vue
src/services/decisionTree.ts
src/types/decisionTree.ts
src/data/decision-tree_information-type.json
src/data/decision-tree_notification-severity.json
```
