# Active Context

## Current Focus
**Phase 1 restructuring complete. Code quality audit complete. Ready for Phase 2.**

Phase 1 classification has been restructured from chained decision trees to flat sequential questions with conditional visibility. Deterministic rules in `classifyFromMetadata()` derive severity, channels, and information type. A comprehensive code quality audit has been performed and documented. The Phase 2 handover document has been updated with the new data model.

## Recent Changes
- **Phase 1 restructured** — Flat sequential questions (`classification-questions.ts`) replace two chained JSON decision trees. Same public API, simpler internals. Decision #27.
- **Decision trees deleted** — `decision-tree_information-type.json`, `decision-tree_notification-severity.json`, `decisionTree.ts`, `decisionTree.ts` (types) all removed.
- **`classifyFromMetadata()` added** — Pure deterministic function in `story-classification.ts`. No LLM, no store access.
- **Code architecture audit** — `docs/code-architecture-audit.md` documents 21,367 LOC across 119 files. Key findings: eventStoryStore at 610 LOC / 57 exports (God Object), 15% test coverage, 31 dead exports, 12 console-only catch blocks.
- **Cleanup performed** — Removed dead `storyQuestions` export from `story-questions.ts`. Fixed ClassificationTile font-weight mismatch (700 → 655 for TeleNeo Var Bold axis).
- **Phase 2 handover updated** — `docs/phase2-handover.md` rewritten for flat question model: `Phase1Metadata` replaces tree node IDs, new metadata exploitation table, code quality context added.
- **Architecture audit (prior)** — `docs/architecture-audit.md` validated hybrid model against research. 0 HIGH risks, 5 MEDIUM gaps. Decision #26 (always-confirm pattern).
- **Decisions #22–27** logged in `docs/decisions.md`.

## Open Questions
1. User-facing wording for three-way Q1 split (Core value / Capability / Management are internal labels)
2. Which Phase 2 questions are mandatory vs. conditional per category
3. Predefined categories for Phase 2 LLM normalization (to be defined in `story-classification.ts`)
4. Progressive feedback during Phase 2 freetext (when does narrative update?)

## Blockers
- 4/12 eval scenarios fail JSON parsing with 14B local model when product context is enabled. Production LLM expected to resolve.

## Next Steps (Priority Order)
1. [ ] **Split `eventStoryStore.ts`** — 610 LOC → 3 focused composables (code audit HIGH #1)
2. [ ] **Add `eventStoryStore` tests** — 0% coverage on core business logic (code audit HIGH #2)
3. [ ] **Extract `CHANNEL_METADATA` constant** — hardcoded limits in prompts (code audit HIGH #3)
4. [ ] **Phase 2 LLM normalization** — guided freetext → predefined categories
5. [ ] **Rule-based classification engine** — deterministic evaluation of Phase 1 + Phase 2 data
6. [ ] Phase 3 escalation design — communication timeline per severity level

---
*Last updated: 2026-03-12*
