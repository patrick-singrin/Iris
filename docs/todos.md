# TODOs and Remaining Work

## High Priority

### ~~Verify JSON parse fixes in the browser~~ (Done 2026-02-26) — see Completed section

### ~~Update Q2 hint text~~ (Done 2026-02-26) — see Completed section

## Medium Priority

### ~~Architecture: Split the God Store~~ (Done 2026-02-26) — see Completed section

### ~~Architecture: Decouple `mapAnswer` from direct state mutation~~ (Done 2026-02-26) — see Completed section

### ~~Architecture: Replace `isProgrammaticUpdate` hack~~ (Done 2026-02-26) — see Completed section

### Placeholder system (future template step)
The placeholder infrastructure (`src/data/placeholders.ts`, `src/data/placeholders.json`) is built but unused. It's reserved for a future "Generate Template" feature where users can turn a completed narrative into a reusable template with `{service_name}`, `{date}`, etc. This hasn't been designed yet.

### ~~Vite cache management~~ (Done 2026-02-26) — see Completed section

### ~~Error display improvements~~ (Done 2026-02-26) — see Completed section

## Low Priority

### ~~Story text flow race condition~~ (Done 2026-02-26) — see Completed section

### ~~Test expansion~~ (Done 2026-02-26) — see Completed section

### ~~Pre-existing TypeScript errors~~ (Done 2026-02-26) — see Completed section

## Completed

### ~~Split the God Store~~ (Done 2026-02-26)
- [x] Extracted review-phase logic into `src/composables/useReviewPhase.ts` (state, analysis, generation, navigation)
- [x] Extracted persistence logic into `src/composables/usePersistence.ts` (hydration, auto-save, restore)
- [x] `eventStoryStore.ts` reduced from ~705 lines to ~390 lines (interview flow + LLM orchestration)
- [x] Broke circular dependency: `AnsweredQuestion` type now owned by `usePersistence.ts`, re-exported from store
- [x] Zero component changes needed — store's public API unchanged (re-exports all types)
- [x] All 50 tests pass, production build succeeds, zero new TypeScript errors

### ~~Update placeholder hint texts~~ (Done 2026-02-26)
- [x] Removed `{placeholder}` references from 3 help texts (`sq.whatHappened.help`, `sq.timing.help`, `sq.whatToDo.help`)
- [x] Replaced placeholder-style freeform examples with concrete examples using real values
- [x] Aligned with "no placeholders in user-facing narrative" decision

### ~~Replace `isProgrammaticUpdate` hack~~ (Done 2026-02-26)
- [x] Replaced boolean flag + `setTimeout(150ms)` + `@focusin` handler with `nextTick` + `requestAnimationFrame` pattern
- [x] Focus-theft detection: checks if textarea had focus before update; if not, blurs any stolen focus after render settles
- [x] Removed `handleFocusGuard` function and `@focusin` template binding
- [x] No arbitrary timing constants — uses browser frame scheduling instead

### ~~Decouple `mapAnswer` from direct state mutation~~ (Done 2026-02-26)
- [x] Changed `mapAnswer` to return a `ChecklistPatch[]` array instead of mutating checklist in-place
- [x] Store applies patches via `applyPatches()` helper — single point of state mutation
- [x] Added `ChecklistPatch` type to `story-questions.ts`
- [x] All existing tests pass, no component changes needed

### ~~Error display improvements~~ (Done 2026-02-26)
- [x] Replaced custom HTML error banner with `scale-notification` component (variant="danger")
- [x] Added retry button below error banner (`retryAnalysis` → re-runs `runAnalysis`)
- [x] Added `salvageNarrative()` graceful degradation: extracts usable narrative from failed JSON via "story" regex or W-heading detection
- [x] `parseAnalysisResponse` now returns `{ items: [], story: salvaged, error }` on total parse failure
- [x] Added i18n keys: `story.retry` (en: "Retry", de: "Erneut versuchen")

### ~~Test expansion~~ (Done 2026-02-26)
- [x] Unit tests for JSON repair pipeline (50 tests in `jsonRepair.test.ts`)
- [x] Unit tests for `storyExtractor.ts` (23 tests in `storyExtractor.test.ts` — salvageNarrative, parseAnalysisResponse, parseTextAnalysisResponse)
- [x] Unit tests for `story-classification.ts` (26 tests in `story-classification.test.ts` — FIELD_ALLOWED_VALUES, deriveClassification, composeStory, assessChannelQuality)
- [ ] Consider E2E tests (Playwright) for the question-answer-narrative flow (future)

### ~~Clean up the parse pipeline~~ (Done 2026-02-26)
- [x] Extracted all 8 parse/repair functions into `src/services/llm/jsonRepair.ts`
- [x] Added 50 unit tests via Vitest (`src/services/llm/__tests__/jsonRepair.test.ts`)
- [x] Moved `FIELD_ALLOWED_VALUES` to `src/data/story-classification.ts` (single source of truth)
- [x] Fixed deprecated `storyQuestions` import in `StoryDialog.vue` → `getStoryQuestions()`
- [x] `storyExtractor.ts` reduced from ~680 lines to ~280 lines
- [x] All 50 tests pass, zero new TypeScript errors introduced

### ~~Pre-existing TypeScript errors~~ (Done 2026-02-26)
- [x] Fixed ~40 strict-mode TS errors across the codebase → 0 errors remaining
- [x] Removed unused imports: `chatInputRef`, `canContinue`, `isEscalationEnabled` (×2), `hasEscalationSteps`
- [x] Added missing i18n keys: `story.holisticAnalysisFailed`, `story.holisticAnalysisFailedSuggestion` (en + de)
- [x] Fixed `ChannelQuality.ready` → `ChannelQuality.status === 'good'` in `storyAnalyzer.ts`
- [x] Fixed seed events: `questionId` → `nodeId`, `selectedOption` → `selectedLabel` to match `PathEntry` type
- [x] Added `id?: string` to `QuestionNode` type for radio button grouping
- [x] Added non-null assertions for guarded array accesses (test files, form handlers)
- [x] 99 tests pass, production build succeeds, vue-tsc reports 0 errors

### ~~Vite cache management~~ (Done 2026-02-26)
- [x] **Root cause:** Stencil's lazy-loading system expects specific file paths for individual component modules. Vite's pre-bundling collapses these into opaque chunks with content-based hashes. When the cache is cleared and rebuilt, new chunk filenames are generated, breaking Stencil's internal registry.
- [x] **`optimizeDeps.force`:** Acts as a sledgehammer — re-bundles all deps every server start. Not recommended for ongoing use.
- [x] **`--force` CLI flag:** Better for one-off cache busting (`npx vite --force`).
- [x] **Applied fix:** Added `optimizeDeps.exclude: ['@telekom/scale-components']` to `vite.config.ts`. This prevents Vite from pre-bundling Scale, so Stencil's lazy-loaded modules are served as-is. Avoids the stale-cache → broken-components cycle entirely.
- [x] Build succeeds, 99 tests pass

### ~~Story text flow race condition~~ (Verified 2026-02-26)
- [x] **Two-layer defense confirmed:** Store-level `userHasEditedStory` flag prevents LLM from overwriting edited narrative; component-level `userHasEdited` flag in `StoryPanel.vue` guards against Stencil focus-theft.
- [x] **Focus-theft fix confirmed:** Uses `nextTick` + `requestAnimationFrame` to detect and undo Stencil-induced focus theft (replaced old `isProgrammaticUpdate` + `setTimeout(150ms)` hack).
- [x] **Edge cases assessed:** Very fast LLM responses (<16ms), multiple rapid storyText updates, and Stencil hydration timing variance are all LOW risk. The store-level guard acts as a safety net even if component-level detection fails.
- [x] No code changes needed — fix is sound as-is

### ~~Verify JSON parse fixes in the browser~~ (Done 2026-02-26)
- [x] LM Studio running with `ministral-3-14b-reasoning` model
- [x] Walked through Q1 (selected "Error or issue") → checklist updated, narrative shows W-heading scaffold
- [x] Walked through Q2 (freeform: MagentaCLOUD 503 errors scenario) → LLM call returned 200 OK
- [x] **Parse pipeline succeeded:** LLM response parsed correctly, narrative updated with real details across all 4 W-headings (What/Who/When/What to do)
- [x] **Checklist extraction worked:** 8 items extracted from freeform text (unverified), 2 items verified from direct answers
- [x] **Verification question generated:** Q3 showed "Is this the right audience?" with source context highlighting
- [x] **Zero console errors** — no parse failures, no warnings, no storyExtractor error logs
- [x] Vite `optimizeDeps.exclude` config working correctly — Scale components loading via native ESM
