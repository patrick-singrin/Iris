# System Patterns

## Architecture
Vue 3 SPA with LLM-powered backend services. No server — all LLM calls go directly from the browser to LM Studio (local) or Anthropic API (planned).

Key flow: **User input → Story Builder interview → LLM extraction → Classification → Text generation → Multi-channel output**

See `docs/event-story-builder.md` for the full flow and `docs/decisions.md` for architectural rationale.

## Key Design Decisions
- **Local LLM via LM Studio** → Data privacy for sensitive operational events. Trade-off: less reliable JSON output, which motivated the robust parse pipeline.
- **No Vue Router** → Single-purpose tool, `activeView` ref in `appStore.ts` is sufficient.
- **W-heading narrative format** → `What:`, `Who:`, `When:`, `What to do:` — consistent structure for scannable notifications.
- **Defense-in-depth JSON parsing** → Multi-stage repair pipeline in `jsonRepair.ts` handles every common LLM output quirk. See `docs/json-parse-pipeline.md`.
- **Progressive narrative updates** → Narrative updates after every answer, not just at the end. Immediate user feedback.
- **No placeholders in narrative** → Real details only. Placeholder infrastructure exists for future template feature.

Full decision log: `docs/decisions.md`

## Code Conventions
- Components organized by feature: `components/{feature}/` (chat, wizard, event-story, text-generation, settings, etc.)
- Stores are plain Vue composable-style files in `stores/` using `ref`/`reactive` — no Pinia/Vuex
- i18n: `src/i18n/en.ts` and `src/i18n/de.ts` with dot-notation keys (e.g., `sq.cl.impactScope.confirm`)
- LLM services in `services/llm/` — provider pattern with `providerFactory.ts`
- Classification fields have strict allowed values defined in `data/story-classification.ts`

## File & Folder Structure
```
src/
  components/      → UI components grouped by feature
    chat/          → Chat/conversation UI
    wizard/        → Event creation wizard steps
    event-story/   → Story builder interview flow
    text-generation/ → Channel text generation UI
    settings/      → Settings panel (LLM config, product context)
    shared/        → Reusable UI components
  composables/     → Extracted logic (useReviewPhase, usePersistence)
  data/            → Static data, question definitions, classification
  i18n/            → EN and DE translation files
  services/        → Business logic
    llm/           → LLM providers, prompt builders, parsers, JSON repair
  stores/          → Reactive state stores
  types/           → TypeScript type definitions
```

## Error Handling Patterns
- LLM responses go through `robustJsonParse()` → multi-stage repair → regex fallback extraction
- Failed parses show `scale-notification` error banner with retry button
- `salvageNarrative()` extracts usable text from failed JSON as graceful degradation
- All LLM errors are logged to console with context (provider, prompt length, raw response)

## Testing Patterns
- **Vitest** for unit tests
- Tests co-located in `__tests__/` directories next to source
- Key test suites: `jsonRepair.test.ts` (50 tests), `storyExtractor.test.ts` (23 tests), `story-classification.test.ts` (26 tests)
- Pipeline evaluation: `tests/pipeline-eval-v2.mjs` — runs 12 scenarios against LM Studio, scores IPS composite
- Results tracked in `docs/pipeline-eval-results.md` (living document)
