# Handoff — Gate 2 (Phase 4 visual re-check) for next session

> **TEMPORARY DOCUMENT.** Created 2026-05-04 to cross a session boundary
> while context was full. Delete this file after Gate 2 is recorded as
> PASSED in `PROJECT_STATE.md` Active Blockers and Phase 5 is unblocked.
> Everything load-bearing is already in `PROJECT_STATE.md`; this doc is
> just a fast-resume summary for the next session.

## TL;DR — where we are right now

**Phase 4 = code-complete + spec-patched + iOS-build-verified, NOT
visually-re-verified on Android.** One gate (iOS EAS build) passed,
one gate (Android visual re-check) blocked on local emulator GPU
infrastructure issue. Phase 5 is BLOCKED until Gate 2 closes.

```
Phase 4 implementation              ✅ committed (b9c9c26)
Path A spec patch (schema fix)      ✅ committed (0024a6c)
Verification Principles section     ✅ committed (0024a6c)
.gitignore + cleanup commits        ✅ committed (f41abb4, a427957)
Gate 1 — iOS EAS build              ✅ PASSED (build 2440cf78)
Gate 2 — Android visual re-check    🔴 BLOCKED on emulator GPU issue
```

## What Gate 2 needs

Run the **10-item visual check list** in `PROJECT_STATE.md` →
"Active blockers" → item 2. Record results per item slot. When all 10
are recorded (PASS or known-deviation), set Active Blockers back to
`(empty — Phase 5 ready to start)`, add `✅ Re-verified YYYY-MM-DD` to
the Phase 4 INVALIDATED box, bump top-of-file "Last updated" line, and
proceed to Phase 5.

The check list uses mock data from `src/dev/mock-places.ts` (11 places
in 강남/성수/신촌). App entry point is `App.tsx`; renderer is
`src/map/PersonalMap.tsx`.

## Why it's blocked — the actual diagnosis

The Android emulator on this Windows host has a GPU shader compatibility
problem with Mapbox's text-rendering shader specifically. Concrete
evidence captured this session:

```
E emuglGLESv2_enc: ... GL error 0x501  ← GL_INVALID_VALUE
W Mapbox: shader 'symbol_sdf_text...' '. Error: 'program failed to link'
W Mapbox: shader 'symbol_icon...' '. Error: 'program failed to link'
```

`emuglGLESv2_enc` = goldfish OpenGL passthrough = the emulator's GPU
emulation. It rejects the `gl_InstanceID` (instanced rendering) construct
in Mapbox's SDF text shader. Other shaders (`line`, `fill`, `circle`)
succeed via source-compilation fallback, so roads / parks / pins render
fine. Text labels do NOT render at all.

**This is NOT a Path A bug.** This is NOT a network bug. This is a
Windows-host emulator-GPU-emulation incompatibility with Mapbox's text
shader path. The Path A patches are confirmed correct via:

- `python -m json.tool` on both spec/style-{light,dark}.json passes
- All 20 layers structurally valid in both light + dark
- Source-layer renames (`transportation` → `road`) match
  mapbox-streets-v8 documented schema
- Roads + pins visibly render with cached tiles (proves the data path
  works post-patch)

## Three time-wasting rabbit holes — DO NOT re-enter

This session burned ~40 min on dead ends. The next session should NOT
re-investigate these:

1. **`ping` failures from emulator ≠ network broken.** Public WiFi often
   blocks ICMP but allows HTTPS. Proven by `NetworkMonitor PROBE_HTTPS
   https://www.google.com/generate_204` returning 204 in 160ms while
   `ping 8.8.8.8` showed 100% packet loss. Network IS working for app
   traffic. Skip ping diagnosis entirely; check actual HTTP probes.

2. **Restart-NetAdapter on Hyper-V vEthernet adapters does NOT help**
   the emulator. We tried it. Network state went from "100% loss" to
   "Network is unreachable" (worse). The emulator's QEMU NAT bridge is
   independent of the WSL/Hyper-V vSwitch.

3. **Cold Boot does NOT clear the emulator's tile_store cache.** Disk
   state persists across Cold Boot. If you want truly fresh Mapbox
   tile + glyph fetches, use AVD Manager → Wipe Data instead. (But
   for Gate 2 you DON'T need fresh fetches — the consumption check is
   visual, not network.)

## Three viable paths to close Gate 2

Pick whichever matches your environment when you next pick this up.
Listed in order of likelihood-to-succeed:

### Path 1 (most reliable) — Real Android phone via USB

Bypasses every emulator GPU/network issue. Real device GPU is fine
with Mapbox shaders.

```bash
# 1. Phone setup: enable Developer Options → USB Debugging.
# 2. Plug phone into Windows via USB.
# 3. Authorize the connection prompt on phone.
# 4. Verify:
adb devices                          # should list your phone, not "emulator-5554"

# 5. Install + launch the app on phone:
JAVA_HOME='C:\Program Files\Android\Android Studio\jbr' \
  PATH="C:\\Program Files\\Android\\Android Studio\\jbr\\bin:$PATH" \
  pnpm android

# Metro starts automatically. App installs on phone. Map renders with
# real GPU. Run the 10-item visual check list and record results.
```

### Path 2 — Different Windows host or another time

If Path 1 unavailable, try the same emulator on a host without
WSL2/Hyper-V interference (or try when host hasn't been through sleep
cycles that confuse virtual NICs).

### Path 3 — Emulator with software GPU + patience

This was attempted this session and got hung on a white screen — not
because software GPU doesn't work, but because we ran out of session
patience to wait for it to finish initializing. If you go this route,
expect 5-10 min for first render after boot.

```bash
# Kill any existing emulator + qemu first:
adb emu kill
tasklist //FI "IMAGENAME eq qemu-system-x86_64.exe" 2>&1 | grep qemu
# If still running: taskkill //PID <pid> //F

# Boot with software renderer:
"$LOCALAPPDATA/Android/Sdk/emulator/emulator.exe" -avd Pixel_7 \
  -gpu swiftshader_indirect -no-snapshot-load &

# Wait for boot (~1-2 min), then:
adb reverse tcp:8081 tcp:8081        # re-establish Metro forward
pnpm start --reset-cache             # if Metro not already running
adb shell am start -n com.gachi2026.mymap/.MainActivity

# WAIT 5-10 MIN for software GPU to render. Don't conclude it's broken
# from a white screen at 30s. Take screenshot at 5min mark.
```

## State of in-flight artifacts you might find

When you reopen the project, you may see leftover state from this
session that didn't get cleaned up:

- Emulator process (PID may differ): if `tasklist` shows
  `qemu-system-x86_64.exe`, it's a leftover. Kill before starting a
  new emulator session.
- Metro might still be running on port 8081 from this session. Check
  with `curl http://localhost:8081/status`. If alive, you can reuse
  it; if not, start fresh with `pnpm start --reset-cache`.
- `c:/dev/mymap-app/build/phase4-pathA-render*.png` — screenshots
  from this session showing render state at various points. Useful
  for comparison if you want to see what "labels-missing" state
  looked like vs. what success should look like (compare against
  yesterday's `build/phase4-render*.png` which has Korean labels
  rendered).
- `.claude/scheduled_tasks.lock` — Claude Code runtime artifact,
  gitignored, ignore.

## The 10 checks (recap from PROJECT_STATE.md)

Pre-flight (CRITICAL):
- [ ] App full kill + relaunch (not Metro hot reload — styleJSON cached)

Light mode #1-9, then dark mode toggle as #10:
- [ ] #1 Roads visible at z14+ (cream tones, multiple tiers)
- [ ] #2 Subway lines as single grey at z13+ (binary: 1+ visible)
- [ ] #3 Park polygon + park label both at z13+, label = Pretendard
      Regular in sage `#6B7561`
- [ ] #4 Subway station dot at z14+ (binary, 4 branches —
      none/clean/no-label/too-many-bus-noise determines next patch)
- [ ] #5 Subway station label in Korean (성수역 etc — bonus Phase 2
      Pretendard PBF Korean range validation)
- [ ] #6 Cluster bubble at z12-13 with count
- [ ] #7 Pin tap → console `[pin tap] <id>`
- [ ] #8 Cluster tap → console `[cluster tap] <id>`
- [ ] #9 Long-press over pin → console `[pin long-press] <id>`
- [ ] #10 Dark mode toggle without app restart ⭐

Console logs are visible either in the Metro terminal OR via
`adb logcat | grep ReactNativeJS`.

## Lessons that became permanent in PROJECT_STATE.md this session

These are already captured in the project; the next session should
USE them, not re-derive:

- **Verification Principles section** (top of PROJECT_STATE.md, after
  Environment & setup) — well-formedness vs consumption check
  distinction, with empirical Phase 2 + Phase 4 evidence. Future
  phase verification gates MUST include a consumption check unless
  exemption clause applies.
- **D11 spec ↔ mapbox-streets-v8 schema mismatch** cross-phase issue
  — Path A applied, two D11 deviations (single grey rail, no transfer
  differentiation) deferred to v1.5 / MapLibre+MapTiler migration
  with explicit guardrail.
- **D10 marker-shape deviations deferred to Phase 7** — anchors
  rendered as circles, visited as donut, both blocked on sprite
  pipeline expansion in Phase 7.
- **Mapbox MbxLogo as license compliance** (not cosmetic warning) —
  resolution required BEFORE Phase 10 / first TestFlight upload.
- **First EAS iOS Build hard gate** — closed this session
  (BUILD SUCCESSFUL build 2440cf78), recorded in PROJECT_STATE.md.

## Add to the lessons (only if it stays painful)

If the emulator GPU issue keeps biting across sessions, consider
promoting it from "this session's annoyance" to a permanent
cross-phase entry in PROJECT_STATE.md, framed similar to the
"`JAVA_HOME` setup gotcha" entry. Format would be roughly:

```
### Android emulator GPU shader failure on Windows host (cross-phase)

Mapbox's symbol_sdf_text shader fails to link via glProgramBinary
on the goldfish OpenGL emulation layer used by Android emulator on
this Windows host. Symptom: text labels (place names, station names)
do NOT render while other geometry does. Affects all visual
verification that depends on text. Workaround: use real Android
phone OR launch emulator with `-gpu swiftshader_indirect` and accept
~5-10x slower render.

Confirmed root cause:
  E emuglGLESv2_enc: GL error 0x501 (GL_INVALID_VALUE)
  W Mapbox: shader 'symbol_sdf_text...' program failed to link
  W Mapbox: shader 'symbol_icon...' program failed to link

This is permanent for this dev environment unless the emulator GPU
acceleration mode is changed at the AVD level (Edit AVD → Show
Advanced Settings → Graphics → "Software - GLES 2.0" preset).
```

Don't add this until you've hit it a second time in a future session
— a one-off might just be host state weirdness.

## When you finish Gate 2

1. Open `PROJECT_STATE.md` → Active Blockers → item 2 (Phase 4
   RE-verification). Fill in each result slot.
2. Update Phase 4 INVALIDATED box to add a "✅ Re-verified
   YYYY-MM-DD with all 10 checks PASS" line OR list known
   deviations with rationale.
3. Replace Active Blockers section content with `(empty — Phase 5
   ready to start)`.
4. Bump top-of-file "Last updated" line.
5. Commit. Suggested message:

   ```
   docs: close Gate 2 + unblock Phase 5

   - PROJECT_STATE.md: Phase 4 re-verification recorded (all 10
     visual checks PASS / deviations logged), Active Blockers
     cleared, Phase 5 unblocked
   - HANDOFF_GATE2.md: deleted (handoff complete)
   ```

6. **Delete this file** (`HANDOFF_GATE2.md`).
7. Switch active phase if not already done:
   `bash phases/set-current-phase.sh 5` (already done this session
   but verify).
8. Begin Phase 5.

---

End of handoff. Total session was: Phase 4 implementation → discovered
schema-mismatch defect via consumption check → Path A spec patch →
Verification Principles promotion → iOS EAS build success → Android
visual re-check blocked on emulator GPU → handed off via this doc.
