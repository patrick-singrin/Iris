# Event Story Builder

## What It Is

The Event Story Builder is a guided tool within Iris that helps teams write clear, structured user-facing event notifications (outage notices, maintenance windows, incident updates, etc.).

The flow has three phases:

1. **Phase 1 — Classification** (deterministic): Users answer 2–7 structured questions to classify the event type and severity. No LLM involved — the classification is exact.
2. **Phase 2 — Extraction** (LLM-powered): Users answer open-ended interview questions. After each answer, a local LLM extracts structured data and builds a narrative.
3. **Phase 3 — Text Generation** (LLM-powered): The LLM generates channel-specific text (banner, email, dashboard, status page) from the narrative and extracted data.

## Phase 1: Classification Flow

### Why Deterministic?

LLM-based classification was unreliable. The model frequently misinterpreted scope, severity, and event type from freeform text. Explicit user selections guarantee correct classification every time. (See [Decision #13](./decisions.md).)

### How It Works

Two JSON-based decision trees are walked sequentially:

1. **Information-Type Tree** (`src/data/decision-tree_information-type.json`)
   - 5 question nodes, 7 result nodes
   - Classifies into: Feedback, Validation Messages, Error & Warnings, Transactional Confirmation, Status Display, or **Notification**

2. **Notification-Severity Tree** (`src/data/decision-tree_notification-severity.json`)
   - 6 question nodes, 10 result nodes
   - Only entered when type = Notification (via `continueWith` chaining)
   - Determines: CRITICAL / HIGH / MEDIUM / LOW severity
   - Recommends channels: Banner, Dashboard, E-Mail, Status Page

The transition between trees is seamless — the user sees one continuous question flow.

### Progressive Narrative

During classification, the sidebar textarea isn't empty. A rules-based mapper (`classificationNarrativeBuilder.ts`) translates each answer into a plain-English sentence and slots it into the correct W-heading section. The narrative grows in real time:

```
What:
A background system event occurred. The entire platform is down.

Who:
Users are blocked from completing their tasks. Many users are affected.

When:
NOW
```

When Phase 1 completes, this narrative seeds the editable textarea for Phase 2.

### Sidebar During Classification

The right sidebar shows:
- **Event Narrative** — progressive W-heading text (read-only during classification)
- **Classification Progress** — step-based progress bar ("2/6 · Event Trigger")
- **ClassificationTile** — live-updating type tag, severity tag, and channel recommendations

Components hidden during Phase 1: ModelSelector, Product Context toggle, ReasoningTile.

### Escape Hatch

Each tree question includes a freeform text field ("Or type your own answer"). If the user types instead of clicking an option, the `FreeformEscapeHatch` component sends the text to the LLM to match it to the closest option. This handles edge cases where the predefined options don't quite fit.

### Classification Components

| Component | File | Role |
|-----------|------|------|
| classificationStore | `src/stores/classificationStore.ts` | Tree-walking state, path history, result, progressive classification |
| classificationNarrativeBuilder | `src/services/classificationNarrativeBuilder.ts` | Maps tree answers → W-heading narrative sentences |
| ClassificationProgress | `src/components/event-story/ClassificationProgress.vue` | Step-based progress bar for classification |
| FreeformEscapeHatch | `src/components/event-story/FreeformEscapeHatch.vue` | LLM-assisted option matching for typed answers |
| ClassificationTile | `src/components/event-story/ClassificationTile.vue` | Sidebar tile showing type, severity, channels |

### Key Types

```typescript
// classificationStore.ts
interface ClassificationResult {
  informationType: string      // e.g., "Notification"
  severity: string | null      // e.g., "CRITICAL" (only for Notifications)
  channels: string[]           // e.g., ["Banner", "Dashboard", "E-Mail"]
  trigger: string              // e.g., "Complete platform outage"
  path: PathEntry[]            // Full decision path for traceability
}

// classificationNarrativeBuilder.ts
interface NarrativeContribution {
  section: 'what' | 'who' | 'when' | 'whatToDo'
  text: string
  mode: 'set' | 'append'      // 'set' replaces, 'append' adds detail
}
```

## Phase 2: LLM Interview

### User Flow

1. **Answer guided questions** — each question has pre-defined options (radio/checkbox tiles) plus a freeform text area. Questions are defined in `src/data/story-questions.ts`.
2. **LLM analysis after each answer** — the full conversation context (all questions + answers so far) is sent to the LLM. The LLM returns structured JSON with extracted items and a narrative.
3. **Side panel updates** — the StoryPanel shows the evolving narrative and a checklist of extracted fields with confidence indicators.
4. **Review and configure** — once all questions are answered, the user reviews extracted data, configures escalation levels and channels, and can generate final text outputs.

### Interview Components

| Component | File | Role |
|-----------|------|------|
| EventStoryView | `src/components/event-story/EventStoryView.vue` | Main view, orchestrates both phases |
| StoryQuestion | `src/components/event-story/StoryQuestion.vue` | Renders each question with options and text input |
| StoryPanel | `src/components/event-story/StoryPanel.vue` | Side panel showing narrative + checklist + classification |
| StoryDialog | `src/components/event-story/StoryDialog.vue` | Dialog wrapper for the story builder |
| eventStoryStore | `src/stores/eventStoryStore.ts` | Store managing interview state, question flow, LLM calls |
| storyExtractor | `src/services/llm/storyExtractor.ts` | Builds prompts, calls LLM, parses responses |
| story-questions | `src/data/story-questions.ts` | Question definitions, options, checklist items |
| story-classification | `src/data/story-classification.ts` | Classification field definitions and allowed values |

### LLM Integration

- **Provider**: Local LLM via LM Studio (configurable in settings)
- **Provider factory**: `src/services/llm/providerFactory.ts`
- **Two response formats**:
  - `parseAnalysisResponse()` — handles full analysis (items + story + classification)
  - `parseTextAnalysisResponse()` — handles text-only analysis
- Both use the shared `robustJsonParse()` pipeline (see [JSON Parse Pipeline](./json-parse-pipeline.md))

### Narrative Format

The narrative follows a W-heading structure:

```
What: A brief description of the event.
Who: Who is affected.
When: Timing details with specific dates/times.
What to do: Concrete actions users should take.
```

The LLM is instructed to use **real, specific details** from the user's answers (service names, dates, times) — never generic placeholders like `{service_name}`.

## Tech Stack

- **Vue 3** + **TypeScript** + **Vite**
- **@telekom/scale-components** v3.0.0-beta.156 (Stencil-based web components)
- **No Vue Router** — simple view switching via `appStore.activeView`
- **Scoped styles** using `--telekom-color-*` and `--telekom-spacing-*` CSS custom properties
- **Local LLM** via LM Studio (no cloud API calls for story generation)
