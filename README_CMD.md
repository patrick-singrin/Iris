# Claude Code Memory Bank

A lightweight, reusable memory management system for Claude Code projects.  
Adapted from the Cline Memory Bank methodology, optimized for Claude Code's native features.

## Philosophy

- **Lean over verbose** — every line consumes context window budget
- **Structure over personality** — memory is for coordination, not tone
- **Native-first** — builds on Claude Code's CLAUDE.md hierarchy, not against it
- **Docs on demand** — only load what's needed per session via `@references`

## File Structure

```
your-project/
├── CLAUDE.md                              ← Project instructions + @imports + skill pointers
├── memory-bank/
│   ├── projectbrief.md                    ← Vision, goals, scope (rarely changes)
│   ├── systemPatterns.md                  ← Architecture, conventions, decisions
│   ├── techContext.md                      ← Stack, dependencies, environment
│   ├── activeContext.md                    ← Current focus, recent changes, next steps
│   └── progress.md                        ← Completed / in progress / planned
├── .claude/
│   ├── commands/
│   │   ├── init-memory-bank.md            ← /init-memory-bank — auto-populate from codebase
│   │   └── workflow/
│   │       ├── understand.md              ← /workflow:understand — load context
│   │       ├── plan.md                    ← /workflow:plan [task] — create plan
│   │       ├── execute.md                 ← /workflow:execute — implement step by step
│   │       └── update-memory.md           ← /workflow:update-memory — sync memory bank
│   └── rules/
│       └── memory-bank.md                 ← Auto-loaded rules for memory file maintenance
└── docs/                                  ← Extended docs, referenced on demand via @docs/
```

## Setup

### 1. Per Project (copy into each project root)

```bash
# From this repo
cp -r CLAUDE.md memory-bank/ .claude/ /path/to/your/project/
```

Then run Claude Code in your project and use:
```
/init-memory-bank
```
Claude will analyze your codebase and populate the memory bank files.

### 2. Global (optional, goes in ~/.claude/)

```bash
cp GLOBAL_CLAUDE.md ~/.claude/CLAUDE.md
```

This sets cross-project behavior like planning before acting, concise communication, etc.

## Workflow

### Starting a session
```
/workflow:understand
```
Claude reads all memory bank files and gives you a status summary.

### Working on a task
```
/workflow:plan Add user authentication with OAuth2
```
Claude creates a step-by-step plan. Review and approve, then:
```
/workflow:execute
```

### End of session (or after milestones)
```
/workflow:update-memory
```
Claude syncs memory bank files with what actually happened.

## Tips from the Community

- **Keep CLAUDE.md under 80 lines.** Use `@memory-bank/` imports for details.
- **Don't duplicate README content.** Reference it instead: "See README.md for setup."
- **activeContext.md is your working memory.** Keep it fresh, prune regularly.
- **projectbrief.md should be stable.** If it changes often, your scope is unclear.
- **Use docs/ for big things.** Architecture diagrams, API specs, research — put them in `docs/` and reference with `@docs/filename.md` only when needed.
- **Review memory files periodically.** Outdated context is worse than no context.
- **Don't store generic advice.** "Write clean code" wastes tokens. Only include what's project-specific.
- **List skills in CLAUDE.md.** Auto-activation rules (`.claude/rules/`) fire on file globs, but Claude won't know a skill exists for consult/manual use unless CLAUDE.md mentions it.

## When NOT to Use This

- Tiny one-off scripts or experiments → CLAUDE.md alone is enough
- Projects where you're the only context → just use `docs/` and `@references`
- If you find yourself never running `/workflow:update-memory` → you don't need the structure

## Credits

Inspired by [Cline Memory Bank](https://docs.cline.bot/prompting/cline-memory-bank), adapted for Claude Code based on community best practices from Code Centre, Thomas Landgraf, Jose Parreño Garcia, hudrazine/claude-code-memory-bank, and russbeye/claude-memory-bank.
