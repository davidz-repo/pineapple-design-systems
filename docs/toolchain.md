# Toolchain notes

Two decisions in the root manifest look arbitrary until you know what went wrong without
them. Both are held by a guard, so neither depends on being remembered.

## `devEngines`, not `packageManager`

The root manifest declares `devEngines.packageManager` rather than `packageManager`. Turbo
refuses to resolve the workspace without one of the two, and accepts only a single-major
range. `devEngines` is never read by corepack, and `onFail: "warn"` keeps a different npm
major from hard-failing an install — a contributor on npm 10 gets a warning, not a wall.

CI does not lean on that leniency. Node 22 ships npm 10, so both workflows install npm 11
immediately after `setup-node`; otherwise every npm step logs `EBADDEVENGINES` and the repo
is verified by a package manager it does not declare.

## The root `vite` devDependency

No publishable package here builds with vite — they bundle through tsup, and vitest only ever
pulled vite in as its own peer. That undeclared, peer-hoisted copy is exactly the problem: **a
transitive that nobody names loses the top `node_modules` slot to the first package that does
name one.** `@ladle/react` declares `vite@^6`, and so it silently dragged the workspace-wide
test runner from vite 8 down to vite 6.

Declaring `vite` at the root pins the shared slot at 8 and pushes Ladle's 6 into its own nested
copy, where it affects only Ladle — including when Ladle builds the gallery, which runs on that
nested 6. The gallery's own `vite` devDependency is for its config's `defineConfig` and the
`vite/client` types its CSS import needs, not for a second bundler.

This is the same correction `plan.md` §"Deltas from the source monorepo" records for `jsdom`
& co — a dependency the upstream monorepo never had to name, because an app workspace's hoist
named it for them.

### Why two guards, not one

The declaration alone does not stay true: a lockfile pins a resolved *version*, not ownership
of the *slot*, so a future dependency needing another major could take it back on a routine
`npm install`.

**`check-toolchain-hoist.mjs`** asserts the pairing — for every dependency the root declares,
the version `package-lock.json` records at `node_modules/<name>` must satisfy the root's range.
The list is the root's own declared dependencies, so a new one joins the guard by being declared.

That proves the root's *declared* slots hold, not that the toolchain set is complete.
`typescript`, `vitest` and `tsup` are pinned per package rather than at the root, so they own no
root-declared slot and `check:hoist` would not report two workspaces building on different
majors of them. That is a different failure (workspaces disagreeing) from the one `check:hoist`
exists for (one shared slot silently changing hands).

**`check-toolchain-agreement.mjs`** holds that one: every module two or more manifests declare
in `devDependencies` — the root's included — must use the **same range string**. Compared as
text, so `^19.0.0` and `^19.0.8` disagree even though npm can satisfy both from one copy. One
decision written into every manifest that has an opinion about it is checkable by `grep`, where
"do these ranges overlap enough" is a re-implementation of npm's resolver.

### What is still unasserted

The two stop short of the join. Agreement is about intent, and identical ranges do not make npm
install one copy — a shared module no manifest declares at the *root* owns no top slot by
anybody's decision, so which package ends up in `node_modules/typescript` is settled by whichever
claimant npm hoisted, a lockfile fact nothing asserts.

It is a milder gap than the one Ladle's `vite@^6` fell through, and the difference is the
declarers: `vite` had none, so one hoist decided what every workspace ran, where a module
nineteen manifests declare identically leaves each with a copy its own range accepts. Declaring
the module at the root is what would move that question into `check:hoist`'s subject.
