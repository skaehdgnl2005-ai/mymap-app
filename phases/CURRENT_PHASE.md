# Phase 1: Project Scaffolding

**Detail level:** Full
**Estimated duration:** 2-3 working days

## Project context

This is the foundation phase for a Korean Gen-20 personal-curated-map app
(a Toss-style minimal map where users save places they discover on
Instagram). The full design spec is in `DESIGN.md`. The map style is in
`spec/`. The render integration reference is in `spec/implementation.tsx`.

You are starting from spec-only state — no code yet. This phase scaffolds
the React Native + Expo project, installs dependencies (`@rnmapbox/maps`,
Kakao SDK, Supabase client), configures the dev tooling (TypeScript strict,
ESLint, Prettier, pnpm via Corepack), and prepares the project to begin
building features in Phase 2+.

There are several known footguns with this stack — RN + Expo + pnpm +
@rnmapbox/maps native config + Kakao SDK signing — that are cheap to
specify upfront and expensive to discover at execution time. This phase
doc spells each out.

## Locked decisions referenced

- DESIGN.md § D4 Rendering Stack: Mapbox runtime v1, MapLibre migration
  post-PMF
- DESIGN.md § D5 POI Provider: Kakao Local API (NOT Naver)
- DESIGN.md § Distribution Plan: iOS App Store + Google Play Store + EAS Build
- CLAUDE.md § Stack: RN + Expo, TypeScript strict, pnpm

## Prerequisites from previous phases

Phase 0 completed: spec is in `DESIGN.md` and `spec/`. No code yet.

Verify these exist before starting:
- `DESIGN.md`
- `CLAUDE.md`
- `PROJECT_STATE.md`
- `spec/style-light.json`, `spec/style-dark.json`, `spec/tokens.json`
- `spec/data-shapes.ts`, `spec/implementation.tsx`
- `sprites/*.svg` (9 files)
- `phases/` directory with all phase docs

## This phase's goal

A fresh Expo + TypeScript project that:

- Boots successfully on iOS Simulator and Android Emulator
- Has @rnmapbox/maps installed and natively linked
- Has Kakao SDK installed and natively linked (or stub'd if Phase 6 deferred)
- Has Supabase client installed
- TypeScript strict mode passes
- ESLint + Prettier configured and pass on a clean repo
- Git initialized with `.gitignore` excluding `node_modules`, `.env`,
  build artifacts
- `phases/CURRENT_PHASE.md` symlink active and pointing at this file

The project at the end of Phase 1 renders a default Mapbox map (any style,
any location) when launched. Custom style + sprite integration happens in
Phase 4. Backend integration happens in Phase 3. **No business logic
yet.**

## Concrete tasks

### 1. Environment requirements (verify first)

```bash
node --version          # require: v20.x LTS (use nvm/fnm if not)
git --version
xcode-select -p         # macOS only; require Xcode 16+
adb --version           # require Android Studio Platform-Tools 34+
brew list watchman      # require watchman; install: brew install watchman
docker --version        # required for Phase 3 (Supabase local)
```

If any are missing or wrong version, install before continuing. Do NOT
proceed with mismatched versions — RN's native build will fail in
opaque ways.

### 2. Set up Corepack-managed pnpm

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm --version          # verify
```

Why Corepack: pins pnpm version per-project via the `packageManager`
field in `package.json`. Prevents version drift across team members or
CI environments.

### 3. Initialize Expo project

```bash
# In the parent directory of `테스트/`:
pnpm create expo-app@latest mymap-app --template blank-typescript

# Then move the existing spec files into the new project:
cd mymap-app
mv ../테스트/CLAUDE.md ../테스트/DESIGN.md ../테스트/PROJECT_STATE.md \
   ../테스트/README.md ./
mv ../테스트/spec ../테스트/sprites ../테스트/fonts ../테스트/phases ./
rmdir ../테스트
```

(Or: skip the rename and stay in the existing `테스트` directory by
running `pnpm create expo-app@latest .` — but the directory contains
existing files, so the create-expo-app may complain. The mv pattern
above is cleaner.)

### 4. Add `packageManager` field to package.json

```bash
pnpm pkg set packageManager="pnpm@9.x"
```

Replace `9.x` with the major version of pnpm Corepack just activated
(check `pnpm --version`).

### 5. Create `.npmrc` with required hoist patterns

```bash
cat > .npmrc <<'EOF'
node-linker=hoisted
public-hoist-pattern[]=*expo*
public-hoist-pattern[]=*react-native*
public-hoist-pattern[]=@react-native*
auto-install-peers=true
strict-peer-dependencies=false
EOF
```

**Why each line:**
- `node-linker=hoisted` — pnpm uses content-addressed storage by default,
  which breaks RN's Metro bundler's module resolution. Hoisted mode
  emulates npm/yarn's flat node_modules.
- `public-hoist-pattern[]=*expo*` — Expo's autolinking expects packages
  hoisted to the top level. Without this, `expo-modules-autolinking`
  fails to find packages.
- `public-hoist-pattern[]=*react-native*` — same for RN's autolinking.
- `auto-install-peers=true` — RN ecosystem has lots of peer-deps.
- `strict-peer-dependencies=false` — RN ecosystem version-pinning is
  perpetually slightly broken; strict mode causes spurious failures.

These are non-optional. The first time you `pnpm install` without
`.npmrc`, you'll spend hours debugging "Module not found" errors.

### 6. Install RN/Expo runtime dependencies

```bash
# Map renderer
pnpm add @rnmapbox/maps

# Backend
pnpm add @supabase/supabase-js

# Kakao SDK (Korean auth + share — stub if deferring auth)
# Pick ONE:
pnpm add @react-native-seoul/kakao-login    # most popular, MIT
# OR — if deferring Korean auth to v1.5:
# (skip — install in Phase 6 when needed)

# Async storage (for auth tokens, hint card dismissed flag, etc)
pnpm add @react-native-async-storage/async-storage

# URL parsing for save flow
pnpm add expo-linking
pnpm add expo-clipboard
pnpm add expo-share-intent              # share-extension wrapper

# Appearance (dark mode listener)
# (built into RN, no install needed)

# Image caching for OG previews (Phase 8)
pnpm add expo-image
```

**After every install:** verify `pnpm typecheck` still passes. If a
package brings in a peer-dep version conflict, resolve before continuing.

### 7. Configure native modules (iOS)

```bash
cd ios
pod install            # installs @rnmapbox/maps native pod
cd ..
```

If pod install fails on Apple Silicon Macs:
```bash
cd ios && arch -x86_64 pod install && cd ..
```

Add to `Podfile` (one-time):
```ruby
# At top of Podfile, after `platform :ios, ...`:
pre_install do |installer|
  $RNMapboxMaps.pre_install(installer)
end

post_install do |installer|
  $RNMapboxMaps.post_install(installer)
  # ... existing post_install hooks ...
end
```

This is per @rnmapbox/maps installation guide. Without it, the iOS
build fails with linker errors.

### 8. Configure native modules (Android)

In `android/build.gradle`, add the Mapbox token to the repository auth:

```gradle
allprojects {
    repositories {
        // ... existing repos ...
        maven {
            url 'https://api.mapbox.com/downloads/v2/releases/maven'
            authentication { basic(BasicAuthentication) }
            credentials {
                username = 'mapbox'
                password = project.properties['MAPBOX_DOWNLOADS_TOKEN'] ?: ''
            }
        }
    }
}
```

In `~/.gradle/gradle.properties` (NOT committed):
```
MAPBOX_DOWNLOADS_TOKEN=sk.eyJ1...
```

Get the token from `account.mapbox.com/access-tokens` → "Create a token"
→ check `Downloads:Read` scope. This is a *separate* token from the
public token used at runtime.

### 9. Set up environment variables

```bash
# Create .env (NOT committed)
cat > .env <<'EOF'
EXPO_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...    # public token, runtime
EXPO_PUBLIC_KAKAO_REST_API_KEY=...      # from developers.kakao.com
EXPO_PUBLIC_SUPABASE_URL=...            # filled in Phase 3
EXPO_PUBLIC_SUPABASE_ANON_KEY=...       # filled in Phase 3
EOF

# Add to .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo "ios/.xcode.env.local" >> .gitignore
```

Variables prefixed `EXPO_PUBLIC_` are inlined at build time — they're
visible in the bundle. Mapbox public tokens and Kakao REST API keys are
designed to be public; don't put server-only secrets there.

### 10. Configure TypeScript strict

Edit `tsconfig.json`:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

`noUncheckedIndexedAccess: true` is the most impactful — catches
"undefined sneaks through array access" at compile time.
`exactOptionalPropertyTypes: true` matches the strict-by-default style
of the schema in `spec/data-shapes.ts`.

Verify: `pnpm typecheck` passes (will pass for an empty Expo template).

### 11. Configure ESLint + Prettier

```bash
pnpm add -D eslint prettier eslint-config-expo eslint-plugin-prettier \
            @typescript-eslint/eslint-plugin @typescript-eslint/parser

cat > .eslintrc.json <<'EOF'
{
  "extends": ["expo", "prettier"],
  "plugins": ["prettier"],
  "rules": {
    "prettier/prettier": "error",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
    "react-hooks/exhaustive-deps": "warn"
  }
}
EOF

cat > .prettierrc <<'EOF'
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always",
  "endOfLine": "lf"
}
EOF
```

Add scripts to `package.json`:
```json
{
  "scripts": {
    "start": "expo start",
    "ios": "expo run:ios",
    "android": "expo run:android",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx",
    "format": "prettier --write ."
  }
}
```

Verify: `pnpm lint && pnpm typecheck` both pass.

### 12. Initialize git

```bash
git init
git add -A
git commit -m "chore: initial Phase 1 scaffolding"
```

### 13. Set up CURRENT_PHASE.md symlink

```bash
cd phases
ln -sf phase-1-scaffolding.md CURRENT_PHASE.md
ls -la CURRENT_PHASE.md         # verify it's a symlink
cd ..
```

**Windows compatibility caveat:** Windows requires Developer Mode
enabled (Settings → Update & Security → For Developers → Developer Mode)
or admin shell with `mklink` for symlinks. Alternative: copy the file
instead of symlinking, and update the copy at each phase transition. If
you're on Windows AND don't want Developer Mode, modify CLAUDE.md to
read `phases/CURRENT_PHASE.md` directly without symlinks, and rename
the file at each phase transition.

For macOS/Linux: symlinks work natively. No further config needed.

### 14. Verify the project boots

```bash
pnpm install            # full clean install one more time
pnpm typecheck
pnpm lint
pnpm ios                # launch iOS Simulator with default Expo screen
# Stop with Ctrl+C, then:
pnpm android            # launch Android Emulator with default Expo screen
```

Both must succeed. If either fails, fix before continuing — these
failures compound badly into Phase 2+.

## Verification

The phase is done when ALL of the following pass:

- [ ] `pnpm install` completes without errors
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm ios` launches and shows the default Expo screen on iOS Simulator
- [ ] `pnpm android` launches and shows the default Expo screen on Android Emulator
- [ ] `phases/CURRENT_PHASE.md` is a symlink (or copy on Windows) pointing
      at this file
- [ ] git log shows at least one commit; `.env` is in `.gitignore`
- [ ] @rnmapbox/maps is installed and the iOS pod is built

## Anti-patterns (do NOT do these)

- **Never run `npm install` or `yarn add`** — these corrupt the pnpm
  lockfile. If you need to switch package managers, delete
  `pnpm-lock.yaml` and `node_modules` first.
- **Never commit `node_modules/` or `.env`** — verify `.gitignore`
  before first commit.
- **Never run `pnpm expo prebuild --clean`** without explicit user
  approval — it wipes the `ios/` and `android/` folders, destroying any
  manual native config you've added.
- **Never put server-only secrets in `EXPO_PUBLIC_*` variables** — they
  ship in the JS bundle and are visible to anyone who decompiles your
  app.
- **Don't use Hermes engine config from older RN tutorials** — Expo SDK
  50+ enables Hermes by default; conflicting config breaks JSI.
- **Don't disable strict TypeScript** to make errors go away. Fix the
  errors. The schema in `spec/data-shapes.ts` is strict-friendly by
  design.

## Handoff

When complete, update `PROJECT_STATE.md`:

1. Move "Phase 1: Project scaffolding" from "Pending" to "Completed"
2. Add completion date, duration, files created (you'll have many — the
   full Expo project structure)
3. Note any deviations from this doc (e.g., if you skipped Kakao SDK
   install because Phase 6 isn't imminent)
4. Note exact pnpm version, Node version, Xcode version locked in
   (these matter for reproducibility)

Then advance the symlink:
```bash
ln -sf phase-2-assets.md phases/CURRENT_PHASE.md
```

Phase 2 (Asset hosting) is next. It's medium-detail; expand to full
detail at kickoff if you want before starting.
