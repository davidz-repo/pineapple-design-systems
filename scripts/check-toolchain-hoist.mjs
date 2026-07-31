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
// What this does NOT prove: that the toolchain is complete. The assertion is
// "every slot the root DECLARES is the one the root asked for" — a slot nobody
// declares is a slot this guard never looks at. `typescript`, `vitest`, `tsup`
// and `eslint` are pinned per-package rather than at the root, so nothing here
// would notice two workspaces building on different majors of them. That is a
// different failure (workspaces disagreeing) from the one this file exists for
// (one shared slot silently changing hands), and asserting cross-workspace
// agreement is a possible extension rather than something to read into the
// green line this prints.
//
// Reads package-lock.json rather than node_modules/ on purpose: the lockfile is
// what `npm ci` will install on every machine and in CI, so the assertion holds
// on a fresh clone with no install, and it catches a bad SLOT before anyone runs
// under it. It needs no build, so it runs first — a toolchain that got swapped
// underneath is the reason to distrust everything that runs after it.
//
//   node scripts/check-toolchain-hoist.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { assertWorkspaceGlobsUnderstood } from './workspace-globs.mjs';

const LOCKFILE = 'package-lock.json';
const TOP_SLOT_PREFIX = 'node_modules/';

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
  if (!match) return null;
  const { major, minor, patch } = match.groups;
  return [Number(major), Number(minor), Number(patch)];
}

/** @returns {number} negative if a < b */
function compareVersions(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

/**
 * Whether `version` satisfies `range`, for the range forms above.
 *
 * @param {string} version
 * @param {string} range
 * @returns {{ ok: boolean } | { unsupported: string }}
 */
function satisfies(version, range) {
  const operator = range.startsWith(CARET) || range.startsWith(TILDE) ? range[0] : '';
  const floorText = range.slice(operator.length);

  const floor = parseVersion(floorText);
  const actual = parseVersion(version);
  if (floor === null) return { unsupported: `range "${range}"` };
  if (actual === null) return { unsupported: `installed version "${version}"` };
  if (compareVersions(actual, floor) < 0) return { ok: false };

  if (operator === '') return { ok: compareVersions(actual, floor) === 0 };

  if (operator === TILDE) {
    // ~x.y.z allows patch bumps only.
    return { ok: actual[0] === floor[0] && actual[1] === floor[1] };
  }

  // ^x.y.z allows changes that do not modify the left-most non-zero element,
  // so ^0.5.0 is as tight as ~0.5.0 and ^0.0.3 is exact.
  if (floor[0] !== 0) return { ok: actual[0] === floor[0] };
  if (floor[1] !== 0) return { ok: actual[0] === 0 && actual[1] === floor[1] };
  return { ok: compareVersions(actual, floor) === 0 };
}

// A new workspace root is exactly the event that widens what this guard does
// not cover — a tree of newly declared dependencies, none of them root-declared
// and so none of them checked, under a line that still reads "N slot(s) OK".
// Both dependency guards share the assertion so the answer cannot differ.
assertWorkspaceGlobsUnderstood('check-toolchain-hoist');

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

/** @type {string[]} */
const report = [];

for (const [name, range] of rootDeclared) {
  const slot = `${TOP_SLOT_PREFIX}${name}`;
  let entry = lockPackages[slot];

  // A workspace link records its target rather than a version.
  if (entry?.link && typeof entry.resolved === 'string') {
    entry = lockPackages[entry.resolved];
  }

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
      + `or pin the root range so npm nests the intruder's copy under it instead.`,
    );
    continue;
  }

  const nested = countNestedCopies(name);
  report.push(
    `  ${name}@${range} -> ${slot} ${entry.version}`
    + (nested > 0
      ? ` (+${nested} nested cop${nested === 1 ? 'y' : 'ies'} elsewhere, off the shared slot)`
      : ''),
  );
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
