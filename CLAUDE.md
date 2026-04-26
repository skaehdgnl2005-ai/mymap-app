# CLAUDE.md

Korean Gen-20 personal curated map app (codename TBD). Solo project,
design-led: locked decisions live in DESIGN.md and must not be re-litigated.

Stack: RN + Expo, TypeScript strict, @rnmapbox/maps (Mapbox v1 tiles),
Kakao Local API, Supabase, pnpm.

## Always-loaded context

@DESIGN.md @PROJECT_STATE.md @phases/CURRENT_PHASE.md

`CURRENT_PHASE.md` is the active phase document. On macOS/Linux it is a
symlink; on Windows (without Developer Mode) it is a file copy. Behavior
from CLAUDE.md's perspective is identical — both resolve to the same
content via the `@-import` above.

Phase transition (use whichever matches your environment):

- macOS / Linux: `ln -sf phase-N-name.md phases/CURRENT_PHASE.md`
- Windows (Bash / Git Bash): `bash phases/set-current-phase.sh N`
- Windows (PowerShell): `.\phases\set-current-phase.ps1 N`

Do not edit CLAUDE.md.

## Locked principles (do not violate)

- Locked decisions are locked. If you find a problem with anything in
  DESIGN.md, surface it as an "open issue" in PROJECT_STATE.md and proceed
  with the locked version. Do NOT edit DESIGN.md without explicit approval.
- Self-host all runtime assets. Sprites, fonts, tile fallbacks live on
  R2 / Supabase Storage. No `mapbox://` or Mapbox-hosted URLs in
  production code.
- Korean labels everywhere. Every symbol layer text-field uses
  `["coalesce", ["get", "name:ko"], ["get", "name"]]`.
- Brand indigo (#2D2A6B / #6B68C8) is reserved. User pins + primary CTAs
  only. Never on labels, never on the base map.
- Pretendard only. Regular / Medium / Bold weights. No other fonts.
- New dependencies require a log entry. Add to PROJECT_STATE.md →
  "Mid-phase decisions" with a one-line reason before installing.
- Ambiguity → ask. Do not guess intent on locked specs.

## Files requiring explicit user approval to modify

These are decision artifacts, not code. Do not edit them without approval:

- `DESIGN.md`
- `spec/style-light.json`, `spec/style-dark.json` (D8/D11 outputs)
- `spec/tokens.json` (design token single source of truth)
- `phases/KICKOFF_TEMPLATE.md`, `phases/HANDOFF_TEMPLATE.md`
- `CLAUDE.md` (this file)

## Commands

```bash
pnpm install
pnpm start              # expo start
pnpm ios                # expo run:ios
pnpm android            # expo run:android
pnpm typecheck          # tsc --noEmit
pnpm lint               # eslint
pnpm test               # jest (if present)
```

Run `pnpm typecheck && pnpm lint` after any non-trivial code change.
Prefer single-file test runs over the full suite.

## Workflow

On "start Phase N":

1. Confirm DESIGN.md, PROJECT_STATE.md, and CURRENT_PHASE.md are loaded.
   Restate the phase goal in one sentence as a sanity check.
2. Begin work.

On phase end:

1. Update PROJECT_STATE.md per its existing schema (do not change the schema).
2. Append a handoff entry per `phases/HANDOFF_TEMPLATE.md`.
3. Note any cross-phase drift detected.

On locked-decision conflict:

- Do NOT auto-edit `DESIGN.md` or `spec/`.
- File an "open issue" in PROJECT_STATE.md and continue with the locked
  version until approval.

## Reference docs (read on demand)

- `spec/data-shapes.ts` — Supabase schema. Read when: touching DB queries,
  migrations, or types crossing the API boundary.
- `spec/style-light.json` / `spec/style-dark.json` — map Style JSON. Read
  when: modifying map appearance, layers, or symbol fields.
- `spec/tokens.json` — design tokens. Read when: any color/spacing/
  typography decision in UI code.
- `phases/HANDOFF_TEMPLATE.md` — Read when: ending a phase.

## Notes

- Migration path post-PMF: MapLibre + MapTiler. Style JSON is preserved
  with this in mind — keep it portable.
- POI provider is Kakao Local API only. Naver is excluded (licensing —
  see DESIGN.md D4).
