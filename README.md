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
scripts/
  check-publish-contract.mjs                                    publish + task-coverage guard
  check-token-drift.mjs                                         no hand-typed copies of a token list
```

## Working on it

```bash
npm install
npm run verify        # build + lint + test + typecheck, then the publish guard
```

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
npm registry. Publishable packages carry `publishConfig.access: "public"` and a `license` —
npm defaults scoped packages to `restricted`, and a package with no license renders as
"proprietary" to consumers' license scanners. `scripts/check-publish-contract.mjs` fails the
build if either goes missing.

## A note on `devEngines`

The root manifest declares `devEngines.packageManager` rather than `packageManager`. Turbo
refuses to resolve the workspace without one of the two, and accepts only a single-major
range. `devEngines` is never read by corepack, and `onFail: "warn"` keeps a different npm
major (CI's Node 22 ships npm 10) from hard-failing an install.

## A note on the root `vite` devDependency

Nothing in this repo builds with vite — packages bundle through tsup, and vitest only ever
pulled vite in as its own peer. That undeclared, peer-hoisted copy is exactly the problem: a
transitive that nobody names loses the top `node_modules` slot to the first package that *does*
name one. `@ladle/react` (a devDependency of `icons`, for the `Story` type its story imports)
declares `vite@^6`, and so it silently dragged the workspace-wide test runner from vite 8 down
to vite 6. Declaring `vite` at the root pins the shared slot at 8 and pushes Ladle's 6 into its
own nested copy, where it affects only Ladle. This is the same correction `docs/plan.md`
§"Deltas from the source monorepo" already records for `jsdom` & co — a dependency the upstream
monorepo never had to name, because an app workspace's hoist named it for them.

## License

MIT — see [LICENSE](LICENSE).
