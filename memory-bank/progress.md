# Progress

## Completed
- [x] Project setup and initial scaffolding
- [x] Event Story Builder with guided interview flow
- [x] LLM extraction pipeline (storyExtractor, responseParser, jsonRepair)
- [x] Severity matrix and classification derivation
- [x] Multi-channel text generation (banner, dashboard, email, status page)
- [x] Bilingual support (DE/EN) with independent German prose
- [x] JSON parse pipeline — defense-in-depth with 8-stage repair
- [x] Split god store into composables (useReviewPhase, usePersistence)
- [x] Decoupled mapAnswer from direct state mutation (ChecklistPatch pattern)
- [x] Replaced isProgrammaticUpdate hack with nextTick+rAF pattern
- [x] Fixed ~40 strict-mode TypeScript errors
- [x] Vite optimizeDeps fix for Scale components
- [x] Pipeline evaluation framework (pipeline-eval-v2.mjs, 12 scenarios)
- [x] Product Context feature (productContextStore, local mode, file upload)
- [x] Product Context integrated into extraction + text gen prompts
- [x] Confirm label clarity improvements (scope/impact disambiguation)
- [x] Holistic analysis follow-up options (structured radio/checkbox)
- [x] Document preview modal (scale-modal with formatted markdown)
- [x] Design Principles page (renders content-design-principles.md)
- [x] Shared markdown rendering utility (`renderMarkdown.ts` + `markdown.css`)
- [x] Deterministic classification via decision trees (Phase 1 v1) — two chained JSON trees
- [x] Q0 domain split (Service vs Management UI) — v5→v6 information-type tree
- [x] Progressive classification narrative builder (W-headings from tree answers)
- [x] Simplified channel names in classification results
- [x] ClassificationTile (no Tone section, per Figma)
- [x] Architectural decisions #13–#18 documented in `docs/decisions.md`
- [x] Two complete branches after Q0 — Service (`svc_*` nodes) and Management branches
- [x] Help text for all 13 tree questions — purpose-driven descriptions
- [x] Architecture evolution documented — hybrid model replacing tree-first classification
- [x] Decisions #22–25: classification after Phase 2, three-category split, simplified severity, LLM as normalizer
- [x] Architecture audit — validated hybrid model, 0 HIGH risks, 5 MEDIUM gaps (Decision #26)
- [x] **Phase 1 restructured** — flat sequential questions replacing tree walker (Decision #27)
- [x] `classifyFromMetadata()` — deterministic classification from flat metadata
- [x] Old decision trees deleted — JSON files, `decisionTree.ts`, tree types removed
- [x] Narrative builder rewritten for flat question IDs
- [x] Classification store rewritten — same public API, flat internals
- [x] i18n keys added — ~50 new classification question keys (EN + DE)
- [x] All tests rewritten — classificationStore, narrativeBuilder, new classifyFromMetadata + questions tests
- [x] **Code architecture audit** — `docs/code-architecture-audit.md` (21,367 LOC, 119 files, full metrics)
- [x] Dead code cleanup — removed deprecated `storyQuestions` export
- [x] Figma audit fix — ClassificationTile tag font-weight 700 → 655
- [x] Phase 2 handover updated — `docs/phase2-handover.md` rewritten for flat question model

## In Progress
- [ ] Pipeline quality optimization with Product Context

## Planned (Priority Order)
- [ ] **Split `eventStoryStore.ts`** — 610 LOC God Object → 3 focused composables (code audit HIGH #1)
- [ ] **Add `eventStoryStore` tests** — 0% coverage on core business logic (code audit HIGH #2)
- [ ] **Extract `CHANNEL_METADATA` constant** — hardcoded limits in prompts (code audit HIGH #3)
- [ ] **Phase 2 LLM normalization** — guided freetext → predefined categories
- [ ] **Rule-based classification engine** — deterministic evaluation of all collected data
- [ ] Surface console-only errors to UI (12 catch blocks, code audit MEDIUM #4)
- [ ] Phase 3 escalation design — communication timeline per severity
- [ ] Production LLM provider deployment
- [ ] Product Context RAG mode
- [ ] E2E tests (Playwright)
- [ ] Placeholder template generation feature (infrastructure built, UX not designed)

## Changelog
- 2026-03-12 — **Code architecture audit**: 21,367 LOC, 119 files. Key findings: eventStoryStore (610 LOC, 57 exports, 14 importers), 15% test coverage, 31 dead exports, 12 console-only catches, 27 `as` casts. Cleanup: removed dead export, fixed Figma font-weight mismatch.
- 2026-03-12 — **Phase 1 restructured**: flat sequential questions replace chained decision trees. `classifyFromMetadata()` for deterministic rules. Old trees deleted. All tests rewritten (550 pass). Decision #27.
- 2026-03-12 — **Phase 2 handover updated**: rewritten for flat question model with `Phase1Metadata`, new exploitation table, code quality context.
- 2026-03-12 — Architecture audit: validated hybrid model against research + industry. 0 HIGH risks, 5 MEDIUM gaps. Decision #26 (always-confirm pattern).
- 2026-03-12 — Architecture evolution: documented hybrid model. Decisions #22–25.
- 2026-03-12 — Help text, two complete branches, Q0 domain split, Decisions #16–#18
- 2026-03-12 — Deterministic classification trees, progressive narrative builder, simplified channels
- 2026-02-27 — Design Principles page, shared markdown utility, holistic analysis options
- 2026-02-27 — Product Context pipeline eval (Runs 3-4). IPS 94.7-95.8.
- 2026-02-26 — Pipeline eval v2 framework, 3 bug fixes, architecture cleanup, JSON parse pipeline
- 2026-02-26 — Fixed ~40 TypeScript strict-mode errors, 99 tests passing

---
*Last updated: 2026-03-12*
