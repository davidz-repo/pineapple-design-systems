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

Every component package declares `react`, `react-dom` and `@radix-ui/themes` in
`peerDependencies` **and** lists them in `tsup.config.ts`'s `external`. Both halves are
required: the peer declaration keeps npm from installing a second copy into the consumer's
tree, and `external` keeps the bundler from inlining one into `dist/`. A duplicate React is
a broken-hooks bug that surfaces far from its cause.

Workspace dependencies (`@pineappleui/tokens`, etc.) are also `external` for the same reason.

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

### Phase 0 — tooling + tokens (this PR)

| Package | Publishes | Notes |
|---|---|---|
| `@pineappleui/tsconfig` | no | `base.json`, `react-library.json` |
| `@pineappleui/eslint-config` | no | antfu wrapper; antfu's react peers are real deps here |
| `@pineappleui/vitest-preset` | no | React + jsdom factory; `jsdom` is a real dep here |
| `@pineappleui/tokens` | **yes** | pure data; no React, Radix or DOM |

Two dependency deltas from the source monorepo are deliberate and should not be "corrected"
back:

- **`eslint-config`** declares `@antfu/eslint-config`, `@eslint-react/eslint-plugin` and
  `eslint-plugin-react-refresh` as `dependencies`, not peers. antfu v8's react preset calls
  `ensurePackages()` and then dynamically imports the latter two; `ensurePackages` installs
  nothing in a non-interactive environment, so the import throws in CI unless the packages
  are already on disk. Only `eslint` stays a peer.
- **`vitest-preset`** declares `jsdom`, `react`, `react-dom`, `@vitejs/plugin-react` and the
  testing-library packages as `dependencies`. Upstream never names `jsdom` at all — it
  resolves out of the app workspace's hoist. There is no app here, so without the
  declaration every test fails on environment resolution. `vitest` stays the only peer.

`vitest-preset` intentionally has **no `test` script**: a bare `vitest run` exits 1 on "no
test files found".

### Phase 1 — no workspace dependencies

`use-local-storage`, `live-region`, `icons`. Each depends only on React, so they can land in
any order.

### Phase 2 — Radix wrappers

`box`, `stack`, `inline`, `text`, `heading`, `badge`, `button`, `icon-button`, `card`,
`text-field`, `text-area`.

All eleven have the same shape. Copy `packages/tokens` as the template, then:

- swap `tsconfig.json` to extend `@pineappleui/tsconfig/react-library.json` (tokens extends
  `base.json` because tokens are pure data — a React package needs the DOM libs and `jsx`)
- add `react`, `react-dom`, `@radix-ui/themes` to `peerDependencies` and to `tsup`'s
  `external`
- keep everything else — the four scripts, `files`, `exports`, `publishConfig`, `license`,
  `repository.directory` — identical.

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
