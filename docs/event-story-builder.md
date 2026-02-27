# Event Story Builder

## What It Is

The Event Story Builder is a guided, LLM-powered tool within Iris that helps teams write clear, structured user-facing event notifications (outage notices, maintenance windows, incident updates, etc.).

Instead of staring at a blank page, users answer a short series of guided questions. After each answer, a local LLM analyzes the conversation so far and:

1. **Extracts checklist items** — structured fields like event kind, timing, impact scope, user actions, etc.
2. **Composes a narrative** — a polished, W-heading-formatted notification text using real details from the user's answers.

The narrative updates progressively as the user answers more questions, getting richer and more specific with each step.

## How It Works

### User Flow

1. **Start a new event** — user picks an event category (e.g., "System change or maintenance").
2. **Answer guided questions** — each question has pre-defined options (radio/checkbox tiles) plus a freeform text area. Questions are defined in `src/data/story-questions.ts`.
3. **LLM analysis after each answer** — the full conversation context (all questions + answers so far) is sent to the LLM. The LLM returns structured JSON with extracted items and a narrative.
4. **Side panel updates** — the StoryPanel shows the evolving narrative and a checklist of extracted fields with confidence indicators.
5. **Review and configure** — once all questions are answered, the user reviews extracted data, configures escalation levels and channels, and can generate final text outputs.

### Key Components

| Component | File | Role |
|-----------|------|------|
| EventStoryView | `src/components/event-story/EventStoryView.vue` | Main view, orchestrates the flow |
| StoryQuestion | `src/components/event-story/StoryQuestion.vue` | Renders each question with options and text input |
| StoryPanel | `src/components/event-story/StoryPanel.vue` | Side panel showing narrative + checklist |
| StoryDialog | `src/components/event-story/StoryDialog.vue` | Dialog wrapper for the story builder |
| eventStoryStore | `src/stores/eventStoryStore.ts` | Pinia-style store managing state, question flow, LLM calls |
| storyExtractor | `src/services/llm/storyExtractor.ts` | Builds prompts, calls LLM, parses responses |
| story-questions | `src/data/story-questions.ts` | Question definitions, options, checklist items |
| story-classification | `src/data/story-classification.ts` | Classification field definitions and allowed values |
| placeholders | `src/data/placeholders.ts` | Placeholder config (reserved for future template step) |

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
