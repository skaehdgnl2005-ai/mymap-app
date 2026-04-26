# Phases — Build Plan Overview

Phase-doc-as-stateless-memory pattern. Each phase doc is self-contained
context for a fresh Claude Code session. The file system is the AI's
hippocampus across sessions.

## How this works

1. CLAUDE.md auto-loads at every Claude Code session start.
2. CLAUDE.md `@-imports` `DESIGN.md`, `PROJECT_STATE.md`, and
   `phases/CURRENT_PHASE.md` (a symlink to the active phase doc).
3. To start a phase: `ln -sf phase-N-name.md phases/CURRENT_PHASE.md`,
   open a new Claude Code session, say "start Phase N."
4. AI follows the workflow defined in CLAUDE.md.

For non-Claude-Code tools (ChatGPT, web Claude.ai, Cursor without
.cursorrules), see `KICKOFF_TEMPLATE.md`.

## Phase sequence + dependencies

```
Phase 0 (Spec design)          ─── DONE ✓
                                │
                                ▼
Phase 1 (Scaffolding)          ─── Foundation for everything
                                │
                ┌───────────────┴───────────────┐
                ▼                               ▼
Phase 2 (Asset hosting)         Phase 3 (Backend foundation)
                │                               │
                └───────────────┬───────────────┘
                                ▼
Phase 4 (Map renderer)         ─── First visible map
                                │
                                ▼
Phase 5 (Save-flow MVP)        ─── ⚠️  VALIDATION GATE
                                │       Test with friend before continuing
                                ▼
Phase 6 (Onboarding + auth)
                                │
                                ▼
Phase 7 (Pin interactions)
                                │
                                ▼
Phase 8 (Pin detail popover)
                                │
                                ▼
Phase 9 (Search overlay)
                                │
                                ▼
Phase 10 (Polish + beta)       ─── TestFlight ready
```

## Phase summary table

| # | Phase | Days | Detail level | Critical gate? |
|---|---|---|---|---|
| 1 | Project scaffolding | 2-3 | **Full** | — |
| 2 | Asset hosting | 1-2 | Medium | — |
| 3 | Backend foundation | 3-5 | Medium | — |
| 4 | Map renderer integration | 3-4 | Medium | — |
| 5 | Save-flow MVP | 5-7 | **Full** | **YES** |
| 6 | Onboarding + auth | 3-4 | Medium | — |
| 7 | Pin interactions + states | 3-4 | Medium | — |
| 8 | Pin detail popover | 3-4 | Medium | — |
| 9 | Search overlay | 3-4 | Medium | — |
| 10 | Polish + beta | 5-7 | Medium | — |

**Total: ~32-44 working days** for a single full-time developer.
~6-9 calendar weeks accounting for App Store review, beta tester
recruitment, and the friend's schedule for Phase 5 validation.

## Why Phase 1 and Phase 5 are full-detail

**Phase 1 (scaffolding)** has known footguns specific to RN + Expo +
@rnmapbox/maps + Kakao SDK + pnpm integration:
- pnpm hoist behavior breaks Expo's autolinking unless `.npmrc`
  configured correctly
- @rnmapbox/maps requires native config (iOS pods, Android Gradle)
- Kakao SDK Android signing is a separate setup
- Corepack-managed pnpm version pinning prevents sneaky version drift

These are cheap to specify upfront, expensive to discover at execution
time. Full-detail phase doc is the prophylactic.

**Phase 5 (save-flow MVP)** is the validation gate. Its quality
determines whether the rest of the project happens. An underspecified
Phase 5 produces an underspecified prototype, which produces ambiguous
validation results — *"did the friend not save 3 places because the
product is wrong, or because my share-extension implementation was
buggy?"* — and we lose the entire diagnostic value of the gate.

## Why other phases are medium-detail

Phases 2, 3, 4, 6-10 have goal + tasks + DOD locked, but
implementation specifics deferred to in-session expansion when reaching
each phase. Reasoning:

1. Doesn't over-invest in phases that may need rewriting after Phase 5
   validation invalidates assumptions
2. Specific library choices (e.g., bottom-sheet implementation, image
   caching, sync strategy) benefit from being chosen near the moment of
   execution rather than 2 months earlier
3. Each phase doc still has enough for a fresh AI session to start
   productively; AI fills implementation specifics in-session under
   user direction

When you reach a medium-detail phase: ask the AI to expand it to full
detail before starting. Add the expansion to the phase doc itself, then
proceed.

## Phase doc structure

Every phase doc has these sections in order:

```
# Phase N: {Name}
## Project context (1 paragraph for the amnesiac AI)
## Locked decisions referenced (links to DESIGN.md sections)
## Prerequisites from previous phases (state checkpoint)
## This phase's goal (definition of done)
## Concrete tasks (numbered checklist)
## Verification (how to know it's done)
## Handoff (what to write into PROJECT_STATE.md)
```

Phase 1 and Phase 5 add sections for full-detail content (commands,
anti-patterns, validation protocol).

## Phase transition checklist

When ending a phase, the AI must:

1. Verify the phase's DOD (definition of done) is met. If not, do not
   close the phase — surface what's missing.
2. Update `PROJECT_STATE.md`:
   - Move the phase from "Pending" to "Completed"
   - Add completion date, decisions made, files created, issues
3. Append a handoff entry per `HANDOFF_TEMPLATE.md` (you can store
   handoffs in PROJECT_STATE.md inline or in a separate
   `handoffs/phase-N-handoff.md` — choose at Phase 1)
4. Note any cross-phase drift (locked decisions that conflict with
   what was found this phase) under "Cross-phase issues / drift" in
   PROJECT_STATE.md
5. Run `ln -sf phase-{N+1}-*.md phases/CURRENT_PHASE.md` to advance
   the active phase pointer (or instruct user to do so if AI lacks
   filesystem write access for symlinks)

## Resuming after a long gap

If you've stepped away from the project for >1 week:

1. Open Claude Code at the project root → CLAUDE.md auto-loads
2. Read PROJECT_STATE.md to see what's done
3. Read the active CURRENT_PHASE.md to see what's next
4. Glance at recent git log for any work-in-progress
5. Resume

The pattern is designed for this — file system memory survives whatever
gaps your calendar produces.
