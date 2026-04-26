# Phase 10: Polish + Beta

**Detail level:** Medium (expand at kickoff if you want full detail)
**Estimated duration:** 5-7 working days

## Project context

Final phase before TestFlight / Play Store internal testing track.
All features built. Now we (a) verify the app holds together at scale
+ edge cases, (b) prepare App Store metadata + privacy disclosures,
(c) recruit beta testers, (d) ship to TestFlight.

This phase is mostly NOT building — it's testing, fixing edge cases,
writing copy, and submitting. The bar isn't "perfect" — it's "the
named user (founder's friend) can use it for a week without the app
crashing or losing her data, and 3 other beta testers can install it
without help."

## Locked decisions referenced

- DESIGN.md § Distribution Plan: App Store + Play Store, EAS Build,
  TestFlight
- DESIGN.md § Success Criteria: 30+ users week 4 with ≥10 saved
  places each, no perf degradation at 50+ pins, screenshot
  recognizable as "MyMap"
- DESIGN.md § Open Questions Q3: branded display name (lock here)
- README.md § Migration checklist: deferred to post-PMF; not in scope

## Prerequisites from previous phases

- Phases 1-9 complete (or at least Phases 1-7 + decision to defer
  search overlay to v1.5; Phase 8 popover NOT optional — it's how
  users interact with their saved places)
- Phase 5 validation passed and confirmed

## This phase's goal

App is on TestFlight (iOS) and Play Console internal testing track
(Android), with:
- 3+ beta testers installed and actively using
- App Store + Play Store metadata complete (screenshots, description,
  privacy policy, age rating)
- Performance verified at 50+ saved pins (no jank, no FPS drops)
- Critical error states handled (offline, sync conflict, API failure,
  permission denied)
- Crash rate during internal testing < 1%

## Concrete tasks

### Performance + reliability

1. **Performance test at 50+ pins:**
   - Generate 50 mock pins across Seoul (simulating power user)
   - Measure FPS during pan/zoom (target: 60fps on iPhone 13+, 30fps
     min on iPhone 11)
   - Profile with Xcode Instruments / Android Profiler if FPS drops
   - Common culprits: ShapeSource updates not batched, image cache
     thrashing, animation worklets running on JS thread

2. **Performance test at 200+ pins** (cluster behavior):
   - At zoom 12-13, ensure clustering keeps render cost flat
   - Verify cluster bubbles render correctly at high pin density

3. **Offline mode:**
   - App should open and show last-synced pins offline
   - Save flow should queue saves and sync when online
   - Use AsyncStorage or MMKV for offline queue
   - Show toast "오프라인 — 저장하면 인터넷 연결 시 동기화됩니다"

4. **Sync conflict handling:**
   - Two devices edit same pin (unlikely but possible) — last write
     wins or merge?
   - For v1: last write wins (simplest); document decision

5. **Error states:**
   - Kakao API rate limit hit (429): show toast, retry exponential
     backoff
   - Mapbox tile load failure: show "지도를 불러올 수 없어요" with retry
   - Supabase auth expired: silent refresh; if refresh fails, prompt
     re-login
   - OG fetch timeout: gracefully degrade to bare URL

6. **Permission denied flows:**
   - Location: toast + settings deep-link (already in Phase 6)
   - Camera (if used in v1.5): same pattern
   - Photo library (if used in v1.5): same pattern

### App Store / Play Store preparation

7. **Decide branded display name** (DESIGN.md § Open Q3 lock here).
   Goes in app.json `expo.name` and surfaces in iOS share menu +
   Android intent picker.

8. **App Store screenshots** (required: 6.7", 6.5", 5.5" iPhone +
   12.9" iPad if iPad supported):
   - Map with HOME + 5 saved pins (Seoul-recognizable)
   - Save flow modal (Naver Place auto-resolve)
   - Pin detail popover (with OG card)
   - Color filter activated
   - Use Korean text in screenshots

9. **App Store description** (Korean primary, English secondary):
   - Headline: ~30 chars
   - Subtitle: ~30 chars
   - Description: ~4000 chars max but ~500 chars effective
   - Keywords: ~100 chars
   - All in Korean per primary market

10. **Privacy policy + Terms of Service:**
    - Required for App Store submission
    - Korean PIPA compliance (개인정보처리방침)
    - GDPR mentions (data subject rights)
    - Disclose: location data (only when My Location used), saved
      places (user data, owned by user, exportable in v1.5)
    - Host on a static page (Notion, Cloudflare Pages, GitHub Pages)
    - URL goes in app.json + App Store Connect

11. **App Store privacy disclosures** (Apple's "Nutrition Label"):
    - Location: collected, used for app functionality, NOT linked
      to identity
    - User content (saved places): collected, linked to identity,
      used for app functionality
    - Identifiers (user_id from auth): collected, linked to identity,
      used for analytics (if any) + app functionality
    - Be conservative — over-disclose rather than under-disclose

12. **Age rating:** 4+ (no objectionable content) unless KakaoTalk
    login surfaces age-gated content (then 12+).

13. **App icon:** 1024×1024 PNG, no transparency. Brand_indigo
    background with white M (or your chosen mark). 9 copies for
    Android adaptive icon (foreground + background).

### Beta testing

14. **Build for TestFlight via EAS:**
    ```bash
    eas build --platform ios --profile preview
    eas submit --platform ios
    ```

15. **Build for Play Console internal testing via EAS:**
    ```bash
    eas build --platform android --profile preview
    eas submit --platform android --track internal
    ```

16. **Recruit beta testers:** the named user (validation friend) +
    2-3 others matching demographic (Korean Gen Z, Instagram-cafe-
    screenshot habit). Send TestFlight invite + Play internal test
    link.

17. **Set up basic analytics** (optional in v1):
    - Sentry for crash reporting (highly recommended)
    - Mixpanel or PostHog for funnel analytics (save flow completion
      rate, time to first save, etc.) — optional
    - NO third-party SDKs that aren't disclosed in privacy policy

18. **Collect beta feedback** for one week:
    - Daily check-in messages with each tester
    - Track crashes via Sentry
    - Track bugs / UX issues in a simple tracker (Notion / GitHub
      Issues)

19. **Critical-bug fixes:** address P0 (crashes, data loss, login
    broken) bugs immediately. Defer P1 (annoying but workable) to
    v1.1.

## Verification

- [ ] App builds for iOS + Android via EAS without errors
- [ ] TestFlight invite accessible
- [ ] Play internal test track has APK uploaded + ≥3 testers added
- [ ] All testers installed successfully
- [ ] No P0 crashes in first 48 hours of beta
- [ ] Performance acceptable on 2 generations of devices each
      platform (target: iPhone 13 + iPhone 15 minimum, mid-range
      Android + flagship)
- [ ] Privacy policy + ToS published and linked
- [ ] App Store metadata complete and submitted for review
- [ ] Sentry crash reporting active (or alternative)

## Anti-patterns

- Do NOT submit to App Store before TestFlight beta (Apple wants to
  see user testing before public release)
- Do NOT skip privacy disclosures (rejection guarantee)
- Do NOT use placeholder screenshots / Lorem ipsum text in App Store
  metadata
- Do NOT add "TestFlight" or "beta" branding to the actual app
  (TestFlight builds are auto-marked by Apple; don't double-mark)
- Do NOT enable production analytics SDKs without privacy disclosure

## Handoff

When complete, update PROJECT_STATE.md with:
- TestFlight build number + URL (if shareable)
- Play Console internal test link
- Privacy policy + ToS URLs (locked)
- Branded display name (locked, DESIGN.md § Open Q3 resolved)
- Beta tester count + active percentage
- Sentry project URL
- Crash rate observed (target <1%)
- Any deferred features moved to v1.1 backlog

Then: project is at v1 beta. Next steps are NOT a phase — they're
operational:
- Monitor TestFlight feedback for 1-2 weeks
- Iterate on P1 bugs
- Submit to App Store + Play Store production when ready
- Begin v1.1 planning (data export, OG fetcher reliability,
  optional Korean NLP for Notes-paste import)

## Expansion hints

For full detail:
- EAS Build profile configuration (preview vs production, env vars,
  build credentials)
- App Store Connect step-by-step (Apple-specific gotchas: bundle ID,
  ATS exception for Mapbox HTTP fallback, iCloud capability)
- Privacy policy template adapted for Korean PIPA + GDPR
- TestFlight beta tester limits (10,000 max external testers, 100
  internal)
- Sentry React Native integration + source maps
- Common rejection reasons for map apps (location justification
  string in Info.plist, attribution placement)
