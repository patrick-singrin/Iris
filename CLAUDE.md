# Project Memory

## Quick Reference
- **Project:** [PROJECT_NAME]
- **Stack:** [PRIMARY_TECH_STACK]
- **Status:** [Active Development | Maintenance | Planning]

## Core Instructions
- On first response, briefly confirm memory bank status: project name, current focus from activeContext.md, and last update date
- Read memory bank files before starting any task: @memory-bank/
- After significant changes, update the memory bank when asked
- Ask clarifying questions before making architectural decisions
- Propose a plan before implementing multi-file changes
- Prefer small, incremental changes over large rewrites

## Project-Specific Rules
<!-- Add rules that are unique to THIS project -->
<!-- Examples: -->
<!-- - Use pnpm, not npm -->
<!-- - All API responses follow the envelope pattern { data, error, meta } -->
<!-- - Components go in src/components/{feature}/ -->

## Key Commands
- Build: `[BUILD_COMMAND]`
- Test: `[TEST_COMMAND]`
- Lint: `[LINT_COMMAND]`
- Dev: `[DEV_COMMAND]`

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
