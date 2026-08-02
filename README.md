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
scripts/
  check-publish-contract.mjs                                    publish + task-coverage guard
  check-token-drift.mjs                                         no hand-typed copies of a token list
  check-peer-externals.mjs                                      peers stay peers, and stay out of dist/
  check-toolchain-hoist.mjs                                     the root owns its node_modules/ top slots
```

## Working on it

```bash
npm install
npm run verify        # hoist guard, then build + lint + test + typecheck, then the rest
```

`verify` runs four guards around the four turbo tasks. Each is also a script of its own, and
each fails with the fix in the message:

| Script | Guards against |
|---|---|
| `npm run check:hoist` | a dependency capturing a root-declared package's top `node_modules/` slot |
| `npm run check:publish` | a manifest that cannot publish, and a workspace running zero tasks |
| `npm run check:drift` | a hand-typed copy of a list `@pineappleui/tokens` owns |
| `npm run check:externals` | a peer that got inlined into `dist/`, and an undeclared one that did not |

`check:hoist` runs *first* and needs no build: it reads `package-lock.json`, so it answers
"is the toolchain the one we declared?" before anything runs on that toolchain. The other
three read build output and run after.

**`turbo` is the only verification entry point.** Running a package's own `npm test` or
`npm run typecheck` directly reads whatever is currently sitting in its dependencies'
`dist/`, which may be stale — that is a false green. Every turbo task `dependsOn: ["^build"]`
precisely so this cannot happen. Use `npm run verify` from the repo root, or
`npx turbo run <task>`.

Individual tasks: `npm run build`, `npm run lint`, `npm run test`, `npm run typecheck`.

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

### Expected build output

Every publishable package builds with both `treeshake` and `sourcemap` on, which makes tsup emit
a doubled `//# sourceMappingURL=` comment in `dist/index.mjs`. It is harmless, it is inherited
from the upstream config, and it is **not** a bug to tune away.

`*.stories.tsx` files are ported and typechecked, but nothing here renders them yet — the Ladle
gallery workspace lands in a later PR.

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

Nothing in this repo builds with vite — packages bundle through tsup, and vitest only ever
pulled vite in as its own peer. That undeclared, peer-hoisted copy is exactly the problem: a
transitive that nobody names loses the top `node_modules` slot to the first package that *does*
name one. `@ladle/react` (a devDependency of `icons`, and of every Phase 2 wrapper, for the
`Story` type their stories import) declares `vite@^6`, and so it silently dragged the
workspace-wide test runner from vite 8 down to vite 6. Declaring `vite` at the root pins the
shared slot at 8 and pushes Ladle's 6 into its own nested copy, where it affects only Ladle.
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
complete. `typescript`, `vitest`, `tsup` and `eslint` are pinned per-package rather than at the
root, so they own no root-declared slot and nothing here would report two workspaces building on
different majors of them. That is a different problem (workspaces disagreeing) from the one this
guard exists for (one shared slot silently changing hands); asserting cross-workspace agreement
is a possible extension, not something the green line already covers.

## License

MIT — see [LICENSE](LICENSE).
