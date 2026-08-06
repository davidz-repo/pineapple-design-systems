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
  site/               @pineappleui/site               private   reference site (docs, examples, playground) → designpineapple.com
scripts/              eleven guards; see "What verify checks" below
Makefile              the two local dev servers; wraps each app's own npm script
```

## Working on it

```bash
make ladle            # the story gallery on http://localhost:6006
make site             # designpineapple.com on http://localhost:6007
npm run verify        # the guards, then build + lint + test + typecheck
```

Both `make` targets install first when `package-lock.json` has moved, so a dependency added in
any workspace does not surface later as an unresolved import from whichever app you started
next. Each wraps that app's own npm script, which stays the place to change how it starts.

Both apps resolve every `@pineappleui/*` import to that package's `src/`, not its `dist/`, so a
component edit shows up on reload with no build in between.

**`turbo` is the only verification entry point.** Running a package's own `npm test` or
`npm run typecheck` directly reads whatever is sitting in its dependencies' `dist/`, which may
be stale — a false green. Every turbo task declares `dependsOn: ["^build"]` precisely so this
cannot happen. Use `npm run verify`, or `npx turbo run <task>` for one task.

## What `verify` checks

Eleven guards around the four turbo tasks. Each is also a script of its own, and **each fails
with the fix in its own message** — so this table says what breaks, not how to repair it.

| Script | Guards against |
|---|---|
| `npm run check:hoist` | a dependency capturing a root-declared package's top `node_modules/` slot |
| `npm run check:agreement` | two manifests declaring one `devDependencies` module at different ranges |
| `npm run check:aliases` | the gallery's three `@pineappleui/*` lists drifting apart |
| `npm run check:ci` | a turbo cache `restore-keys` that is not the static portion of `key`, a guard that `scripts/`, `verify` and CI do not all three name, and a `scripts/` lint missing one of its three legs |
| `npm run check:refs` | a package whose props carry a `ref` and whose tests never check that the ref arrives |
| `npm run check:placement` | a module some workspace declares a peer sitting in a publishable package's `dependencies` or `optionalDependencies` |
| `npm run check:publish` | a manifest that cannot publish, an entry point missing from the tarball, a `"*"` range on a sibling shipping to consumers, and a workspace running zero tasks |
| `npm run check:props` | a package with no generated props table on the deployed site |
| `npm run check:dts` | a published `types` entry that does not compile under a consumer's stricter options |
| `npm run check:drift` | a hand-typed copy of a list `@pineappleui/tokens` owns |
| `npm run check:externals` | a peer inlined into `dist/`, an undeclared one that was not, and a dependency only a stylesheet's `@import` names |

Six run *before* the build because they need no build output, and each answers a question the
steps below it would otherwise report green over: the toolchain is the one we declared
(`hoist`, `agreement`), the gallery would rebuild rather than replay a stale cache (`aliases`),
no guard has quietly stopped running (`ci`), a ref test exists to qualify the `test` task
(`refs`), and no peer is misfiled into a consumer's install (`placement`). The other five need
build output and run after it.

Individual tasks: `npm run build`, `npm run lint`, `npm run test`, `npm run typecheck`.

`turbo run lint` also covers `scripts/` and the root `eslint.config.mjs`, through the root task
`//#lint:scripts` that `lint` names in `dependsOn`. The root is not a workspace, so it has no
`lint` script for `turbo run lint` to find on its own — depending on the root task is what puts
those files inside the single `turbo run` that `verify` and CI already run.

### Every workspace accounts for all four tasks

`turbo run <task>` skips a package that does not define the task **and still reports success**,
so a missing script is not a failing check — it is no check at all, reported green. Each
workspace therefore either defines `build`/`lint`/`test`/`typecheck`, or declares the omission
and why:

```jsonc
"pineapple": {
  "tasksNotApplicable": {
    "build": "Ships index.mjs as-is; a workspace-only ESM config has nothing to compile."
  }
}
```

`check:publish` fails any workspace that does neither, private ones included. Declare a real gap
rather than adding a script that runs and checks nothing — see `docs/plan.md` §"Adding a
workspace later".

### Every component that forwards a ref proves it

A forwarded ref is the part of a pass-through wrapper that renders correctly while being broken.
These components are two lines — destructure a default, spread the rest into a Radix primitive —
and the ref travels inside that spread. Stop spreading it and the component still renders, still
lays out, and still passes every class-name assertion in its test file, while every consumer's
`ref` is silently `null`. React 19 puts `ref` in `ComponentPropsWithRef`, so a component that
accepts the prop and drops it type-checks exactly as well as one that passes it on.

`check:refs` derives who owes a ref test from their own sources, and requires of each a test
titled `forwards refs to the underlying …` that attaches a `ref={(el) => { received = el; }}`
and asserts `toBeInstanceOf(HTML…Element)` **on that same variable**. The chain matters: a ref
attached to nothing, beside an assertion about `container.firstChild`, is green under a component
that drops every ref. Copy `packages/box/src/Box.test.tsx`.

A workspace that renders JSX outside a test and matches none of the recognised forms is
**refused**, not skipped — "takes no ref" and "takes a ref this guard did not recognise" are the
same silence. Say which it is in its own `package.json`:

```jsonc
"pineapple": {
  "refTestNotApplicable": "LiveRegionProps is a hand-written list of seven props and `ref` is not one of them."
}
```

### Expected build output

Every publishable package builds with both `treeshake` and `sourcemap` on, which makes tsup emit
a doubled `//# sourceMappingURL=` comment in `dist/index.mjs`. It is harmless, inherited from the
upstream config, and **not** a bug to tune away.

`*.stories.tsx` files live next to the component they document and are typechecked and linted by
the package that owns them. `apps/gallery` globs `packages/*/src/**/*.stories.{ts,tsx}`, so a new
package's stories appear the moment the file exists, with nothing to register. Its `build` task
is what proves in CI that every story still compiles — `ladle build` behind a wrapper that fails
the task when the build does, because ladle exits 0 either way. It writes the gitignored
`apps/gallery/build/`.

## Releasing

Versioning and publishing run on [changesets](https://github.com/changesets/changesets).

```bash
npx changeset        # describe the change; commit the generated .changeset/*.md
```

Merging to `main` opens (or updates) a Version PR. Merging *that* publishes to npm.

**A Version PR touching `package-lock.json` is expected.** `changeset version` rewrites the
workspace manifests only, and the bot commits without installing, so the lockfile used to ship a
version behind what was published — `npm ci` does not fail on a workspace version-field mismatch,
so nothing caught it. The version step now runs `npm install --package-lock-only` after it.
Reviewing one, look for version-field changes plus, occasionally, a re-resolved range for an
unrelated dependency that published since the last install.

Publishable packages carry `publishConfig.access: "public"` and a `license` — npm defaults scoped
packages to `restricted`, and a package with no license renders as "proprietary" to consumers'
license scanners. `check:publish` fails the build if either goes missing.

## Further reading

- [`docs/plan.md`](docs/plan.md) — what belongs here, and the port roadmap.
- [`docs/toolchain.md`](docs/toolchain.md) — why the root declares `devEngines` and `vite`, and
  which guard holds each.

## License

MIT — see [LICENSE](LICENSE).
