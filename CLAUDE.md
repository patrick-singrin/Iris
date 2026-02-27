# Project Memory

## Quick Reference
- **Project:** Iris — Content Design Assistant
- **Stack:** Vue 3 + TypeScript + Vite, @telekom/scale-components, LM Studio (local LLM)
- **Status:** Active Development

## Core Instructions
- On first response, briefly confirm memory bank status: project name, current focus from activeContext.md, and last update date
- Read memory bank files before starting any task: @memory-bank/
- After significant changes, update the memory bank when asked
- Ask clarifying questions before making architectural decisions
- Propose a plan before implementing multi-file changes
- Prefer small, incremental changes over large rewrites

## Project-Specific Rules
- Use npm (not pnpm or yarn)
- Components go in `src/components/{feature}/`
- Stores use plain Vue `ref`/`reactive` — no Pinia/Vuex
- i18n keys use dot notation: `sq.cl.impactScope.confirm`
- All i18n changes must update both `src/i18n/en.ts` and `src/i18n/de.ts`
- LLM prompt changes should be validated with `node tests/pipeline-eval-v2.mjs` and results logged to `docs/pipeline-eval-results.md`
- Scale components are Web Components — prefix `scale-*`, excluded from Vite optimizeDeps
- Classification fields have strict allowed values in `src/data/story-classification.ts` — single source of truth
- Architectural decisions are logged in `docs/decisions.md` with rationale

## Key Commands
- Build: `npm run build` (vue-tsc + vite build)
- Test: `npm run test:run` (vitest single run)
- Test (watch): `npm run test`
- Dev: `npm run dev` (vite, port 5188)
- Pipeline eval: `node tests/pipeline-eval-v2.mjs` (requires LM Studio at localhost:1234)

## Memory Bank
@memory-bank/projectbrief.md
@memory-bank/systemPatterns.md
@memory-bank/techContext.md
@memory-bank/activeContext.md
@memory-bank/progress.md

## Available Skills
<!-- List skills installed in this project. Claude uses these as reference, not auto-loaded context. -->
<!-- Auto-activation happens via .claude/rules/ globs — these pointers help Claude find skills for manual/consult use. -->
- **Product Playbook** → `/Users/A200301419/Documents/skills/product-playbook/SKILL.md`
<!--   Auto-activates on UI work. Use for component creation, audits, refactors, and architecture decisions. -->
