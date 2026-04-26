#!/usr/bin/env bash
# set-current-phase.sh — switch the active phase by copying the chosen phase
# doc into CURRENT_PHASE.md.
#
# Used in environments where symlinks aren't available (Windows without
# Developer Mode or admin shell). On macOS/Linux you can use `ln -sf`
# directly instead — both work; the file system result is the same from
# CLAUDE.md's perspective.
#
# Usage:
#   bash phases/set-current-phase.sh 5                       # by number
#   bash phases/set-current-phase.sh phase-5-save-flow-validation
#   bash phases/set-current-phase.sh                         # list options

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

if [ $# -eq 0 ]; then
  echo "Usage: bash phases/set-current-phase.sh <phase-number-or-name>"
  echo ""
  echo "Examples:"
  echo "  bash phases/set-current-phase.sh 1                       # phase-1-scaffolding.md"
  echo "  bash phases/set-current-phase.sh 5                       # phase-5-save-flow-validation.md"
  echo "  bash phases/set-current-phase.sh phase-3-backend         # exact name (without .md)"
  echo ""
  echo "Available phases:"
  ls phase-*-*.md 2>/dev/null | sed 's/^/  /'
  exit 1
fi

INPUT="$1"
TARGET=""

# Number → match phase-N-*.md
if [[ "$INPUT" =~ ^[0-9]+$ ]]; then
  TARGET=$(ls phase-${INPUT}-*.md 2>/dev/null | head -1 || true)
# phase-N-name → append .md if missing
elif [[ "$INPUT" == phase-* ]]; then
  if [ -f "$INPUT" ]; then
    TARGET="$INPUT"
  elif [ -f "${INPUT}.md" ]; then
    TARGET="${INPUT}.md"
  fi
# Anything else → try as literal filename
else
  [ -f "$INPUT" ] && TARGET="$INPUT"
fi

if [ -z "$TARGET" ] || [ ! -f "$TARGET" ]; then
  echo "Error: phase file not found for input '$INPUT'" >&2
  echo "" >&2
  echo "Available phases:" >&2
  ls phase-*-*.md 2>/dev/null | sed 's/^/  /' >&2
  exit 1
fi

cp "$TARGET" CURRENT_PHASE.md
echo "Active phase set to: $TARGET"
echo "  CURRENT_PHASE.md updated ($(wc -l < CURRENT_PHASE.md | tr -d ' ') lines)."
echo ""
echo "Next: open a new Claude Code session and say \"start Phase ${INPUT}\"."
