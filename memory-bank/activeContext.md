# Active Context

## Current Focus
Improving LLM pipeline quality with Product Context enabled. Evaluating extraction accuracy, narrative quality, and confirm label clarity.

## Recent Changes
- Added Product Context to pipeline eval script (`PRODUCT_CONTEXT` constant in `tests/pipeline-eval-v2.mjs`)
- Ran pipeline eval Runs 3-4 with product context — IPS 94.7-95.8 (A/A+), parse rate 67% (14B model limit)
- Fixed ambiguous confirm labels: "Is this the right scope?" → "Is this how widespread the impact is?", "Is this the right impact?" → "Is this how users are affected?" (EN + DE)
- Added `impact_scope` BAD/GOOD description example to extraction prompt to prevent conflation with `who_affected`

## Open Questions
- Production LLM provider selection (Anthropic vs other) — affects parse reliability
- Product Context RAG mode implementation (currently only local mode works)

## Blockers
- 4/12 eval scenarios fail JSON parsing with 14B local model when product context is enabled. Production LLM expected to resolve.

## Next Steps
- [ ] Test with a larger/production LLM to confirm parse regression resolves
- [ ] Implement RAG mode for Product Context
- [ ] Consider E2E tests (Playwright) for the question-answer-narrative flow

---
*Last updated: 2026-02-27*
