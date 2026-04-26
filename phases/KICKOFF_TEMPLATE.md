# Phase Kickoff (manual paste version — for non-Claude-Code tools)

For Claude Code: this template is unused. CLAUDE.md auto-loads at
session start.

For other tools (ChatGPT, Cursor without .cursorrules, web Claude.ai):

1. Paste the contents of `CLAUDE.md` as the system prompt or first
   message.
2. Run: `ln -sf phase-N-name.md phases/CURRENT_PHASE.md` (set the
   active phase). On Windows: copy file instead, or run `mklink`.
3. Say: "Start Phase N."

The AI follows the workflow defined in CLAUDE.md.
