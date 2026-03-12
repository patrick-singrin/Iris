# Code Quality & Software Architecture Audit

*Conducted: 2026-03-12*
*Scope: Full codebase — structure, stores, services, components, data layer, tests, error handling*
*Method: Automated metrics collection + manual review*

---

## Executive Summary

Iris is a **21,367-line** Vue 3 + TypeScript SPA with clean separation of concerns. The data layer and JSON repair pipeline are production-grade. The main risks are concentrated in one area: **`eventStoryStore.ts`** — 610 LOC, 57 exported items, 14 downstream importers, and zero tests. Fixing this one file addresses 3 of the 5 high-priority findings.

Secondary concerns: 31 dead exports, 15% test file coverage, and 12 catch blocks that log errors to console without surfacing them to the user.

### Scorecard

| Area | Grade | Key Metric |
|---|---|---|
| Project structure | **A** | Clean feature-based layout, zero orphaned files |
| Data layer | **A** | SSOT for classification, pure functional patterns, 76+ tests |
| JSON repair pipeline | **A** | 354 LOC, 50+ tests, 7-stage defense-in-depth |
| TypeScript strictness | **A-** | Strict mode, only 4 `any` usages — but 27 `as` casts |
| i18n consistency | **A-** | Both locales always updated together, dot-notation keys |
| Service architecture | **B+** | Clean provider pattern, but duplicated channel metadata |
| Component architecture | **B** | Good composition, 3 components over 400 LOC |
| Store architecture | **B-** | Effective pattern, but eventStoryStore is a God Object |
| Error handling | **B-** | 22/44 catch blocks handle properly; 12 are console-only |
| Test coverage | **C+** | 8/53 source files tested (15%), zero store/component tests |
| Dead code hygiene | **C+** | 31 unused exports across services, data, and types |

---

## 1. Project Structure

```
src/                    21,367 LOC across 119 files
├── components/         54 components across 8 feature folders
│   ├── event-story/    12 components — core interview flow
│   ├── documentation/  5 components — event detail/history
│   ├── text-generation/ 4 components — channel text output
│   ├── chat/           3 components — text feedback chat
│   ├── wizard/         3 components — creation wizard
│   ├── settings/       4 components — LLM config
│   ├── design-principles/ 1 component — reference page
│   └── shared/         4 components — AppIcon, etc.
├── composables/        2 files — useReviewPhase, usePersistence
├── data/               7 files — questions, classification, presets
├── i18n/               3 files — index + EN (641 LOC) + DE (622 LOC)
├── services/           17 files — business logic + LLM providers
│   └── llm/            12 files — 4 providers, extractors, repair
├── stores/             10 stores
├── types/              7 type definition files
└── utils/              1 file — renderMarkdown.ts
```

### Top 10 largest files

| # | File | LOC | Concern |
|---|---|---|---|
| 1 | `i18n/en.ts` | 641 | Expected — translation dictionary |
| 2 | `i18n/de.ts` | 622 | Expected — translation dictionary |
| 3 | `stores/eventStoryStore.ts` | **610** | ⚠️ God Object — see §2 |
| 4 | `event-story/StoryQuestion.vue` | **568** | ⚠️ Multiple responsibilities — see §4 |
| 5 | `documentation/EventDetailView.vue` | 517 | View component, acceptable |
| 6 | `services/llm/storyExtractor.ts` | 472 | Complex prompt + parse logic, acceptable |
| 7 | `event-story/TextOutputView.vue` | 438 | View component, acceptable |
| 8 | `documentation/DocumentationView.vue` | 428 | View component, acceptable |
| 9 | `event-story/EventStoryView.vue` | 420 | Main orchestrator, acceptable |
| 10 | `data/story-questions.ts` | 373 | Data definitions, acceptable |

**Verdict:** Two files (#3, #4) need attention. The rest are appropriately sized for their complexity.

---

## 2. Store Architecture

### Pattern: Composable-style stores (no Pinia/Vuex)

All 10 stores export a composable function returning refs, computeds, and methods. This is an intentional architectural choice documented in `systemPatterns.md`.

### Mixed reactivity patterns

| Pattern | Stores (count) | Access style |
|---|---|---|
| Individual `ref()` | eventStoryStore, classificationStore, appStore, llmProviderStore, chatStore, generationStore, wizardStore **(7)** | `storeItem.value` |
| Single `reactive()` | productContextStore, settingsStore, eventStore **(3)** | `state.property` |

**Impact:** Consumers must remember which pattern each store uses. New contributors will get it wrong. Not a bug risk (TypeScript catches misuse), but a readability cost.

### Store-to-store dependencies

```
eventStoryStore  ──imports──▶  classificationStore
textFeedbackStore  ──imports──▶  textGenerationStore
```

No circular chains detected. Two directed dependencies is acceptable, but the `eventStoryStore → classificationStore` coupling means Phase 1 changes ripple into Phase 2 code.

### `eventStoryStore.ts` — The God Object

| Metric | Value | Threshold | Status |
|---|---|---|---|
| Lines of code | 610 | < 300 | ⚠️ 2× over |
| Exported items | 57 | < 20 | ⚠️ 3× over |
| Downstream importers | 14 files | < 8 | ⚠️ High fan-out |
| Test coverage | 0 tests | > 0 | 🔴 Untested |
| Internal helpers | `buildConversationContext()` ~80 LOC | — | Prompt logic embedded in store |

**Breakdown of the 57 exported items:**

| Category | Count | Examples |
|---|---|---|
| Refs (core state) | 11 | `answers`, `checklist`, `storyText`, `phase`, `isExtracting` |
| Computeds | 7 | `currentQuestion`, `classification`, `composedStory`, `channelQuality` |
| Interview methods | 4 | `answerQuestion`, `updateStoryText`, `applyTextEdit`, `resetSession` |
| Analysis methods | 4 | `selectAnalysisChoice`, `startFollowUpQueue`, `answerFollowUp`, `skipFollowUps` |
| UI toggles | 3 | `toggleWhyExplainer`, `dismissError`, `retryAnalysis` |
| Review-phase delegation | 17 | Forwarded from `useReviewPhase` composable |
| Persistence delegation | ~8 | Forwarded from `usePersistence` composable |
| Back navigation | 3 | `backToCollect`, `backToStep` |

The store was already partially decomposed (extracting `useReviewPhase` and `usePersistence`), but 17 of its 57 exports are just pass-throughs from `useReviewPhase`. The core interview + checklist + narrative logic remains monolithic.

**Recommendation (HIGH):** Split into focused composables:

```
eventStoryStore.ts (thin orchestrator, ~100 LOC)
  ├── useStoryInterview.ts    — question flow, answers, freeform
  ├── useStoryChecklist.ts    — checklist state, LLM extraction, verification
  ├── useStoryNarrative.ts    — narrative text, story text, editing
  ├── useReviewPhase.ts       — (already extracted)
  └── usePersistence.ts       — (already extracted)
```

This makes each piece independently testable and reduces the 14-file fan-out — most importers only need 1-2 of the sub-composables.

---

## 3. Service Layer

### LLM Provider Pattern — Clean

`providerFactory.ts` implements a factory pattern with 4 providers:

| Provider | Purpose | Temperature |
|---|---|---|
| `lmStudioProvider` | Local dev | **0.7** |
| `anthropicProvider` | Production (planned) | 0.3 |
| `llmHubProvider` | T-Systems enterprise | 0.3 |
| `connectionTestProvider` | Health checks | 0.3 |

**Temperature inconsistency:** LM Studio uses 0.7 while all production providers use 0.3. Local dev produces more creative/variable outputs than production. This may be intentional (compensating for smaller model capability), but it's undocumented and means local testing doesn't reproduce production behavior.

### Magic number: `maxTokens = 4096`

The value `4096` appears **9 times** across 5 files with no shared constant:

| File | Occurrences |
|---|---|
| `storyExtractor.ts` | 2 |
| `storyTextGenerator.ts` | 1 |
| `anthropicProvider.ts` | 1 |
| `llmHubProvider.ts` | 2 |
| `lmStudioProvider.ts` | 2 |
| `connectionProvider.ts` | 1 |

A separate `2048` value exists in `storyAnalyzer.ts` with no documentation for why it differs.

**Recommendation (MEDIUM):** Extract to `const DEFAULT_MAX_TOKENS = 4096` in a shared config or the provider factory. Document why `storyAnalyzer` uses a different value.

### Channel metadata duplication

Channel constraints (character limits, tone) are defined in multiple locations:
- `textFeedbackPromptBuilder.ts` — hardcoded `120`, `200` in prompt strings
- `textGenerator.ts` / `storyTextGenerator.ts` — template logic knows limits
- `story-classification.ts` — channel lists per severity

**Recommendation (HIGH):** Extract a single `CHANNEL_METADATA` constant:
```typescript
export const CHANNEL_METADATA = {
  banner:     { maxChars: 120, tone: 'urgent, scannable' },
  dashboard:  { maxChars: 200, tone: 'informative, concise' },
  email:      { maxChars: null, tone: 'detailed, professional' },
  statusPage: { maxChars: null, tone: 'factual, structured' },
} as const
```

### Enum ↔ Label fragmentation

Classification values have labels in three locations that must stay in sync:

| Location | What it defines |
|---|---|
| `story-classification.ts` `FIELD_ALLOWED_VALUES` | Valid enum values (authoritative) |
| `story-questions.ts` option arrays | Human-readable labels per option |
| `en.ts` / `de.ts` | i18n translations of the same labels |

Adding a new severity level requires updating all three. The SSOT enforces valid *values* but not that all values have *labels*.

**Recommendation (MEDIUM):** Add `labelKey` to `FIELD_ALLOWED_VALUES` entries → single mapping from enum → i18n key. Story questions reference this map instead of duplicating labels.

---

## 4. Component Architecture

### Composition: Good

Components properly compose Scale Design System web components (`scale-*` prefix). Feature components live in feature folders. Shared components in `shared/`. No god components at the view level.

### `StoryQuestion.vue` — 568 LOC, multiple responsibilities

This component handles:
1. Radio tile rendering for any `RenderableQuestion`
2. Freeform text input with placeholder
3. Keyboard shortcuts (1-9 for options, Enter to confirm)
4. LLM freeform-to-option mapping (async)
5. Verification mode (confirm/change LLM-extracted values)

Five responsibilities in one component. The file is well-organized internally, but testing any single behavior requires mounting the entire component.

**Recommendation (MEDIUM):** Extract:
- `useQuestionHotkeys(options, onSelect)` composable
- `useFreeformMapping(questionId, text)` composable
- `VerificationQuestion.vue` — dedicated component for verify mode

### CSS `!important` — 18 declarations

| Pattern | Count | Files |
|---|---|---|
| Override Stencil shadow DOM | 4 | `StoryPanel.vue` (documented, necessary) |
| Hide scale-component internals | **10** | `TextOutputView.vue` (5), `EventStoryView.vue` (5) |
| Layout reset | 2 | `App.vue` |
| Color override | 1 | `ChatInput.vue` |
| Utility | 1 | Misc |

**The 10 "hide element" declarations are duplicated verbatim** between `TextOutputView.vue` and `EventStoryView.vue`:
```css
display: none !important;
height: 0 !important;
padding: 0 !important;
margin: 0 !important;
overflow: hidden !important;
```

**Recommendation (LOW):** Extract to a shared utility class in `src/styles/`:
```css
.scale-hidden-label { display: none !important; height: 0 !important; /* etc */ }
```

---

## 5. Data Layer & Types

### Strengths

| Pattern | Assessment |
|---|---|
| `FIELD_ALLOWED_VALUES` SSOT | ✅ Single source for all valid classification values |
| `ChecklistPatch` pure functional pattern | ✅ Decouples logic from mutation — elegant and testable |
| `StoryChecklistItem` provenance tracking | ✅ `source: 'user' \| 'llm'` + `verified: boolean` |
| Decision tree JSON schema | ✅ Consistent node structure across both trees |

### Type safety: 27 `as` casts, 4 `any` usages

**`as` assertions by file:**

| File | Count | Pattern |
|---|---|---|
| `story-classification.ts` | 6 | `value as string`, `value as string[]`, result casts |
| `textFeedbackPromptBuilder.ts` | 3 | Response field casting |
| `storyExtractor.ts` | 2 | Parsed JSON casting |
| `responseParser.ts` | 2 | Parsed field casting |
| `storyTextGenerator.ts` | 2 | Response casting |
| `eventStoryStore.ts` | 3 | Misc casting |
| Other files | 9 | Scattered (1-2 each) |

The 6 casts in `story-classification.ts` are the highest risk — they sit at the classification boundary where incorrect values have downstream consequences.

**`any` usages (4 total):**
- `llmHubProvider.ts:31,36` — model list mapping `(m: any)`
- `modelFetcher.ts:35,40` — model list mapping `(m: any)`

Both are in API response handling where the external schema isn't typed. Low risk, but should use `unknown` + narrowing.

**Recommendation (MEDIUM):** For `story-classification.ts`, replace `as` casts with runtime validation:
```typescript
const severity = computeSeverity(cl)
assert(FIELD_ALLOWED_VALUES.severity.includes(severity), `Invalid severity: ${severity}`)
```

---

## 6. Dead Code — 31 Unused Exports

### By layer

| Layer | Unused exports | Examples |
|---|---|---|
| Services | 8 | `ExtractedItem`, `StoryAnalysisResult`, `getEvent`, `getTemplates`, `eventToMarkdown` |
| Data | 10 | `ChecklistPatch`, `fillItem`, all placeholder functions, all escalation preset functions |
| Types | 7 | `TypeTemplate`, 5 context interfaces (`ErrorWarningContext`, `ValidationContext`, etc.), `createTypeContext` |
| Stores | 3 | `StoryQuestionOption`, `MgmtTrigger`, `ClassificationOption` |

**Assessment:** Most dead exports fall into two categories:
1. **Infrastructure built for future features** — placeholders, escalation presets, content templates. These are documented as "planned" in `progress.md`.
2. **Interfaces exported for external consumption that never materialized** — context types in `event.ts`, `ExtractedItem`.

**Recommendation (MEDIUM):** Mark future-feature exports with `/** @planned */` JSDoc tag. Remove truly dead ones (context types, `ExtractedItem`, `StoryAnalysisResult`). This audit's count becomes the baseline — track dead export count over time.

---

## 7. Error Handling — 44 Catch Blocks

| Category | Count | Assessment |
|---|---|---|
| **Proper** — sets error state, shows UI | 22 (50%) | ✅ Good coverage for user-facing flows |
| **Console-only** — logs but no UI | 12 (27%) | ⚠️ Errors invisible to user |
| **Silent** — empty or comment-only | 10 (23%) | Mostly intentional guards |

**Console-only catches by location:**

| File | Count | What's swallowed |
|---|---|---|
| `useReviewPhase.ts` | 4 | Escalation generation failures, step regeneration failures |
| `eventStoryStore.ts` | 2 | Extraction retry failures, analysis errors |
| `storyTextGenerator.ts` | 2 | Channel text generation failures |
| `storyAnalyzer.ts` | 2 | Analysis prompt failures |
| Other | 2 | Misc |

The `useReviewPhase` catches are the most concerning — a user triggering escalation step generation would see no feedback if it fails silently.

**Silent catches (10):**
- 7× localStorage access guards — **intentional**, correct pattern for SSR/privacy mode
- 2× JSON.parse guards on corrupted state — **intentional**
- 1× storyExtractor — swallowed parse error after all repair stages failed

**Recommendation (MEDIUM):** For the 12 console-only catches, add `error.value = ...` or emit a user-visible notification. Prioritize `useReviewPhase` (4 catches) and `storyTextGenerator` (2 catches) — these are user-initiated actions where silent failure is confusing.

---

## 8. Test Coverage

### Coverage by layer

| Layer | Files | Tested | Coverage |
|---|---|---|---|
| Data (`src/data/`) | 7 | 3 | **43%** |
| Services (`src/services/`) | 17 | 3 | **18%** |
| Stores (`src/stores/`) | 10 | 1 | **10%** |
| Composables | 2 | 0 | **0%** |
| Components | 54 | 0 | **0%** |
| Types | 7 | 0 | N/A (type-only) |
| **Total** | 53 testable | 8 | **15%** |

### What's tested well

| Suite | Tests | Quality |
|---|---|---|
| `jsonRepair.test.ts` | 50+ | Excellent — real LLM outputs, every repair stage |
| `story-classification.test.ts` | 26 | Good — all severity/channel paths |
| `storyExtractor.test.ts` | 23 | Good — extraction pipeline + error handling |
| `classificationStore.test.ts` | ~30 | Comprehensive — tree walking, narrative |
| `classificationNarrativeBuilder.test.ts` | ~15 | Good — W-heading format |
| `classifyFromMetadata.test.ts` | ~15 | Good — deterministic rules |
| `classification-questions.test.ts` | ~10 | Good — condition functions |
| Pipeline eval (`pipeline-eval-v2.mjs`) | 12 scenarios | Integration — IPS scoring |

### Critical gaps

| Untested file | LOC | Risk | Why it matters |
|---|---|---|---|
| `eventStoryStore.ts` | 610 | 🔴 HIGH | Core business logic, 14 importers, about to be restructured |
| `textGenerator.ts` / `storyTextGenerator.ts` | ~300 | 🟡 MEDIUM | Prompt construction determines output quality |
| `useReviewPhase.ts` | ~200 | 🟡 MEDIUM | Orchestrates Phase 3 escalation flow |
| `responseParser.ts` | ~150 | 🟡 MEDIUM | Parses all LLM responses — partially covered via extractor tests |

**Recommendation (HIGH):** Before Phase 1 restructuring, add tests for `eventStoryStore`. The restructuring changes Phase 1 (classification), which feeds into Phase 2 (story interview). Without store tests, Phase 2 regressions will be invisible.

---

## 9. Hardcoded Values

### URLs and endpoints

| Value | Occurrences | Location |
|---|---|---|
| `http://localhost:1234/v1` | 4 | `settingsStore.ts` default + i18n help text (3×) |
| `https://llm-server.llmhub.t-systems.net/v2` | 3 | `settingsStore.ts` default + i18n help text (2×) |
| `https://api.anthropic.com/v1/messages` | 1 | `anthropicProvider.ts` (hardcoded, not configurable) |

The Anthropic URL is the only one that's not configurable via settings. The i18n help text duplicates URLs that should reference the settings defaults.

### Temperature policy

| Provider | Temperature | Documented? |
|---|---|---|
| LM Studio | 0.7 | No |
| Anthropic | 0.3 | No |
| LLM Hub | 0.3 | No |
| Connection Test | 0.3 | No |

The 0.7/0.3 split means local development produces different outputs than production. If intentional (compensating for smaller model), it should be documented. If accidental, it's a consistency bug.

---

## 10. Cleanup Performed During Audit

| Change | File | Description |
|---|---|---|
| Removed dead export | `src/data/story-questions.ts` | Deleted deprecated `storyQuestions` constant (zero imports) |
| Fixed Figma mismatch | `src/components/event-story/ClassificationTile.vue` | Tag font-weight: `700` → `655` (TeleNeo Var Bold axis) |

---

## 11. Priority Recommendations

### 🔴 High Priority (before Phase 1 restructuring)

| # | Action | Impact | Effort |
|---|---|---|---|
| 1 | **Split `eventStoryStore.ts`** into 3 focused composables | Reduces 57-item API to ~15 per composable, enables independent testing | ~4h |
| 2 | **Add `eventStoryStore` tests** | Prevents Phase 2/3 regression during restructuring | ~3h |
| 3 | **Extract `CHANNEL_METADATA` constant** | Eliminates hardcoded `120`/`200` in prompts, single source of truth | ~1h |

### 🟡 Medium Priority (during or after Phase 1)

| # | Action | Impact | Effort |
|---|---|---|---|
| 4 | **Surface console-only errors to UI** | 12 catch blocks gain user feedback (focus: `useReviewPhase`, `storyTextGenerator`) | ~2h |
| 5 | **Replace `as` casts with runtime validation** | 6 casts in `story-classification.ts` become safe at the classification boundary | ~1h |
| 6 | **Extract `maxTokens` constant** | 9 occurrences → 1 definition | ~30m |
| 7 | **Clean dead exports** | Remove 7 truly dead types, mark 24 planned-feature exports with `@planned` | ~1h |
| 8 | **Label registry in `FIELD_ALLOWED_VALUES`** | Links enum values to i18n keys, prevents sync drift | ~2h |

### 🟢 Low Priority (opportunistic)

| # | Action | Impact | Effort |
|---|---|---|---|
| 9 | **Extract duplicated `!important` CSS** | 10 identical declarations → 1 shared class | ~20m |
| 10 | **Document temperature policy** | Clarify 0.7 vs 0.3 across providers | ~15m |
| 11 | **Replace `any` with `unknown`** in model fetcher (4 usages) | Stricter type narrowing | ~20m |
| 12 | **Extract `StoryQuestion.vue` sub-concerns** | Hotkeys, freeform mapping, verification → composables | ~3h |
| 13 | **Standardize store reactivity** | Document ref vs reactive choice, enforce for new stores | ~30m |

---

## 12. Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                       Vue Components (54)                     │
│                                                               │
│  EventStoryView ─┬─ StoryQuestion    (Phase 1 classification) │
│     (420 LOC)    └─ StoryDialog      (Phase 2/3 interview)   │
│                                                               │
│  StoryPanel ─────── ClassificationTile, ReasoningTile         │
│     (319 LOC)       ProgressBar, Product Context toggle       │
│                                                               │
│  TextOutputView ─── ChannelCard × 4  (Phase 3 text gen)      │
│     (438 LOC)                                                 │
└───────────────────────────┬──────────────────────────────────┘
                            │ reads/writes
┌───────────────────────────▼──────────────────────────────────┐
│                     Stores (10)                               │
│                                                               │
│  classificationStore ──→ Phase 1 tree walking                 │
│     ▲ imported by eventStoryStore (cross-store dependency)    │
│                                                               │
│  eventStoryStore ──────→ Phase 2/3 interview + checklist      │
│     ⚠️ 610 LOC, 57 exports, 14 importers                     │
│     ├── useReviewPhase (extracted)                            │
│     └── usePersistence (extracted)                            │
│                                                               │
│  generationStore ──────→ Phase 3 text generation              │
│  settingsStore ────────→ LLM config, UI preferences           │
│  productContextStore ──→ Domain-specific documents            │
│  appStore ─────────────→ View switching, global state         │
│  + 4 smaller stores (chat, event, wizard, connections)        │
└───────────────────────────┬──────────────────────────────────┘
                            │ calls
┌───────────────────────────▼──────────────────────────────────┐
│                    Services (17 files)                         │
│                                                               │
│  llm/providerFactory ──→ Creates LLM providers (4 backends)  │
│  llm/storyExtractor ───→ Extracts structured data (472 LOC)  │
│  llm/textGenerator ────→ Generates channel text               │
│  llm/jsonRepair ───────→ 7-stage JSON repair (354 LOC, 50+t) │
│  classificationNarrativeBuilder → W-heading narrative         │
│  decisionTree ─────────→ Tree walker (Phase 1)                │
│  + 5 prompt builders, parsers, analyzers                      │
└───────────────────────────┬──────────────────────────────────┘
                            │ references
┌───────────────────────────▼──────────────────────────────────┐
│                    Data Layer (7 files)                        │
│                                                               │
│  story-questions.ts ──────→ Question defs + ChecklistPatch    │
│  story-classification.ts ─→ FIELD_ALLOWED_VALUES (SSOT)       │
│  classification-questions.ts → Phase 1 flat questions         │
│  decision-tree_*.json ────→ Phase 1 trees (to be replaced)   │
│  escalation-*.ts ─────────→ Presets + timing (planned)        │
│  placeholders.ts ─────────→ Template infrastructure (planned) │
└──────────────────────────────────────────────────────────────┘
```

### Data flow

```
User input → Phase 1 (classificationStore)
           → Phase 2 (eventStoryStore: interview → LLM extraction → checklist)
           → Classification (story-classification.ts: deterministic rules)
           → Phase 3 (generationStore → textGenerator → channel text)
           → Output (TextOutputView: 4 channel cards)
```

---

## Appendix: Raw Metrics

| Metric | Value |
|---|---|
| Total LOC (src/) | 21,367 |
| Total files (src/) | 119 |
| Components | 54 |
| Stores | 10 |
| Services | 17 |
| Test suites | 8 |
| Total tests | ~550 |
| `as` type assertions | 27 |
| `any` usages | 4 |
| `!important` declarations | 18 (10 duplicated) |
| Dead exports | 31 |
| Catch blocks | 44 (22 proper, 12 console-only, 10 silent) |
| Hardcoded `maxTokens` | 9 occurrences |
| Store-to-store imports | 2 (no cycles) |
| eventStoryStore API surface | 57 items |
| eventStoryStore importers | 14 files |

---

*Next steps: Address HIGH priority items (#1–#3) before beginning Phase 1 restructuring. Track dead export count and test coverage % as ongoing health metrics.*
