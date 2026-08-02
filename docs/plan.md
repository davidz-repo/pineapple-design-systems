# `@pineappleui` — principles and port plan

This repo is the public home of the design system that grew inside a private product
monorepo. The port is incremental: packages move here in dependency order, and each one
arrives already publishable.

---

## Principles

These are written as rules a reviewer can apply to a diff without extra context. If a change
violates one, the review comment is the rule.

### 1. Presentational shells only

A package here takes **props in** and emits **callbacks out**. It must not:

- call `fetch`, or import an HTTP client
- import a provider SDK (auth, analytics, payments, feature flags)
- read from `window.location`, a router, or a global store
- know a product noun

If a component needs data, the consumer passes it. If a component needs to cause an effect,
it calls a prop. A `useEffect` that talks to anything outside the component's own DOM is the
signal that a package is drifting product-ward.

### 2. The split line is generic-vs-product-specific, not open-vs-secret

The question to ask is *"would a different product want this?"* — not *"is this
confidential?"*. `Badge` is generic and ships. `TrafficTag` encodes one product's status
vocabulary and does not, even though nothing about it is secret. Nothing here is excluded
for being sensitive; things are excluded for being *specific*.

### 3. React and Radix stay peers, and stay external

Every component package declares whatever the **consumer** supplies — React and React DOM in
every case, plus Radix Themes and anything else meant to be shared — in `peerDependencies`
**and** lists each one in `tsup.config.ts`'s `external`. The rule is general, and so is its
check: the guard reads what a package actually declares and imports, not a fixed list of
package names. Both halves are required: the peer declaration keeps npm from installing a
second copy into the consumer's tree, and `external` keeps the bundler from inlining one into
`dist/`. A duplicate React is a broken-hooks bug that surfaces far from its cause.

Workspace dependencies (`@pineappleui/tokens`, etc.) are also `external` for the same reason.

`scripts/check-peer-externals.mjs` enforces the lockstep: what `src/` uses at runtime must be
declared as a peer or a dependency, what is declared and imported must be in `external`, what is
external must still be a bare import in the built `dist/index.mjs`, and nothing may be imported
by `dist/` that no manifest field declares. JSX counts as a use of `react` even where no source
file names it, which is the case every Phase 2 wrapper is in. The first of the four is the one
that catches a real inlining: tsup externalises whatever the manifest declares, so it is a
*missing declaration* — not a short `external` array — that grows `dist/index.mjs` from 1 KB to
80 KB of bundled React. See §"Adding a workspace later" on why the missing half of a rule needs
a check rather than a reviewer.

All four assertions read JS/TS import syntax, so **CSS is invisible to them**: a package a
stylesheet pulls in with `@import` — `@pineappleui/theme` does this for
`@fontsource-variable/geist` — is a real runtime dependency of the consumer's bundle that none
of them would report. A **fifth** assertion covers it, added with the stylesheet that first
needed it: every bare specifier `@import`ed by a `.css` file under `src/` or in `dist/` must be
declared as a peer or a dependency, which is the CSS reading of the first assertion above.

It stops there deliberately, and each omission is a fact about how a stylesheet ships rather
than a gap. `external` is about what the JS bundler inlines, and the `copy` loader parses
nothing — there is nothing for a CSS `@import` to be external *to*. `dist/index.mjs` never
mentions a stylesheet's imports at all; what ships is the `.css` file, which is why the
assertion reads that. Reading `src/` **and** `dist/` is what catches the loader being dropped:
the copy stops happening while the source still looks right, and the count of stylesheets
scanned in the guard's pass line is what says so out loud rather than reporting a clean scan of
nothing.

### 4. ESM only

`"type": "module"`, `format: ['esm']`, output forced to `.mjs` via `outExtension` so that
`exports`/`main`/`module` describe exactly what is on disk. No CJS build. No dual-package
hazard to reason about.

### 5. Every publishable manifest carries `publishConfig.access: "public"` and `license`

npm defaults **scoped** packages to `restricted`. A missing `access` does not fail review, or
CI, or `changeset version` — it fails at the first `npm publish`, hours later. A missing
`license` renders as "proprietary" on the package page and trips consumers' license scanners.
`scripts/check-publish-contract.mjs` enforces both, along with `files`, `exports`, the
`dist/`-rooted entry points, `repository.directory`, and the actual tarball contents — including
that every path `main`, `module`, `types` and each leaf of `exports` names is *in* that tarball.
That last one is what a second entry point needs: `@pineappleui/theme`'s
`exports["./styles.css"]` is written by a tsup loader rather than by the JS build, so the day
that loader goes the package still publishes, still ships a non-empty `dist/`, and fails at the
consumer's `import '@pineappleui/theme/styles.css'`. It also enforces task coverage for **every**
workspace, publishable or private — see §8.

Private packages carry no `publishConfig` and stay at version `0.0.0`.

### 6. turbo is the only verification entry point

Every task in `turbo.json` declares `dependsOn: ["^build"]`. Packages resolve each other
through `exports → dist/`, so a task that runs without its dependencies rebuilt reads stale
build output and reports a **false green**.

Consequence for reviewers and for CI: never verify by running a package-local
`npm test` / `npm run typecheck`. Run `npm run verify` at the root, or `npx turbo run <task>`.
CI runs one unfiltered `npx turbo run build lint test typecheck` for the same reason.

### 7. The doubled `sourceMappingURL` is expected output

`treeshake: true` + `sourcemap: true` makes tsup emit two `//# sourceMappingURL=` comments in
`dist/index.mjs`. Harmless, inherited from the upstream config, and deliberately not tuned
away — a change to the tsup config to "fix" it is a change with no user-visible benefit.

---

## Port roadmap

Ordered by dependency, so each phase compiles against only what already exists.

### Phase 0 — tooling + tokens (landed)

| Package | Publishes | Notes |
|---|---|---|
| `@pineappleui/tsconfig` | no | `base.json`, `react-library.json` |
| `@pineappleui/eslint-config` | no | antfu wrapper; antfu's react peers are real deps here |
| `@pineappleui/vitest-preset` | no | React + jsdom factory; `jsdom` is a real dep here |
| `@pineappleui/tokens` | **yes** | pure data; no React, Radix or DOM |

`vitest-preset` intentionally has **no `test` script**: a bare `vitest run` exits 1 on "no
test files found".

Two dependency deltas from this phase are deliberate — see *Deltas from the source monorepo*
below.

### Phase 1 — no workspace dependencies (landed)

| Package | Publishes | Notes |
|---|---|---|
| `@pineappleui/use-local-storage` | **yes** | `react` peer; the one package that reads a browser global, by decision |
| `@pineappleui/live-region` | **yes** | `react` + `react-dom` peers; pure aria wrapper, no Radix |
| `@pineappleui/icons` | **yes** | `lucide-react` is a real dependency, and external to the bundle |

Each depends only on React, so they landed in one PR and in any order. Ported verbatim from the
source monorepo apart from the scope rename and de-branding of comments, test `describe` names
and descriptions.

`live-region` and `icons` ship a `*.stories.tsx`. The stories are typechecked (`include` covers
all of `src`) and linted, and since the gallery workspace landed they are also rendered — see
*The gallery workspace* below. `icons` carries `@ladle/react` as a devDependency for the
`Story` type its playground story imports; it declares it rather than resolving it through the
gallery's hoist, so the package typechecks on its own.

### Phase 2 — Radix wrappers (11 of 11 landed)

Landed: `box`, `stack`, `inline` — the layout wrappers — `text` and `heading`, the typography
pair, `badge`, `button`, `icon-button` and `card`, the actions and surfaces, and `text-field` and
`text-area`, the text inputs. Each is a `@radix-ui/themes` peer and nothing else. All eleven
declare `@ladle/react` as a devDependency, because each one's story imports the `Story` type;
`text`, `heading`, `badge`, `button`, `icon-button`, `text-field` and `text-area` additionally
declare `@pineappleui/tokens`, because their stories build an accent-colour control out of the real
list, and `icon-button` alone declares `@pineappleui/icons`, for the glyph its stories put inside
the button. All three are story-only and therefore dev-only. See *Deltas from the source monorepo*
below for each.

`text-field` is the one that is not a single element: Radix's `TextField` is a compound namespace
(`TextField.Root`, `TextField.Slot`), and the package re-exports it whole rather than wrapping a
part of it.

All eleven have the same shape. Copy `packages/live-region` as the template — it is already a
React package in the shape a Radix wrapper needs: `react` + `react-dom` peers (declared *and*
`external`), a `tsconfig.json` extending `@pineappleui/tsconfig/react-library.json`, a
`*.stories.tsx`, and a LICENSE and README in house form. The checklist collapses to one line:

- add `@radix-ui/themes` to `peerDependencies` and to `tsup.config.ts`'s `external`

Keep everything else — the four scripts, `files`, `exports`, `publishConfig`, `license`,
`repository.directory` — identical. Any story that imports the `Story` type also needs
`@ladle/react` as a devDependency, and any story offering an accent-colour control needs
`@pineappleui/tokens` as one; see *Deltas from the source monorepo* below for both.

Two things to do per package that no template can carry for you:

- **Read every ported test body, not its name.** Four of the eleven shipped an assertion that its
  own name did not describe, and each one was green. All four are recorded as standing deltas
  below — as is the fifth thing reading the bodies turned up, which is an absent ref test:
  `text-field` gains the one it never had, and `stack` and `inline` still have none.
- **Check each assertion against the Radix default it is asserting past.** A `size`, `direction`
  or `as` prop whose asserted value happens to equal the prop def's own `default` is an assertion
  the component cannot fail. `@radix-ui/themes`' prop defs are the reference:
  `node_modules/@radix-ui/themes/src/components/<name>.props.tsx`.

Do **not** copy `packages/tokens` for these: it extends `base.json` (tokens are pure data) and
declares no React, so it starts a React package two corrections behind live-region.

### The gallery workspace (landed)

`apps/gallery` — private, `0.0.0`, ESM — is the first workspace outside `packages/*`, and the
first surface in this repo that **renders** anything. Ladle globs
`packages/*/src/**/*.stories.{ts,tsx}`, which is 14 story files and 39 stories today: the 11
Phase 2 wrappers plus `icons`, `live-region` and `theme`. A new package's stories appear the
moment the file exists — there is no per-package registration to forget.

Four things it does that the upstream gallery does not, each of them repo law here:

1. **All four task slots are accounted for.** `build` is `node scripts/build.mjs`, `lint` is
   `eslint .`, `typecheck` is `tsc --noEmit`, and `test` is a declared opt-out. `build` earns its
   slot: it compiles every discovered story through the alias chain, so a story that stops
   compiling, an alias that stops resolving, or a decorator that breaks every story fails CI.
   Upstream defines `lint` only and calls the Ladle build `ladle:build`, which `turbo run build`
   skips silently — the exact shape §"Adding a workspace later" exists to prevent.
   `apps/gallery/turbo.json` declares this task's `build/**` outputs, next to the task that
   writes them, so the root config keeps saying `dist/**` and only the workspace that emits
   something else says so.

   **The wrapper is what makes that slot mean anything.** `ladle build` exits **0** on a failed
   build. @ladle/react 5.1.1 wraps vite's `build()` in a try/catch that logs the error and
   returns `false` (`lib/cli/vite-prod.js`), and `lib/cli/build.js` ignores that return value —
   so the process prints "✗ Build failed", writes a fresh `meta.json` listing every story it was
   asked to compile, prints its timing line and exits 0. `build/` is left holding the PREVIOUS
   bundle, because vite's `emptyOutDir` runs at write time and the write is never reached. Every
   failure this task exists to catch fails in exactly that shape, so before the wrapper the task
   reported green over a stale gallery. `apps/gallery/scripts/build.mjs` runs the same build and
   then checks four independent things — the exit code; the failure marker present or the success
   marker absent in the output; `build/index.html` not rewritten by this run, which is the one
   signal that does not depend on matching someone else's string, since vite does not write that
   file when the build fails; and `build/meta.json` parsing and listing at least one story. Any
   of them exits 1. Proved by breaking an import in a story: the task exits 1, and exits 0 again
   once it is restored. The story count deliberately stops at "more than zero" — comparing it
   against the story files on disk would be a second implementation of the glob
   `scripts/check-alias-fences.mjs` already owns.

   **That slot means something only because the gallery declares all 16 aliased packages as
   `*` devDependencies.** Turbo hashes a task's inputs from its own package directory, and the
   stories this build compiles live in `packages/*/src` — outside it. Nothing turbo can express
   reaches them: with no dependency edge, editing a story leaves the gallery build's hash
   unchanged, so a warm-cache CI run replays a green `build` that never compiled the edit. The
   stories *are* inputs to their own package's build, so the propagation comes from
   `dependsOn: ["^build"]` walking those edges — which is what the devDependencies exist to
   create. Two of them *are* imports — the gallery's own decorator imports `@pineappleui/theme`
   and `@pineappleui/tokens` — and the other fourteen are not, so they read as unused and would
   be tidied away by anyone trusting that reading; `scripts/check-alias-fences.mjs` is what makes
   removing one a failure rather than a cleanup.
2. **Workspace discovery is shared rather than copied.** Adding `apps/*` to the root
   `workspaces` is what `scripts/workspace-globs.mjs` was written to fail on, so extending it is
   the deliberate act it was designed to force. The discovery itself moved *into* that module
   (`listWorkspaceDirs()`), and `check-peer-externals` and `check-publish-contract` now call it
   instead of each filtering `packages/` keys of their own; `check-token-drift` joins
   `check-toolchain-hoist` in calling the assertion. `check-publish-contract` therefore counts
   the gallery among the workspaces it checks — **20** of them today, rather than the 19 that
   filtering `packages/` would leave — which is the whole point, since the one it could not see
   is the one that would have run zero tasks.
3. **The decorator mounts `@pineappleui/theme`'s providers and nothing else.** It imports
   `@pineappleui/theme/styles.css` — the only stylesheet in the file, since that one pulls in
   Radix's own — and wraps every story in `ThemePreferencesProvider` + `DesignSystemProvider`.
   It mounts no `<Theme>` of its own, deliberately: the package mounts one, and a Radix `<Theme>`
   nested inside another is legal and half-applies, so appearance and accent stop agreeing in
   ways that read as a theme bug rather than as two providers. What is left here is the two knobs
   Ladle exposes, wired to the package's preference state: an `AppearanceBridge` that copies
   Ladle's appearance toolbar (`globalState.theme`, a `Record<ThemeState, AppearanceSetting>`
   away from a preference — `Auto` maps to `system`, which `DesignSystemProvider` resolves
   against `matchMedia`) into `setAppearance`, and an accent picker reading and writing
   `useThemePreferences`. The picker spreads `ACCENT_COLORS` — never a hand-typed list, which
   `check-token-drift` enforces on this file like any other — and holds no state of its own, so
   the accent now persists across reloads because the package stores it.

   The bridge is the one place this file is not upstream's: upstream keeps `setAppearance` out of
   its effect's dependencies behind a ref, because the provider re-creates that function every
   render and an honest dependency list would loop. Here the effect depends on everything it
   reads and writes only when the toolbar and the preference disagree — which is what makes
   re-running it on every render harmless, and it settles after one write. Never disable
   `react-hooks/exhaustive-deps`; a dependency that "has to" be omitted is a restructure.
4. **Nothing product-specific comes across.** Upstream's gallery also globs the product app's
   screen stories and declares `react-router-dom` and `@radix-ui/react-icons` for them; none of
   that has anything to render here, so none of it is declared. This is principle 2 applied to a
   workspace instead of a package.

Point 3 was a **temporary** divergence until Phase 3, and it is now closed: the decorator held
Radix's `<Theme>` and a local `useState` only because `@pineappleui/theme` had not been ported.
It has, so this file converged on upstream's shape rather than diverging further, which is why
none of it was ever recorded as a delta — every entry in that list is a standing difference a
future sync must not revert, and this one would have told the next reader to keep something
written to be thrown away. The one line that outlived the swap is the accent default: it was
`ACCENT_COLORS[0]`, derived rather than hand-typed, and it is now the package's own
`DEFAULT_PREFERENCES` — the choice moved rather than being copied to a second place.

The dev-server port is stated once, in `.ladle/config.mjs` (`port: 6006`); the `ladle` script is
a bare `ladle serve`, because a `--port` flag on it would be a second copy of the same number.
Ports are allocated **per app**: the next `apps/*` workspace picks a distinct one. Two apps on
6006 collide the moment both are up, and concurrent worktrees make that ordinary — a worktree
isolates files, not ports.

Two remaining notes on the hand-maintained parts:

- The alias list is written out in **three** places — `resolve.alias` in `vite.config.ts` and
  `paths` in `tsconfig.json`, both inside `@pineappleui-aliases` marker fences matching
  upstream's shape, plus the `@pineappleui/*` devDependencies in `package.json` that give turbo
  its edges. Upstream generates the first two from a `sync-aliases.mjs`; that script is not
  ported, so the lists are maintained by hand — but the **drift** no longer passes silently.
  `scripts/check-alias-fences.mjs` asserts that the three name the same packages and that every
  `packages/*` directory owning a story file is among them, and it names the package and the
  three files when they disagree. Each of the three failed differently and quietly: no vite
  alias resolves a cross-package `@pineappleui/*` import to `dist/` — the last build — instead
  of `src/`; no tsconfig path checks that package's built `.d.ts` while vite bundles its source;
  no devDependency drops the turbo edge (point 1 above). Porting the generator is now a nicety
  rather than the thing standing between the repo and a wrong gallery.
- `eslint.config.mjs` names `build` in `ignores` explicitly. The repo-root `.gitignore` covers
  `apps/*/build/`, but ESLint reads a `.gitignore` relative to the workspace it is linting, where
  that pattern matches nothing — so without the explicit ignore, `eslint .` lints the bundle it
  just emitted and the lint result depends on whether a build ran first.

### Phase 3 — theme (landed)

| Package | Publishes | Notes |
|---|---|---|
| `@pineappleui/theme` | **yes** | the two providers, the stylesheet, and the first-paint snippet |

`theme` depends on `tokens` + `use-local-storage`, so it landed last. It is the first package
here with real runtime `dependencies` other than `icons`' Lucide: `@pineappleui/tokens` and
`@pineappleui/use-local-storage` (workspace, external to the bundle) and
`@fontsource-variable/geist` (pulled in by the stylesheet, not by any module). React, React DOM
and `@radix-ui/themes` are peers as everywhere else.

It ships CSS, which makes its build config the only one that differs:

- `loader: { '.css': 'copy' }` — ship the stylesheet verbatim, no CSS parsing or bundling
- `dts: { entry: 'src/index.ts' }` — without scoping, tsup tries to emit a `.d.ts` for the
  CSS entry and fails
- an extra `exports["./styles.css"]` entry, which `check-publish-contract` now checks is
  actually in the tarball (§5)
- `sideEffects: ["**/*.css"]` rather than `false`
- `@fontsource-variable/geist` as a real dependency, because the stylesheet `@import`s it and
  the consumer's bundler is what resolves that — the case principle 3's fifth assertion exists
  for

The gallery swapped over in the same PR, in `apps/gallery/.ladle/components.tsx`: the direct
`<Theme>` and `import '@radix-ui/themes/styles.css'` were **removed** rather than wrapped, the
local accent `useState` went away with them, and `@pineappleui/theme` joined the three alias
lists. See *The gallery workspace* above, point 3, for the shape it landed in.

The one thing that needed care beyond the swap: `@pineappleui/theme/styles.css` has to resolve
in the gallery, where the alias points at `src/`. The subpath alias key each package already
carries (`'@pineappleui/theme/'` → `packages/theme/src/`, ahead of the bare key) is what does
it, so the gallery loads the *source* stylesheet like it loads source components, `@import`s and
all. `tsc` says nothing about that: `vite/client`'s ambient `*.css` module matches any specifier
ending in `.css`, so a typo typechecks clean, and the gallery `build` is the only task that
would see it.

It would not have *failed*, though, which is the part this PR corrects rather than repeats:
`ladle build` prints the resolve error, writes a fresh `meta.json`, leaves the previous bundle in
`build/` and exits **0**. So the task this section relied on reported green. It fails now because
`apps/gallery/scripts/build.mjs` reads the build's output and its artifacts and exits 1 on either
— see *The gallery workspace* above, point 1.

### Deferred

`form` — needs a decision on how much validation behavior belongs in a presentational shell.

### Excluded

`traffic-tag` — product-specific status vocabulary. See principle 2.

---

## Deltas from the source monorepo

Everything else is ported verbatim. These eighteen differences are deliberate and should **not**
be "corrected" back — each one is a bug here if reverted, and each is invisible until it fails.

- **`eslint-config`** declares `@antfu/eslint-config`, `@eslint-react/eslint-plugin` and
  `eslint-plugin-react-refresh` as `dependencies`, not peers. antfu v8's react preset calls
  `ensurePackages()` and then dynamically imports the latter two; `ensurePackages` installs
  nothing in a non-interactive environment, so the import throws in CI unless the packages
  are already on disk. Only `eslint` stays a peer. *(Phase 0)*
- **`vitest-preset`** declares `jsdom`, `react`, `react-dom`, `@vitejs/plugin-react` and the
  testing-library packages as `dependencies`. Upstream never names `jsdom` at all — it
  resolves out of the app workspace's hoist. There is no app here, so without the
  declaration every test fails on environment resolution. `vitest` stays the only peer.
  *(Phase 0)*
- **`use-local-storage`** extends `@pineappleui/tsconfig/react-library.json`, where upstream
  extends `base.json`. `base.json`'s `lib` is `["ES2020"]` — no DOM — so upstream's package
  only compiles because `@types/node` happens to declare a global `localStorage`, and it has
  no `jsx` either, which its `.tsx` test file needs. Both are accidents of hoisting rather
  than intent. Every React package here, this one included, extends `react-library.json`.
  *(Phase 1)*
- **`icons`** declares `@ladle/react` as a `devDependency`, where upstream declares it nowhere:
  its `Icon.stories.tsx` imports the `Story` type, and upstream resolves that through
  `apps/gallery`'s hoist. There is no gallery workspace here yet, so without the declaration the
  story does not typecheck. The delta repeated in every one of the 11 Phase 2 packages: each one's
  story imports from `@ladle/react`, and each declares it. Only a story written in the bare
  CSF `export default { title }` form — like `live-region`'s — imports nothing from Ladle and
  therefore needs no devDependency. *(Phase 1)*
- **`icons`** exports `ICON_NAMES` and `ICON_SIZES` — the first four deltas are dependency and
  tsconfig differences, this one is the first deliberate divergence in **published API**, so the
  eventual cutover diff will show a real export the upstream package does not have. Upstream
  hand-types both lists inside `Icon.stories.tsx`, a private copy of the keys of `ICONS` and
  `SIZES` that nothing compares against them: a new glyph type-checks, tests green, and never
  appears in the gallery. Here both lists are `Object.keys(...)`-derived from the maps and
  exported, the story maps over them, and consumers get the vocabulary they need to build a
  picker — a type cannot be iterated. The maps, the derived lists and the two types moved out
  of `Icon.tsx` into `src/vocabulary.ts` to make that possible:
  `react-refresh/only-export-components` fails a module that exports both a component and a
  constant, and the rule's `allowConstantExport` escape hatch covers literals only, not a
  `Object.keys()` call. `Icon.tsx` keeps the component and `IconProps`; `index.ts` is the only
  place the two halves meet. Do not "restore" the local arrays when syncing with upstream;
  carry the export back the other way instead. *(Phase 1)*
- **The Radix wrappers' playground stories drop one type assertion each.** Upstream writes
  `gap={gap as StackProps['gap']}` (and `p={p as BoxProps['p']}`) to push a `string` control
  value into a Radix space prop. That assertion is a no-op: Radix types those props
  `enum | string`, so the prop already accepts a plain `string`.
  `ts/no-unnecessary-type-assertion` is type-aware and says so — it fires here and not upstream
  only because this repo resolves a newer `@typescript-eslint` (8.65 against upstream's 8.58),
  which is a lint gate getting sharper, not a difference in the code. The fix is the one
  `eslint --fix` writes: delete the assertion. `box` loses its now-unused
  `import type { BoxProps }` with it; `stack` and `inline` keep theirs, which their
  `PlaygroundArgs` still uses. Expect this to repeat in every remaining Phase 2 package whose
  story feeds a control value to a space-scale prop. *(Phase 2)*
- **`box`'s third test actually exercises `as` and `asChild`** — the first delta in **test
  content**, where the six above are dependency, tsconfig, published-API and story differences.
  Upstream names that test `renders as the provided element via the asChild pattern (with as)`
  and then renders a bare `<Box>` and asserts `DIV`, passing neither prop: it re-asserts exactly
  what the first test already covers, so the green line proves nothing about the behavior its
  name claims. Here it splits in two — `as="span"` asserting a `SPAN`, and `asChild` over a
  `<section>` asserting the child element replaces the div and still carries `rt-r-p-4`, which
  also pins that Radix's props reach the slotted element. Both match what `@radix-ui/themes`
  supports: its `as` is an enum of `'div' | 'span'`, so an `as="section"` would not typecheck —
  `asChild` is the only route to any other tag. Do not restore the no-op when syncing; carry the
  fix back the other way at cutover, as with the `icons` exports. *(Phase 2)*
- **Every story with a colour control builds it from `ACCENT_COLORS`** — `text`, `heading`,
  `badge`, `button`, `icon-button`, `text-field` and `text-area`, which is every Phase 2 package
  that offers one — where upstream hand-types the list into each `Playground.argTypes`. `text`,
  `heading`, `badge`, `text-field` and `text-area` write
  `['', 'gray', 'indigo', 'violet', 'teal', 'orange', 'crimson']`, a copy that is *already*
  drifted: `bronze` joined the real list and never reached any of the five pickers, which is the
  exact failure `check-token-drift` was written for — and the guard fires on the ported files,
  naming them and printing this fix. `badge`'s `Colors` gallery hard-codes the same five a second
  time and now maps over `ACCENT_COLORS` instead. `button` and `icon-button` are the case the
  guard *cannot* see: their lists read `['', 'gray', 'blue', 'green', 'red', 'amber', 'purple']`,
  which overlaps `ACCENT_COLORS` in nothing, so no member count trips — and yet two playgrounds
  offer five accents this design system does not have while omitting all six it does. Both now
  spread the real list too, which is a deliberate change to what those controls offer. All seven
  import `ACCENT_COLORS` from `@pineappleui/tokens`, which makes it a **devDependency** of each.
  Dev-only is the correct half: `files: ["dist"]` never ships a story, and `check-peer-externals`
  excludes `*.stories.*` from its src scan for the same reason, so no published package gains a
  dependency. `''` (inherit) and `'gray'` (Radix's neutral scale, not an accent) stay written out
  — one literal is a reference, not a copy of a list. *(Phase 2)*
- **`heading`'s size assertions are rewritten off Radix's own default** — the second finding of
  the same class as `box`'s above, and the reason reading test *bodies* is now a checklist item
  rather than an anecdote. Radix's `headingPropDefs.size.default` is `'6'`. Upstream asserts the
  `size` pass-through with `size="6"` → `rt-r-size-6`, and asserts the level mapping with
  `as="h3"` → `rt-r-size-6`, and `LEVEL_SIZE.h3` is also `'6'`. Both therefore re-assert the class
  an untouched `<Heading>` already carries: a `Heading` that drops `size` on the floor entirely
  passes both. Verified by mutation — neutering `resolvedSize` leaves both upstream assertions
  green. Here the pass-through test uses `size="9"`, and the mapping is pinned at every entry
  distinguishable from the default — `h1` → `rt-r-size-8`, `h2` → `-7`, `h4` → `-5`, `h5` → `-4`
  and `h6` → `-3`; the same mutation fails all six. `h3` stays untested on purpose: it maps to
  `'6'`, so an assertion for it would be the very no-op this delta records. The override test
  (`h1 size="2"`) was already sound and is ported verbatim; the bare-`<Heading>` test was too, and
  additionally asserts `rt-r-size-6` — the one place the default is the behavior under test rather
  than a hole in it. Do not restore the no-ops when syncing; carry the fix back the other way at
  cutover. *(Phase 2)*
- **`text`'s ref test asserts `HTMLSpanElement`, where upstream asserts `HTMLElement`** — the third
  test-content delta, and the mildest: unlike `box`'s and `heading`'s, the upstream assertion is not
  a no-op, since it still fails if the ref never arrives. What it cannot notice is *which* element
  arrived — `instanceof HTMLElement` holds for every one of them, so the tag could change underneath
  a consumer that focuses or measures the node and the test would stay green. Radix types `Text`'s
  ref as `HTMLSpanElement` and renders a `<span>` unless `as` says otherwise, so the tighter
  assertion is the one the component actually promises, and it is the shape `box` already uses
  (`HTMLDivElement`). Expect this per package in the rest of Phase 2: the right assertion is
  whatever element that package's Radix primitive types its ref as, not `HTMLElement`. Do not loosen
  it back when syncing; carry the tightening the other way at cutover. *(Phase 2)*
- **`icon-button` does not declare `@radix-ui/react-icons`, and its story uses
  `@pineappleui/icons`.** Upstream lists that package in `peerDependencies`, in `devDependencies`
  and in `tsup`'s `external`, and nothing the package publishes imports it — the only import is
  `IconButton.stories.tsx`'s `HeartIcon`, and `files: ["dist"]` never ships a story. A peer nobody
  imports is not a harmless extra line: npm asks every consumer to install it, and the four
  `check-peer-externals` assertions are all keyed on imports, so none of them would ever report it.
  The declaration is dropped from all three places. The story's glyph then comes from
  `@pineappleui/icons` — this design system's own icon package, already in the repo — as a
  story-only **devDependency**, on the same dev-only footing as `@pineappleui/tokens` above. That
  is a change to story content, not just to a manifest: the buttons render `<Icon name="copy" />`
  rather than a heart, and each carries its own `aria-label`, because `Icon` is decorative by
  default and an icon-only control with no accessible name announces as "button". *(Phase 2)*
- **`card`'s first test asserts the `<div>` its name claims** — the fourth test-content delta but the
  third of the class the Phase 2 checklist counts, because `text`'s tightening above is a
  test-content delta and not a name its body failed to describe — and the same shape as `box`'s.
  Upstream names it `renders a div with the provided children` and then
  asserts only that the text is in the document, never that a `div` is what rendered: the half of
  the name that mentions the element is unexercised, so Radix swapping `Card`'s tag would not fail
  it. One line fixes it — `expect(el.tagName).toBe('DIV')` — which is exactly the shape upstream's
  own `badge` test already uses for its `<span>`. This is the one place a Radix default is the
  behaviour under test rather than a hole in the test, as with the bare-`<Heading>` case. The other
  three `card` assertions were audited and are verbatim: `size="3"` and `variant="classic"` both
  sit off Radix's defaults (`'1'` and `'surface'`), and the ref assertion already names
  `HTMLDivElement`. `badge`, `button` and `icon-button` needed no rewrite at all — `variant="solid"`
  against a `soft` default, `variant="soft"` against a `solid` one, `loading` against `false`,
  `color="crimson"` against `''`, and refs typed `HTMLSpanElement` / `HTMLButtonElement` to match
  what Radix types each primitive's ref as. *(Phase 2)*
- **`text-field`'s slot test asserts the containment its name claims, and the package gains the ref
  test it never had** — the fifth test-content delta, of which the first half is the fourth of the
  class the Phase 2 checklist counts and the second half is a different thing entirely: an absent
  test rather than a name its body failed to describe. Upstream names the test
  `renders TextField.Slot children inside the field` and asserts
  `expect(getByText('@')).toBeTruthy()`. That assertion cannot fail — `getByText` already throws
  when the text is absent, so the `expect` adds nothing — and it says nothing about either the slot
  or the field: an `@` rendered by any element anywhere in the document passes it. It now asserts
  that the text sits on a `.rt-TextFieldSlot` and that a `.rt-TextFieldRoot` is its ancestor, which
  is what the name claims. Verified by mutation, swapping `<TextField.Slot>` for a bare `<span>`:
  the upstream shape stays green, the rewrite fails on `expected '' to match /rt-TextFieldSlot/`.
  Separately, upstream `text-field` ships **no ref test at all** — a gap `stack` and `inline` still
  have, and this delta closes only `text-field`'s — and the ref is the interesting half of a
  compound component: Radix types `TextField.Root`'s ref `ElementRef<'input'>` and composes it onto
  the inner `<input>`, not onto the `<div>` the root renders for the slots — so "the ref reaches
  the node you focus" is exactly the thing a pass-through package should pin. The new test asserts
  `HTMLInputElement`, per the `text` delta's standing rule. `text-area` needed no rewrite:
  `size="3"` and `variant="soft"` both sit off Radix's `'2'` / `'surface'` defaults (a bare render
  carries `rt-r-size-2 rt-variant-surface`, checked by execution rather than by eye), and its ref
  assertion already names `HTMLTextAreaElement`, which is what Radix types it as. It gains one test
  all the same: `textAreaPropDefs.resize` carries no `default` at all, so a bare render has no
  `rt-r-resize-*` class and `resize="vertical"` → `rt-r-resize-vertical` is an assertion nothing
  but a live pass-through can pass — and the README sells `resize` as a contract bullet with
  nothing pinning it. Do not restore the no-op or drop either new test when syncing; carry all
  three back the other way at cutover. *(Phase 2)*
- **`theme`'s first-paint generator serializes the two lists its script carries**, where upstream
  hand-types both. `getFoucScript` returns a string that runs before any module loads, and
  upstream reasons from that to a hand-typed `var ACCENT_COLORS = […]` plus a `GRAY_BY_ACCENT`
  map duplicating Radix's `getMatchingGrayColor` — with a comment saying both will silently drift
  and a test to catch it when they do. The premise is false, and `check-token-drift`'s header is
  where this repo already says so: the GENERATED script cannot import, but the GENERATOR is an
  ordinary module. Both lists are now interpolated — `${JSON.stringify([...ACCENT_COLORS])}` from
  `@pineappleui/tokens`, and the gray map built from `getMatchingGrayColor` itself, which is
  exactly what Radix's `<Theme>` falls back to given that `DesignSystemProvider` passes it no
  `grayColor`. The guard fires on the ported file otherwise: six members of `ACCENT_COLORS` in
  one file, written out twice. Adding an accent now needs no edit here at all, which is the thing
  upstream's comment asks a human to remember — and because the interpolation happens when
  `getFoucScript()` is *called*, the script a consumer inlines carries whatever list their
  installed `@pineappleui/tokens` exports. The test that diffed the literal against the export
  stays, renamed off "hand-types": it asserts what reaches the browser whichever way the
  generator got it, and it is what fails if someone writes the array back by hand. *(Phase 3)*
- **`theme`'s provider test derives the accents it stores, and the package gains the test that
  pins its setters writing the whole record** — the sixth test-content delta, and two things at
  once, as `text-field`'s was. Upstream hand-types two accent names into
  `ThemePreferencesProvider.test.tsx`, one stored and one picked; two members of a list
  `@pineappleui/tokens` owns, in one file, is the copy `check-token-drift` fails on, and the fix
  is the one every Phase 2 story already uses — `ACCENT_COLORS.filter(…)`, "some accent that is
  not the default", which is all either test needs them to be. The default itself stays a literal:
  it is the value under test, and asserting it against the constant it asserts would hold no
  matter what that constant said. Separately, all seven upstream tests start from **empty**
  storage, where the preference a setter might drop already equals the default — so nothing
  notices a setter that stops carrying the other preference across. Two new tests close it, one
  per setter, each seeding both preferences and asserting the whole record after one write: one
  test pins one direction, so the pair is the assertion rather than either half of it. Verified
  by mutation both ways — `setStored({ ...DEFAULT_PREFERENCES, accentColor })` fails the accent
  one, `setStored({ ...DEFAULT_PREFERENCES, appearance })` fails the appearance one, and the
  seven upstream tests stay green under either. It is a user whose dark mode reverts to "follow
  the OS" the moment they pick an accent, and — the mirror, which one test alone did not catch —
  whose accent reverts to bronze the moment they switch to dark. Do not restore the literals or
  drop either test when syncing; carry both back the other way at cutover. *(Phase 3)*
- **`theme`'s two upstream story files land as one, `Theme.stories.tsx`.** Upstream splits them:
  `Smoke.stories.tsx` at the package root, `providers/Providers.stories.tsx` beside the provider.
  Ladle names a story group after the file it came from, so in a gallery that lists every other
  package under its own name those two arrive as `smoke` and `providers` — two unattributed
  groups sitting next to `badge`, `box` and `card`. Merged, they are `theme--hello-world` and
  `theme--themed-text-and-button`, with both stories kept apart from de-branding. Every other
  package here has exactly one story file named for it; this is that convention, not an exception
  to it. *(Phase 3)*
- **`theme`'s stylesheet doubles the selector on its font override** — `.radix-themes.radix-themes`
  where upstream writes `.radix-themes`, which is the same element at twice the specificity
  (0,2,0 against Radix's own 0,1,0). Upstream's comment says these "win by source order", and
  they do *there*: it is an app, and that app's bundle puts the `@import`ed Radix stylesheet
  first. A published package does not own its source order. A consumer who also imports
  `@radix-ui/themes/styles.css` themselves, or whose bundler concatenates the two the other way
  round, gets Radix's `--default-font-family` last, and at equal specificity last wins. What they
  see is the app rendering in Radix's default font — a normal-looking font, which is why nobody
  reads it as a broken import. Do not "simplify" the doubled selector back when syncing. *(Phase 3)*
- **`use-local-storage`'s `set` accepts a functional updater, and `theme`'s two setters use it** —
  a deliberate divergence in **published API**, like `icons`' exported lists, and the first one
  that reaches back into a package an earlier phase already landed. Upstream's hook takes a value
  only, `(value: T) => void`, and upstream's `ThemePreferencesProvider` spreads the record its
  render captured: `setStored({ ...prefs, appearance })`. Each setter is created during a render
  and closes over that render's `prefs`, so **two setter calls in one tick both resolve against
  the state before either** — a "reset to the light bronze theme" button, or the gallery's
  appearance bridge writing while a story picks an accent — and the second overwrites the first
  with nothing reporting it. React does not re-render in between, so there is no moment at which
  the intermediate value could be read back, and every upstream test writes one preference at a
  time. Verified by probe before the fix, in both orders: setting the appearance then the accent
  reverts the appearance, and the reverse reverts the accent. The hook therefore takes
  `T | ((previous: T) => T)` — `useState`'s own pair of shapes, resolved against a ref so `set`
  keeps writing `localStorage` exactly once per call — and the two setters pass an updater. Two
  tests pin it, one per order, and both fail on the captured spread. Do not restore the value-only
  signature or the captured spread when syncing; carry both back the other way at cutover.
  *(Phase 3, changing a Phase 1 package)*

---

## Adding a workspace later

CI runs **one unfiltered job**. Adding a second workspace root therefore needs no change to
**what CI runs** — `apps/*` arrived with the Ladle gallery and the job selection was untouched.
The workflow was edited, once, and for a different reason: `apps/**` joined the `hashFiles` list
in the turbo cache key, which changes what a cache key *covers*, never what runs. But it does
require three things:

1. add the glob to `workspaces` in the root `package.json`
2. add it to `UNDERSTOOD_GLOBS` in `scripts/workspace-globs.mjs`, which is where workspace
   discovery lives. Step 1 without step 2 is a hard failure by design: every guard calls the
   assertion, so a glob nobody taught the discovery about stops the build with the fix in the
   message rather than quietly shrinking what the guards cover
3. **account for all four tasks** (`build`, `lint`, `test`, `typecheck`) in the new workspace

The third one matters more than it looks: `turbo run <task>` *silently skips* a package that
does not define the task and still reports success. A workspace missing `test` is not a
failing test — it is no test at all, reported green.

Accounting for a task means one of exactly two things:

- **define the script**, or
- **declare the omission with a reason**, in the workspace's own `package.json`:

  ```jsonc
  "pineapple": {
    "tasksNotApplicable": {
      "build": "Ships index.mjs as-is; a workspace-only ESM config has nothing to compile."
    }
  }
  ```

`check-publish-contract.mjs` fails, with the fix in the message, on any workspace that does
neither — **private packages included**. That last word is the point: this guard used to check
scripts only for publishable packages and leave private ones "to the reviewer", and the result
was that `@pineappleui/eslint-config` and `@pineappleui/tsconfig` ran *zero* tasks each while
the guard printed `4 workspace(s) OK`. A reviewer cannot catch an absence; only a check can.

What a declaration must not be is a way to dodge work. Do not add a script that runs and
verifies nothing just to fill a slot — a hollow task is worse than a declared gap, because it
reports green. A declaration is auditable: the guard rejects one that is empty, that names a
task the package actually defines, or that names a task that does not exist.
