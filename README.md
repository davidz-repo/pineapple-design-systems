# pineapple-design-systems

Monorepo for **`@pineappleui`** — a presentational React design system, extracted from a
private product monorepo and published to the public npm registry.

Every package here is a shell: props in, callbacks out. No data fetching, no provider SDKs,
no product vocabulary. See [`docs/plan.md`](docs/plan.md) for the rules that decide what
belongs here and the port roadmap.

## Layout

```
packages/
  tsconfig/           @pineappleui/tsconfig           private   TS bases (base, react-library)
  eslint-config/      @pineappleui/eslint-config      private   antfu wrapper + shared rule blocks
  vitest-preset/      @pineappleui/vitest-preset      private   React + jsdom Vitest factory
  tokens/             @pineappleui/tokens             PUBLIC    accent colors + theme types
  use-local-storage/  @pineappleui/use-local-storage  PUBLIC    state synced to localStorage
  live-region/        @pineappleui/live-region        PUBLIC    aria-live announcement wrapper
  icons/              @pineappleui/icons              PUBLIC    Lucide wrapper, size tokens + a11y
  box/                @pineappleui/box                PUBLIC    Radix Box pass-through
  stack/              @pineappleui/stack              PUBLIC    vertical layout (Radix Flex, column)
  inline/             @pineappleui/inline             PUBLIC    horizontal layout (Radix Flex, wrapping row)
  text/               @pineappleui/text               PUBLIC    Radix Text pass-through (body copy)
  heading/            @pineappleui/heading            PUBLIC    Radix Heading, size defaulted per level
  badge/              @pineappleui/badge              PUBLIC    Radix Badge pass-through (inline label)
  button/             @pineappleui/button             PUBLIC    Radix Button pass-through
  icon-button/        @pineappleui/icon-button        PUBLIC    Radix IconButton pass-through (square, one glyph)
  card/               @pineappleui/card               PUBLIC    Radix Card pass-through (padded surface)
  text-field/         @pineappleui/text-field         PUBLIC    Radix TextField namespace (Root + Slot)
  text-area/          @pineappleui/text-area          PUBLIC    Radix TextArea pass-through (multi-line input)
  theme/              @pineappleui/theme              PUBLIC    theme providers + stylesheet + first-paint snippet
apps/
  gallery/            @pineappleui/gallery            private   Ladle gallery; renders every package's stories
scripts/
  check-publish-contract.mjs                                    publish + task-coverage guard
  check-token-drift.mjs                                         no hand-typed copies of a token list
  check-peer-externals.mjs                                      peers stay peers, and stay out of dist/
  check-toolchain-hoist.mjs                                     the root owns its node_modules/ top slots
  check-alias-fences.mjs                                        the gallery's three alias lists agree
  check-ci-invariants.mjs                                       the cache's two keys pair, the guard lists agree, scripts/ stays linted
  check-ref-tests.mjs                                           a package that forwards a ref proves the ref arrives
```

## Working on it

```bash
npm install
npm run verify        # the pre-build guards, then build + lint + test + typecheck, then the rest
npm run ladle -w @pineappleui/gallery   # the story gallery on http://localhost:6006
```

The gallery resolves every `@pineappleui/*` import to that package's `src/`, not to its
`dist/` — so a component edit shows up on reload with no build in between. Its `build` task
(`ladle build`, behind a wrapper that fails the task when the build does — ladle exits 0 either
way) is what proves in CI that every story still compiles.

`verify` runs seven guards around the four turbo tasks. Each is also a script of its own, and
each fails with the fix in the message:

| Script | Guards against |
|---|---|
| `npm run check:hoist` | a dependency capturing a root-declared package's top `node_modules/` slot |
| `npm run check:aliases` | the gallery's three `@pineappleui/*` lists drifting apart |
| `npm run check:ci` | a turbo cache `restore-keys` that is not exactly the static portion of `key` — a salt written into one line and not the other restores everything it was meant to discard — and a guard that `scripts/`, `verify` and CI do not all three name, or whose CI step can be skipped — and a `scripts/` lint missing one of its three legs: the root `lint:scripts` script, the `//#lint:scripts` turbo task, and the `lint` task's `dependsOn` entry that reaches it, of which the script and the entry both go green when deleted |
| `npm run check:refs` | a package whose props carry a `ref` and whose tests never check that the ref arrives — an implementation that accepts the prop and drops it renders, lays out and passes every class-name assertion above it |
| `npm run check:publish` | a manifest that cannot publish, an entry point missing from the tarball, a `"*"` range on a sibling workspace shipping to consumers, and a workspace running zero tasks |
| `npm run check:drift` | a hand-typed copy of a list `@pineappleui/tokens` owns |
| `npm run check:externals` | a peer that got inlined into `dist/`, an undeclared one that did not, and a dependency only a stylesheet's `@import` names |

`check:hoist`, `check:aliases`, `check:ci` and `check:refs` run *before* the build and need no
build output: the first reads `package-lock.json`, so it answers "is the toolchain the one we
declared?" before anything runs on that toolchain; the second reads the gallery's configs, where a
missing devDependency is what would let the build below replay from cache without compiling the
change that prompted it; the third reads `.github/workflows/ci.yml`, this `verify` chain itself and
the `scripts/` listing, so a guard that any one of those three does not name is a failure rather
than a quietly shorter run; and the fourth reads component sources and test files, which is what
qualifies the `test` task below — a package with no ref test is green there in exactly the words a
package with one is. The other three read `dist/` and run after.

**`turbo` is the only verification entry point.** Running a package's own `npm test` or
`npm run typecheck` directly reads whatever is currently sitting in its dependencies'
`dist/`, which may be stale — that is a false green. Every turbo task `dependsOn: ["^build"]`
precisely so this cannot happen. Use `npm run verify` from the repo root, or
`npx turbo run <task>`.

Individual tasks: `npm run build`, `npm run lint`, `npm run test`, `npm run typecheck`.

`turbo run lint` also lints `scripts/` and the root `eslint.config.mjs`, through the root task
`//#lint:scripts` that the `lint` task declares in `dependsOn`. The root is not a workspace, so
it has no `lint` script for `turbo run lint` to find on its own — depending on the root task is
what puts the guards inside the single `turbo run build lint test typecheck` that `verify` and
CI already run, with nothing added to either. It uses the same `@pineappleui/eslint-config`
factory as every package, with `react` and `typescript` off: plain Node ESM, no tsconfig here.

### Every workspace accounts for all four tasks

`turbo run <task>` skips a package that does not define the task **and still reports success**,
so a missing script is not a failing check — it is no check at all, reported green. Each
workspace therefore either defines `build`/`lint`/`test`/`typecheck`, or declares the omission
and why in its own `package.json`:

```jsonc
"pineapple": {
  "tasksNotApplicable": {
    "build": "Ships index.mjs as-is; a workspace-only ESM config has nothing to compile."
  }
}
```

`check-publish-contract.mjs` fails on any workspace that does neither, private ones included,
and prints the fix. Declare a real gap rather than adding a script that runs and checks
nothing — see `docs/plan.md` §"Adding a workspace later".

### Every component that forwards a ref proves it

A forwarded ref is the part of a pass-through wrapper that renders correctly while being broken.
The components here are two lines — destructure a default, spread the rest into a Radix primitive
— and the ref travels inside that spread. Stop spreading it and the component still renders,
still lays out, and still passes every class-name assertion in its test file, while every
consumer's `ref` is silently `null`. React 19 puts `ref` in `ComponentPropsWithRef`, so a
component that accepts the prop and drops it type-checks exactly as well as one that passes it on.

`check-ref-tests.mjs` derives the packages that owe a ref test from their own sources — anything
declaring `ComponentPropsWithRef`, `forwardRef`, re-exporting a `@radix-ui/themes` component
whole, or declaring a props interface that `extends` another type and inherits that type's `ref`
with it (`icons` does, through `Omit<LucideProps, …>`) — and requires of each a test titled
`forwards refs to the underlying …` that attaches a `ref={(el) => { received = el; }}` and
asserts `toBeInstanceOf(HTML…Element)` **on that same variable**. The chain matters: a ref
attached to nothing beside an assertion about `container.firstChild` is green under a component
that drops every ref. Copy `packages/box/src/Box.test.tsx`.

A workspace that renders JSX outside a test and matches none of those forms is **refused**, not
skipped, because "takes no ref" and "takes a ref this guard did not recognise" are the same
silence. Say which it is in its own `package.json`:

```jsonc
"pineapple": {
  "refTestNotApplicable": "LiveRegionProps is a hand-written list of seven props and `ref` is not one of them, so nothing reaches the element `as` names."
}
```

### Expected build output

Every publishable package builds with both `treeshake` and `sourcemap` on, which makes tsup emit
a doubled `//# sourceMappingURL=` comment in `dist/index.mjs`. It is harmless, it is inherited
from the upstream config, and it is **not** a bug to tune away.

`*.stories.tsx` files live next to the component they document and are typechecked and linted by
the package that owns them. `apps/gallery` is what renders them: it globs
`packages/*/src/**/*.stories.{ts,tsx}`, so a new package's stories appear the moment the file
exists, with nothing to register. `ladle build` writes `apps/gallery/build/`, which is
gitignored.

## Releasing

Versioning and publishing run on [changesets](https://github.com/changesets/changesets).

```bash
npx changeset        # describe the change; commit the generated .changeset/*.md
```

Merging to `main` opens (or updates) a Version PR. Merging *that* publishes to the public
npm registry.

The Version PR resyncs `package-lock.json` itself. `changeset version` rewrites the workspace
manifests only, and the bot commits without installing, so the lockfile used to ship a version
behind what was published — `npm ci` does not fail on a workspace version-field mismatch, so
nothing caught it. The version step now runs `npm install --package-lock-only` after it, which
means **a Version PR touching the lockfile is expected**: reviewing one, look for version-field
changes plus, occasionally, a re-resolved range for an unrelated dependency that published since
the last install.

Publishable packages carry `publishConfig.access: "public"` and a `license` —
npm defaults scoped packages to `restricted`, and a package with no license renders as
"proprietary" to consumers' license scanners. `scripts/check-publish-contract.mjs` fails the
build if either goes missing.

## A note on `devEngines`

The root manifest declares `devEngines.packageManager` rather than `packageManager`. Turbo
refuses to resolve the workspace without one of the two, and accepts only a single-major
range. `devEngines` is never read by corepack, and `onFail: "warn"` keeps a different npm
major from hard-failing an install — a contributor on npm 10 gets a warning, not a wall.

CI does not lean on that leniency. Node 22 ships npm 10, so both workflows install npm 11
immediately after `setup-node`; otherwise every npm step logs `EBADDEVENGINES` and the repo
is verified by a package manager it does not declare.

## A note on the root `vite` devDependency

No publishable package here builds with vite — they bundle through tsup, and vitest only ever
pulled vite in as its own peer. That undeclared, peer-hoisted copy is exactly the problem: a
transitive that nobody names loses the top `node_modules` slot to the first package that *does*
name one. `@ladle/react` (a devDependency of `icons` and of every Phase 2 wrapper for the
`Story` type their stories import, and the gallery's actual renderer) declares `vite@^6`, and so
it silently dragged the workspace-wide test runner from vite 8 down to vite 6. Declaring `vite`
at the root pins the shared slot at 8 and pushes Ladle's 6 into its own nested copy, where it
affects only Ladle — including when Ladle builds the gallery, which runs on that nested 6. The
gallery's own `vite` devDependency is for its config's `defineConfig` and the `vite/client`
types its CSS import needs, not for a second bundler.
This is the same correction `docs/plan.md` §"Deltas from the source monorepo" already records
for `jsdom` & co — a dependency the upstream monorepo never had to name, because an app
workspace's hoist named it for them.

The declaration alone does not stay true — a lockfile pins a resolved *version*, not ownership
of the *slot*, so a future dependency needing another major could take it back on a routine
`npm install`. `scripts/check-toolchain-hoist.mjs` asserts the pairing: for every dependency the
root declares, the version `package-lock.json` records at `node_modules/<name>` must satisfy the
root's range. The list is the root's own declared `dependencies` and `devDependencies` (today
that is only the latter), so a new one joins the guard by being declared.

What that guard proves is that the root's **declared** slots hold — not that the toolchain set is
complete. `typescript`, `vitest` and `tsup` are pinned per-package rather than at the root, so
they own no root-declared slot and nothing here would report two workspaces building on
different majors of them. (`eslint` was in that list until the root declared it for
`//#lint:scripts`; the shared slot is now asserted like any other.) That is a different problem
(workspaces disagreeing) from the one this guard exists for (one shared slot silently changing
hands); asserting cross-workspace agreement is a possible extension, not something the green line
already covers.

## License

MIT — see [LICENSE](LICENSE).
