# Pipeline Evaluation Results — Living Document

This document accumulates results from each `pipeline-eval-v2.mjs` run. Append a new entry after every evaluation to track pipeline quality over time.

---

## How to Add an Entry

After running `npm run eval:pipeline`, add a new row to the table below and copy the IPS score + dimension breakdown from the console output. Always note the model, temperature, and any changes made since the previous run.

---

## Results History

| # | Date | Run ID | Model | Temp | IPS | Grade | Parse | Extraction | Narrative | Classification | Text Gen | Notes |
|---|------|--------|-------|------|-----|-------|-------|------------|-----------|----------------|----------|-------|
| 1 | 2026-02-26 | (initial, pre-fix) | ministral-3-14b-reasoning | 0.3 | — | — | 100% | 83% | 88% | 100% | 83% | Initial run. 3 bugs found: resolveTypeKey plural, German overflow, severity calibration. IPS not yet implemented. |
| 2 | 2026-02-26 | 2026-02-26T19-09-57-559Z | ministral-3-14b-reasoning | 0.3 | 94.3 | A | 92% | 93% | 92% | 100% | 91% | Post-fix re-run. All 3 bugs fixed. Scenario 1 transient parse fail. German independent 55%. |

---

## Score Definitions

**IRIS Pipeline Score (IPS)** — weighted composite:

| Dimension | Weight | What It Measures |
|-----------|--------|------------------|
| Classification | 30% | Correct type + severity derivation |
| Extraction | 25% | Structured field extraction from freeform input |
| Text Generation | 25% | Bilingual UI text quality (rubric-based) |
| Narrative | 15% | W-heading narrative quality (rubric-based) |
| JSON Parse | 5% | Valid JSON from LLM response |

**Grade Scale:** A+ (>=95) | A (>=90) | A- (>=85) | B+ (>=80) | B (>=75) | B- (>=70) | C (>=60) | D (<60)

---

## Change Log Between Runs

### Run 1 -> Run 2 (2026-02-26)
- **Bug #1 fixed:** `resolveTypeKey()` singular/plural mismatch in `contentTemplates.ts`
- **Issue #2 mitigated:** German char limit prompt reinforcement in `promptBuilder.ts` + `storyTextGenerator.ts`
- **Issue #3 fixed:** User impact calibration examples added to extraction prompt in `storyExtractor.ts`
- **Eval script updated:** Added IPS composite score, industry benchmarks, Run ID, config constants, reproducibility docs

---

## Baseline Benchmarks (for context)

| Benchmark | What It Tests | Industry Score | IRIS Score |
|-----------|--------------|----------------|------------|
| StructEval (2025) | JSON generation (GPT-4o avg) | 76% | 92% |
| LLMStructBench (2026) | Field extraction (14B models) | 66-69% | 93% |
| ExtractBench (2026) | Complex multi-field extraction | 0-56% | N/A |
| RAG Prod. Threshold | Faithfulness (Pinecone/Patronus) | >85% | 92% |
| GPT-4 Invalid Rate | JSON validity (complex extraction) | ~88% | 92% |

*Caveat: IRIS is domain-specific with constrained fields — not directly comparable to general benchmarks.*

---

*This is a living document. Add a new row after every `npm run eval:pipeline` run.*
