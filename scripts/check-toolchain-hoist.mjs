#!/usr/bin/env node
// Top-slot guard: every dependency the ROOT declares must be the one occupying
// the top `node_modules/` slot in package-lock.json.
//
// This repo has already lived the failure. `vite` was used by every workspace
// (vitest pulls it in as its own peer) but declared by none of them, so it was a
// transitive with no owner. `@ladle/react` — a devDependency of `icons`, added
// for one TYPE its story imports — declares a hard `vite@^6`. npm hoists the
// first claimant, so Ladle's 6 took `node_modules/vite` and the entire
// workspace's test runner silently dropped from vite 8 to vite 6. Nothing
// failed. Tests ran, and passed, on a toolchain two majors behind the one the
// repo thought it was on.
//
// The fix was to declare `"vite": "^8.1.5"` at the root, which pushes Ladle's
// copy down into `node_modules/@ladle/react/node_modules/vite` where it affects
// only Ladle. But a declaration alone does not stay true: the lockfile pins a
// resolved VERSION, not ownership of the SLOT. Add one dependency that needs a
// different major, regenerate the lockfile, and the slot can change hands again
// with the same silence as the first time — a routine `npm install` in a PR that
// looks entirely unrelated.
//
// So: read the lockfile and assert the pairing directly. For every dependency
// the root declares, the version recorded at `node_modules/<name>` must satisfy
// the root's declared range.
//
// The list is not configured anywhere. It IS the root's declared `dependencies`
// and `devDependencies` — both fields are read, so a future runtime dependency
// at the root is covered without an edit here, and today that set is exactly
// the devDependencies because the root builds nothing and declares nothing
// else. A new root declaration joins this guard by being written down, with
// nothing to remember.
//
// One declaration shape carries no version to compare. A dependency on a
// sibling workspace — the root declares `@pineappleui/eslint-config` so its own
// eslint.config.mjs can import the shared factory — is recorded as a LINK:
// `node_modules/<name>` holds `{ "link": true, "resolved": "packages/<dir>" }`
// and the version sits on that target entry, behind a range every workspace
// here writes as `*`. So the slot question is asked differently for a link, not
// skipped: npm links a sibling only when the declared range accepts the
// workspace's own version, and goes to the REGISTRY for a package of that name
// when it does not — so "the slot resolves to a WORKSPACE directory whose
// manifest carries this name" is the whole of "the root's own copy owns it". A
// link pointing anywhere else, or at a directory the lockfile does not know, is
// the same capture the version check below exists for, wearing the other shape.
//
// Both halves of that sentence are asserted, because a link alone does not say
// which one it is: `"<name>": "file:../vendored"` produces the identical
// `{ link: true, resolved: … }` entry, pointing outside the workspace set. So
// the target is checked against `listWorkspaceDirs()` — the same lock-derived
// list every other guard walks — and not merely against "the lockfile has an
// entry here". `name` on that entry is compared where npm wrote one and the
// directory's basename where it did not (npm omits the field when the two
// already agree), so an absent field reads as the match it is rather than as a
// mismatch. And a target carrying no `version` is refused exactly as an
// unversioned registry entry is: an unverifiable slot printed as `undefined` on
// a green line is the silence this guard exists to break, not a pass.
//
// What this does NOT prove: that the toolchain is complete. The assertion is
// "every slot the root DECLARES is the one the root asked for" — a slot nobody
// declares is a slot this guard never looks at. `typescript`, `vitest` and
// `tsup` are pinned per-package rather than at the root, so nothing here would
// notice two workspaces building on different majors of them — `eslint` was one
// of them until the root declared it for its own lint task. That is a
// different failure (workspaces disagreeing) from the one this file exists for
// (one shared slot silently changing hands), and it belongs to
// `check-toolchain-agreement`: that guard reads the MANIFESTS rather than the
// lockfile, and requires every module two or more of them declare — the root's
// own `devDependencies` included — to be declared with the same range string.
//
// What the two of them together still do not prove is the join. Agreement is
// about intent, and twenty-one manifests stating one range does not make npm
// install one copy: a shared module NO manifest declares at the ROOT owns no
// top slot by anybody's decision, so which package ends up in
// `node_modules/typescript` is settled by whichever claimant npm hoisted — a
// lockfile fact nothing here asks about, which is the gap `vite` fell through.
// It is a milder gap than `vite`'s was, and the difference is the declarers:
// `vite` had none, so one hoist decided what every workspace ran, where a
// module nineteen manifests declare identically leaves each of them with a copy
// their own range accepts, nested if the shared slot went elsewhere. What is
// unasserted is that SHARED slot — which `typescript`, `vitest` or `tsup`
// resolves from the repo root, for everything that reads from there rather than
// from a workspace. Declaring the module at the root is what turns that
// question into the one this file answers.
//
// Reads package-lock.json rather than node_modules/ on purpose: the lockfile is
// what `npm ci` will install on every machine and in CI, so the assertion holds
// on a fresh clone with no install, and it catches a bad SLOT before anyone runs
// under it. It needs no build, so it runs first — a toolchain that got swapped
// underneath is the reason to distrust everything that runs after it.
//
//   node scripts/check-toolchain-hoist.mjs

import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { listWorkspaceDirs } from './workspace-globs.mjs';

const LOCKFILE = 'package-lock.json';
const TOP_SLOT_PREFIX = 'node_modules/';

// The guard on the other side of the outcome/intent line, named in the fix that
// changes a ROOT range: the root is one of its declarers, so a range edited
// here alone is a disagreement there for every module another manifest declares
// too.
const AGREEMENT_GUARD = 'check-toolchain-agreement';

// Ranges this guard evaluates. Deliberately a closed set, and deliberately not
// `semver` from node_modules: that package is a transitive here, and reaching
// for an undeclared one inside the guard against undeclared dependencies is not
// a trade worth making. Anything outside the set fails loudly rather than
// passing unevaluated.
const CARET = '^';
const TILDE = '~';
const VERSION_PATTERN = /^(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)$/;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @type {string[]} */
const failures = [];

/**
 * @param {string} name
 * @param {string} problem
 * @param {string} fix
 */
function fail(name, problem, fix) {
  failures.push(`${name}: ${problem}\n    fix: ${fix}`);
}

function readJson(relPath) {
  return JSON.parse(readFileSync(path.join(repoRoot, relPath), 'utf8'));
}

/** @param {string} version @returns {[number, number, number]|null} */
function parseVersion(version) {
  const match = VERSION_PATTERN.exec(version);
  if (!match)
    return null;
  const { major, minor, patch } = match.groups;
  return [Number(major), Number(minor), Number(patch)];
}

/** @returns {number} negative if a < b */
function compareVersions(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i])
      return a[i] - b[i];
  }
  return 0;
}

/**
 * Whether `version` satisfies `range`, for the range forms above.
 *
 * @param {string} version
 * @param {string} range
 * @returns {{ ok: boolean } | { unsupported: string }} the verdict, or which of
 * the two it could not read
 */
function satisfies(version, range) {
  const operator = range.startsWith(CARET) || range.startsWith(TILDE) ? range[0] : '';
  const floorText = range.slice(operator.length);

  const floor = parseVersion(floorText);
  const actual = parseVersion(version);
  if (floor === null)
    return { unsupported: `range "${range}"` };
  if (actual === null)
    return { unsupported: `installed version "${version}"` };
  if (compareVersions(actual, floor) < 0)
    return { ok: false };

  if (operator === '')
    return { ok: compareVersions(actual, floor) === 0 };

  if (operator === TILDE) {
    // ~x.y.z allows patch bumps only.
    return { ok: actual[0] === floor[0] && actual[1] === floor[1] };
  }

  // ^x.y.z allows changes that do not modify the left-most non-zero element,
  // so ^0.5.0 is as tight as ~0.5.0 and ^0.0.3 is exact.
  if (floor[0] !== 0)
    return { ok: actual[0] === floor[0] };
  if (floor[1] !== 0)
    return { ok: actual[0] === 0 && actual[1] === floor[1] };
  return { ok: compareVersions(actual, floor) === 0 };
}

// A new workspace root is exactly the event that widens what this guard does
// not cover — a tree of newly declared dependencies, none of them root-declared
// and so none of them checked, under a line that still reads "N slot(s) OK".
// Both dependency guards share the assertion so the answer cannot differ. The
// list itself is taken rather than the assertion alone because the link branch
// below needs it: "this slot links to a workspace" is a claim about that set,
// and deriving the set here a second way is how two answers to one question get
// written.
const workspaceDirs = listWorkspaceDirs('check-toolchain-hoist');

const rootManifest = readJson('package.json');
const lock = readJson(LOCKFILE);
const lockPackages = lock.packages ?? {};

// The root package declares only devDependencies today; reading both fields
// means a future runtime dependency is covered without an edit here.
const rootDeclared = Object.entries({
  ...rootManifest.dependencies,
  ...rootManifest.devDependencies,
}).sort(([a], [b]) => a.localeCompare(b));

if (rootDeclared.length === 0) {
  console.error(
    `\ncheck-toolchain-hoist: the root package.json declares no dependencies, so this\n`
    + 'guard has nothing to assert and would report success over an empty list.\n'
    + '  fix: if the root really owns no toolchain any more, delete this guard rather\n'
    + '       than leaving it green — a check that examined nothing is not a pass.\n',
  );
  process.exit(1);
}

/** @param {string} name */
function countNestedCopies(name) {
  const suffix = `/${TOP_SLOT_PREFIX}${name}`;
  return Object.keys(lockPackages).filter(key => key.endsWith(suffix)).length;
}

/** @param {string} name @returns {string} the report's parenthetical, or ''. */
function formatNestedCopiesNote(name) {
  const nested = countNestedCopies(name);
  return nested > 0
    ? ` (+${nested} nested cop${nested === 1 ? 'y' : 'ies'} elsewhere, off the shared slot)`
    : '';
}

/** @type {string[]} */
const report = [];

for (const [name, range] of rootDeclared) {
  const slot = `${TOP_SLOT_PREFIX}${name}`;
  const entry = lockPackages[slot];

  if (entry === undefined) {
    fail(
      name,
      `the root declares ${name}@${range}, but ${LOCKFILE} has no ${slot} entry`,
      `run \`npm install\` and commit ${LOCKFILE}. If the entry is still missing, another `
      + `package has taken the ${slot} slot and this one was nested underneath it — which `
      + 'is the exact shape of the vite 8 -> 6 downgrade this guard exists to prevent. '
      + 'Declaring it at the root is what wins the slot back.',
    );
    continue;
  }

  // A sibling workspace holds the slot as a link to its directory, with the
  // version on the target entry: what is asserted is where the link points.
  if (entry.link === true) {
    const resolved = typeof entry.resolved === 'string' ? entry.resolved : null;
    const target = resolved === null ? undefined : lockPackages[resolved];

    // npm writes `name` on a workspace entry only where it differs from the
    // directory's basename, so a missing field is agreement, not a mismatch.
    const targetName = typeof target?.name === 'string'
      ? target.name
      : resolved !== null ? path.basename(resolved) : null;

    if (targetName !== name) {
      fail(
        name,
        `${LOCKFILE}'s ${slot} links to ${resolved ?? '(nothing)'}, which is not a `
        + `workspace declaring ${name}`,
        `run \`npm install\` and commit ${LOCKFILE}. The root declares ${name}@${range} to use `
        + 'the workspace in this repo; a slot linked somewhere else, or at a directory the '
        + 'lockfile has no entry for, means every root file importing it is loading something '
        + 'other than the source beside it — the same capture the version check exists for, '
        + 'in the shape a link takes.',
      );
      continue;
    }

    if (!workspaceDirs.includes(resolved)) {
      fail(
        name,
        `${LOCKFILE}'s ${slot} links to ${resolved}, which is not one of this repo's `
        + `workspaces (${workspaceDirs.join(', ')})`,
        `declare ${name} as the sibling workspace it names, run \`npm install\` and commit `
        + `${LOCKFILE}. A \`file:\` dependency on a vendored or out-of-tree copy records the `
        + 'same `{ link: true }` entry a workspace does, so "the slot is a link" alone does '
        + 'not say the root is loading the source beside it. That directory is built, '
        + 'linted and tested by nothing in this repo, while the slot reads as owned.',
      );
      continue;
    }

    if (typeof target.version !== 'string') {
      fail(
        name,
        `${LOCKFILE}'s ${slot} links to ${resolved}, whose entry records no version`,
        `delete ${LOCKFILE} and run \`npm install\` to regenerate it. The linked workspace's `
        + 'own manifest is where that version comes from, so a missing one means the entry '
        + 'is stale or hand-edited — and the alternative to refusing is a green line reporting '
        + 'this slot as `undefined`, which is an unverified slot printed like a verified one.',
      );
      continue;
    }

    report.push(
      `  ${name}@${range} -> ${slot} link -> ${resolved} ${target.version}${
        formatNestedCopiesNote(name)}`,
    );
    continue;
  }

  if (typeof entry.version !== 'string') {
    fail(
      name,
      `${LOCKFILE}'s ${slot} entry records no version`,
      `delete ${LOCKFILE} and run \`npm install\` to regenerate it. An entry with no `
      + 'version cannot be checked against the declared range, and an unverifiable slot '
      + 'is not a verified one.',
    );
    continue;
  }

  const result = satisfies(entry.version, range);

  if ('unsupported' in result) {
    fail(
      name,
      `this guard cannot evaluate ${result.unsupported}`,
      'extend `satisfies()` in scripts/check-toolchain-hoist.mjs to cover it, or state '
      + `the root range for ${name} as ^x.y.z, ~x.y.z or an exact x.y.z. The guard `
      + 'refuses what it cannot evaluate instead of assuming a pass: an unevaluated slot '
      + 'reported green is precisely the silence it was written to break.',
    );
    continue;
  }

  if (!result.ok) {
    fail(
      name,
      `${LOCKFILE} pins ${slot} at ${entry.version}, which does not satisfy the root's `
      + `declared ${name}@${range}`,
      `run \`npm install\` and commit ${LOCKFILE}. If it resolves back to ${entry.version}, `
      + `another package's harder requirement has captured the top slot and every workspace `
      + `is now building and testing against ${name}@${entry.version} — silently, because a `
      + 'hoisted downgrade breaks no install and fails no test. Either raise that package, '
      + `or pin the root range so npm nests the intruder's copy under it instead — and if any `
      + `other manifest declares ${name} too, that second edit is not root-only: `
      + `\`${AGREEMENT_GUARD}\` compares the range STRING across every manifest declaring a `
      + 'module, so the range you pin has to be written into each of them. It will report the '
      + 'range they hold today as the majority, which is the one this fix is deliberately '
      + 'leaving.',
    );
    continue;
  }

  report.push(`  ${name}@${range} -> ${slot} ${entry.version}${formatNestedCopiesNote(name)}`);
}

if (failures.length > 0) {
  console.error(
    `\ncheck-toolchain-hoist: ${failures.length} problem(s) in ${LOCKFILE}\n\n`
    + `${failures.map(f => `  ✗ ${f}`).join('\n\n')}\n`,
  );
  process.exit(1);
}

console.log(
  `check-toolchain-hoist: ${report.length} root-declared slot(s) OK\n${report.join('\n')}`,
);
