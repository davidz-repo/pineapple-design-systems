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
stylesheet pulls in with `@import` — Phase 3's theme does this for
`@fontsource-variable/geist` — is a real runtime dependency of the consumer's bundle that none
of them would report. Closing that is part of the Phase 3 PR that introduces the stylesheet.

### 4. ESM only

`"type": "module"`, `format: ['esm']`, output forced to `.mjs` via `outExtension` so that
`exports`/`main`/`module` describe exactly what is on disk. No CJS build. No dual-package
hazard to reason about.

### 5. Every publishable manifest carries `publishConfig.access: "public"` and `license`

npm defaults **scoped** packages to `restricted`. A missing `access` does not fail review, or
CI, or `changeset version` — it fails at the first `npm publish`, hours later. A missing
`license` renders as "proprietary" on the package page and trips consumers' license scanners.
`scripts/check-publish-contract.mjs` enforces both, along with `files`, `exports`, the
`dist/`-rooted entry points, `repository.directory`, and the actual tarball contents. It also
enforces task coverage for **every** workspace, publishable or private — see §8.

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
all of `src`) and linted, but **nothing in this repo renders them** — the Ladle gallery
workspace lands in a later PR. `icons` therefore carries `@ladle/react` as a devDependency
purely for the `Story` type its playground story imports; no other package here provides it.

### Phase 2 — Radix wrappers (5 of 11 landed)

Landed: `box`, `stack`, `inline` — the layout wrappers — plus `text` and `heading`, the
typography pair. Each is a `@radix-ui/themes` peer and nothing else. All five declare
`@ladle/react` as a devDependency, because each one's story imports the `Story` type; `text` and
`heading` additionally declare `@pineappleui/tokens`, because their stories build an accent-colour
control out of the real list. See *Deltas from the source monorepo* below for both.

Remaining: `badge`, `button`, `icon-button`, `card`, `text-field`, `text-area`.

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

- **Read every ported test body, not its name.** Two of the five landed so far shipped an
  assertion that its own name did not describe, and each one was green. Both are recorded as
  standing deltas below.
- **Check each assertion against the Radix default it is asserting past.** A `size`, `direction`
  or `as` prop whose asserted value happens to equal the prop def's own `default` is an assertion
  the component cannot fail. `@radix-ui/themes`' prop defs are the reference:
  `node_modules/@radix-ui/themes/src/components/<name>.props.tsx`.

Do **not** copy `packages/tokens` for these: it extends `base.json` (tokens are pure data) and
declares no React, so it starts a React package two corrections behind live-region.

### Phase 3 — theme

`theme` depends on `tokens` + `use-local-storage`, so it lands last. It ships CSS, which
makes its build config differ from every other package:

- `loader: { '.css': 'copy' }` — ship the stylesheet verbatim, no CSS parsing or bundling
- `dts: { entry: 'src/index.ts' }` — without scoping, tsup tries to emit a `.d.ts` for the
  CSS entry and fails
- an extra `exports["./styles.css"]` entry
- `sideEffects: ["**/*.css"]` rather than `false`
- pulls `@fontsource-variable/geist` as a real dependency

### Deferred

`form` — needs a decision on how much validation behavior belongs in a presentational shell.

### Excluded

`traffic-tag` — product-specific status vocabulary. See principle 2.

---

## Deltas from the source monorepo

Everything else is ported verbatim. These nine differences are deliberate and should **not**
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
  story does not typecheck. Expect this delta to repeat: 10 of the 11 Phase 2 packages import
  from `@ladle/react` in their stories and will each need it. Only a story written in the bare
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
- **`text` and `heading` build their stories' accent-colour control from `ACCENT_COLORS`**, where
  upstream hand-types `['', 'gray', 'indigo', 'violet', 'teal', 'orange', 'crimson']` into each
  `Playground.argTypes`. That copy is *already* drifted: `bronze` joined the real list and never
  reached either picker, which is the exact failure `check-token-drift` was written for — and the
  guard fires on the ported file, naming both packages and printing this fix. So both import
  `ACCENT_COLORS` from `@pineappleui/tokens` and spread it, which makes `@pineappleui/tokens` a
  **devDependency** of each. Dev-only is the correct half: `files: ["dist"]` never ships a story,
  and `check-peer-externals` excludes `*.stories.*` from its src scan for the same reason, so
  neither published package gains a dependency. `''` (inherit) and `'gray'` (Radix's neutral
  scale, not an accent) stay written out — one literal is a reference, not a copy of a list.
  Expect this in every remaining Phase 2 package whose story offers a colour control. *(Phase 2)*
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

---

## Adding a workspace later

CI runs **one unfiltered job**. Adding `apps/*` (a Ladle gallery, a docs site) therefore
needs **no CI change** — but it does require two things:

1. add the glob to `workspaces` in the root `package.json`
2. **account for all four tasks** (`build`, `lint`, `test`, `typecheck`) in the new workspace

The second one matters more than it looks: `turbo run <task>` *silently skips* a package that
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
