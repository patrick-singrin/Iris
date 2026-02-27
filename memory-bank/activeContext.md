# Active Context

## Current Focus
UI polish and documentation. Recently added Design Principles reference page, shared markdown rendering, and holistic analysis follow-up options.

## Recent Changes
- Built Design Principles page — renders `content-design-principles.md` with shared markdown utility, grey background + constrained-width card for optimal reading
- Extracted `renderMarkdown` to shared utility (`src/utils/renderMarkdown.ts`) and CSS (`src/styles/markdown.css`)
- Added holistic analysis follow-up options — structured radio/checkbox instead of freeform-only
- Added file-based Product Context — upload `.md` files, stored in localStorage, list with delete
- Added document preview modal — scale-modal showing formatted markdown preview
- Enhanced `renderMarkdown` with links, blockquotes, tables, strikethrough, images, task lists
- Fixed Vue scoped CSS + `v-html` incompatibility with dual `<style>` block pattern

## Open Questions
- Production LLM provider selection (Anthropic vs other) — affects parse reliability
- Product Context RAG mode implementation (currently only local mode works)

## Blockers
- 4/12 eval scenarios fail JSON parsing with 14B local model when product context is enabled. Production LLM expected to resolve.

## Next Steps
- [ ] Test with a larger/production LLM to confirm parse regression resolves
- [ ] Implement RAG mode for Product Context
- [ ] Consider E2E tests (Playwright) for the question-answer-narrative flow
- [ ] Create project README.md

---
*Last updated: 2026-02-27*
