# Iris — Content Design Assistant

Iris helps teams create clear, actionable event notifications for end users — from incident alerts to maintenance announcements. It uses an LLM-guided interview flow to extract structured information and generate polished, multi-channel communication.

## Features

- **Event Story Builder** — guided interview flow that extracts structured data from freeform input
- **LLM-powered extraction** — automated severity classification and channel recommendation
- **Multi-channel text generation** — banner, email, dashboard, status page output with character limits
- **Bilingual output** — German and English, with independent German prose (not translated)
- **Content Design Principles** — built-in reference guide that also powers the LLM writing rules
- **Product Context** — upload domain-specific `.md` files to tune generated text to your product

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Vue 3.5 (Composition API, `<script setup>`) |
| Language | TypeScript 5.9 (strict mode) |
| Build | Vite 7.3 |
| Testing | Vitest 4.0 |
| Design System | [@telekom/scale-components](https://github.com/nickvdyck/scale) v3.0.0-beta.156 |
| LLM | LM Studio (local, OpenAI-compatible API) |

## Getting Started

### Prerequisites

- Node.js 20+
- [LM Studio](https://lmstudio.ai/) running locally at `localhost:1234` (for LLM features)

### Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:5188](http://localhost:5188).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (port 5188) |
| `npm run build` | Type-check + production build (`vue-tsc && vite build`) |
| `npm run test` | Run Vitest in watch mode |
| `npm run test:run` | Run Vitest once |
| `node tests/pipeline-eval-v2.mjs` | Pipeline evaluation (requires LM Studio) |

## Project Structure

```
src/
  components/           UI components grouped by feature
    chat/               Chat / conversation UI
    design-principles/  Content design principles reference
    event-story/        Story builder interview flow
    settings/           Settings panel (LLM config, product context)
    text-generation/    Channel text generation UI
    shared/             Reusable UI components
  composables/          Extracted logic (useReviewPhase, usePersistence)
  data/                 Static data, questions, classification, design principles
  i18n/                 EN and DE translation files
  services/llm/         LLM providers, prompt builders, parsers, JSON repair
  stores/               Reactive state stores (plain ref/reactive, no Pinia)
  styles/               Shared CSS (markdown rendering)
  types/                TypeScript type definitions
  utils/                Shared utilities (markdown renderer)
```

## Architecture

Vue 3 SPA with no backend server — all LLM calls go directly from the browser to LM Studio (local) or a cloud API (planned).

**Core flow:**
User input → Story Builder interview → LLM extraction → Classification → Text generation → Multi-channel output

Key decisions:
- **Local LLM** for data privacy of sensitive operational events
- **Defense-in-depth JSON parsing** — 8-stage repair pipeline handles malformed LLM output
- **No Vue Router** — single-purpose tool, view switching via `activeView` ref
- **Content design principles** — single `.md` file serves as both the visual reference page and the LLM system prompt

See `docs/decisions.md` for the full decision log.

## Testing

99 unit tests across 3 test suites:
- `jsonRepair.test.ts` — 50 tests for JSON repair pipeline
- `storyExtractor.test.ts` — 23 tests for extraction and narrative salvage
- `story-classification.test.ts` — 26 tests for classification derivation

Pipeline evaluation runs 12 scenarios against the LLM and scores an IPS (IRIS Pipeline Score) composite. Current score: **94.7–95.8 (Grade A/A+)**.

## License

Private — Deutsche Telekom internal use.
