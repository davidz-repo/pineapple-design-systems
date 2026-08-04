#!/usr/bin/env node
// Toolchain-agreement guard: two manifests that declare the same
// `devDependencies` module must declare it with the SAME range string.
//
// `check-toolchain-hoist` asks package-lock.json which package owns each top
// `node_modules/` slot the ROOT declares, and its header names what that green
// line does not mean: `typescript`, `vitest` and `tsup` are pinned per package
// rather than at the root, so no slot of theirs is root-declared and nothing
// there would notice two workspaces building on different majors of them. This
// file is that sentence turned into an assertion.
//
// The failure is quiet for the same structural reason the vite 8 -> 6 downgrade
// was quiet: nothing else in this build ever compares one workspace's manifest
// with another's. Bump `packages/box` to `typescript@~5.8.0` in the PR that
// needed one 5.8 fix, and npm installs that copy nested under `box` while every
// other workspace goes on compiling under 5.7. Nothing fails. `box` builds,
// typechecks and tests on 5.8; its nineteen siblings do the same on 5.7; the
// unfiltered `turbo run build lint test typecheck` prints one green line over
// both. The same edit to `vitest` splits the test runner two ways, and to
// `tsup` the bundler that produces what consumers actually download — a
// difference in emitted output that no step of this build is comparing.
//
// THE ROOT IS A DECLARER
//
// Not merely the container of the workspaces: the root manifest's
// `devDependencies` enter the same comparison as everyone else's. `eslint` is
// why. The root declares `^10.1.0` for its own `//#lint:scripts` task and the
// workspaces declare it for theirs, and "the root lints `scripts/` under a
// different eslint major than the packages lint their sources under" is exactly
// the disagreement this guard is about — sitting in the one manifest a
// workspace walk would have skipped.
//
// THE RANGE STRING, NOT THE RANGE
//
// Identity is on the TEXT, deliberately: `^19.0.0` and `^19.0.8` are a failure
// here even though they intersect and npm can satisfy both from a single
// installed copy.
//
// Intersection is a claim about npm's RESOLVER, and checking it means
// re-implementing semver comparison here and then deciding what "overlapping
// enough" is for two ranges that agree on part of their span — a second, worse
// resolver, arriving at an answer only the real one can settle, in the guard
// whose whole subject is that nobody wrote the same thing twice. String
// identity is a claim about the repo's INTENT: one decision, written out in
// every manifest that has an opinion about it. It is checkable by `grep`, by a
// reviewer reading a diff, and by the four lines below. And it is a predicate
// the repo already satisfies — every module declared by two or more manifests
// today is declared with one range string — so the strictness costs nothing to
// adopt, and the day it fails the fix is to state the string the majority
// already states.
//
// WHAT IT DELIBERATELY DOES NOT PROVE
//
//   - AGREEMENT IS NOT CORRECTNESS. Twenty-one manifests agreeing on a wrong or
//     ancient range pass here in the same words as twenty-one agreeing on the
//     right one. This guard reads INTENT — what the manifests ask for — where
//     `check-toolchain-hoist` reads OUTCOME: what `npm ci` will actually put in
//     a slot, for the slots the root declares. Neither implies the other, which
//     is why they are two files: agreeing manifests can still resolve to a copy
//     nobody wanted, and a correct slot says nothing about the nineteen ranges
//     that never competed for one.
//   - SINGLE-DECLARER MODULES ARE UNEXAMINED. A module exactly one manifest
//     declares has nobody to disagree with — `turbo` and the changesets CLI at
//     the root, each workspace dependency the gallery alone lists — so it is
//     outside the assertion by construction rather than by exemption. That is
//     also what makes this guard LIST-FREE, in `check-token-drift`'s sense and
//     `check-peer-placement`'s: the subject is derived from the manifests on
//     every run, never a `['typescript', 'vitest', 'tsup']` written down here,
//     because the module somebody forgets to add to such a list is the one that
//     has just moved. The price is the same one `check-peer-placement` pays and
//     names: a module drops out of the subject in the same edit that leaves it
//     with a single declarer.
//   - `dependencies` AND `peerDependencies` ARE OUT OF SCOPE, and that is a
//     boundary rather than a field nobody thought of. WHERE a peer module is
//     declared is `check-peer-placement`'s assertion and whether it stayed out
//     of `dist/` is `check-peer-externals`'; peer RANGES are a non-proof
//     `check-peer-placement` names out loud, in the pass line it prints them on
//     ("names only — the ranges beside them are unexamined"). Absorbing them
//     here quietly would give that sentence a second and contradicting answer.
//     They are also a different KIND of range: a peer range is the
//     compatibility window this repo offers a CONSUMER, and it is meant to be
//     wider than the version the repo itself builds against — `eslint` is
//     peered `^10.0.0` by `@pineappleui/eslint-config` and dev-declared
//     `^10.1.0` by everyone, which is two correct statements about two
//     different questions. "Identical string" is the wrong predicate over that
//     field, not merely one this file skips.
//
// REFUSALS
//
// Loud refusal over silent pass, on each of the ways this guard can end up
// asserting nothing: no workspace discovered at all; no module declared by two
// or more manifests, which is an assertion set with nothing in it; and a
// `devDependencies` field that is not the map of name to range npm reads,
// naming the manifest. A range that is not a string is refused with it — two
// manifests holding `5` and `"5"` compare unequal and print as the same
// character, which is a failure message that cannot be acted on.
//
// Reads manifests only — the root's and one per workspace `listWorkspaceDirs()`
// returns, no `dist/`, no sources — so it runs BEFORE `turbo run build` in both
// `verify` and CI, next to the hoist guard whose residual it closes.
//
//   node scripts/check-toolchain-agreement.mjs

import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { listWorkspaceDirs } from './workspace-globs.mjs';

const GUARD_NAME = 'check-toolchain-agreement';

const MANIFEST = 'package.json';
const FIELD = 'devDependencies';

// The guard on the other side of the intent/outcome line, named in the fix
// because "which range is right" is often answered by what the lockfile already
// installed.
const HOIST_GUARD = 'check-toolchain-hoist';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @type {string[]} */
const failures = [];

/**
 * A condition under which this guard has nothing to compare: it exits
 * immediately rather than printing a pass over an assertion set it never built.
 *
 * @param {string} message problem and fix, already formatted
 * @returns {never} the process is gone before a caller resumes
 */
function refuse(message) {
  console.error(`\n${GUARD_NAME}: ${message}\n`);
  process.exit(1);
}

/**
 * @param {string} subject the module the problem is about
 * @param {string} problem
 * @param {string} fix
 */
function fail(subject, problem, fix) {
  failures.push(`${subject}: ${problem}\n    fix: ${fix}`);
}

/**
 * `JSON.parse`, with the file named in any error it throws — a bare
 * `SyntaxError: Unexpected token }` says nothing about which of twenty-one
 * manifests produced it, and they are read in a loop that names none of them.
 *
 * Manifests are strict JSON to npm, so no comment stripping: this reads exactly
 * what npm reads. Written out here rather than imported from a sibling guard
 * for the reason `check-peer-placement`'s copy gives — `workspace-globs` is the
 * one module the guards share, and a second import edge between two guards is a
 * coupling neither one's header claims.
 *
 * @param {string} filePath absolute
 * @returns {Record<string, unknown>} the parsed manifest
 */
function readJson(filePath) {
  const text = readFileSync(filePath, 'utf8');

  try {
    return JSON.parse(text);
  }
  catch (cause) {
    throw new Error(`${filePath} is not valid JSON: ${cause.message}`, { cause });
  }
}

/**
 * One manifest's `devDependencies`, as name/range pairs.
 *
 * An absent field is an empty list — a workspace is free to declare none. A
 * field of any other shape, or one holding a range that is not a string, is
 * REFUSED rather than coerced: every entry in it is an entry this guard would
 * otherwise have compared, and a manifest shape nothing here understands is the
 * last place to guess.
 *
 * @param {string} relPath the manifest, repo-root-relative, for the refusal
 * @param {Record<string, unknown>} manifest
 * @returns {[string, string][]} sorted by name, so output reads the same on
 * every machine
 */
function readDeclaredRanges(relPath, manifest) {
  const declared = manifest[FIELD];

  if (declared === undefined)
    return [];

  if (typeof declared !== 'object' || declared === null || Array.isArray(declared)) {
    refuse(
      `${relPath} declares \`${FIELD}\` as ${Array.isArray(declared) ? 'an array' : typeof declared},\n`
      + 'and npm reads that field as a map of name to range.\n'
      + `  fix: write \`"${FIELD}": { "<name>": "<range>" }\`, or drop the field. It is refused\n`
      + '       rather than skipped because every name in it is a name this guard would\n'
      + '       otherwise have compared against every other manifest here, and a manifest\n'
      + '       skipped quietly is a declarer whose disagreement nobody reads.',
    );
  }

  const unreadable = Object.entries(declared).filter(([, range]) => typeof range !== 'string');

  if (unreadable.length > 0) {
    refuse(
      `${relPath} declares ${unreadable.length} \`${FIELD}\` range(s) that are not strings:\n`
      + `${unreadable.map(([name, range]) => `         ${name}: ${JSON.stringify(range)}\n`).join('')}`
      + '  fix: state each range as the string npm reads — `"^1.2.3"`, `"~1.2.3"`, `"*"`. This\n'
      + '       guard compares range strings for identity, and a range of another type is\n'
      + `       refused rather than stringified: \`5\` and \`"5"\` would compare as a\n`
      + '       DISAGREEMENT and then print as the same character, which is a failure nobody\n'
      + '       can act on.',
    );
  }

  return /** @type {[string, string][]} */ (
    Object.entries(declared).sort(([a], [b]) => a.localeCompare(b))
  );
}

// Taken for the walk, not for a membership test: this guard's subject is every
// manifest npm installs, and a workspace missing from the discovery is a
// declarer whose disagreement goes unread under the same green line. The
// assertion inside comes with it.
const workspaceDirs = listWorkspaceDirs(GUARD_NAME);

if (workspaceDirs.length === 0) {
  refuse(
    'found no workspaces in the root package.json globs.\n'
    + '  fix: run `npm install` so package-lock.json lists them. With no workspace the only\n'
    + `       manifest left is the root's, one manifest disagrees with nobody, and this guard\n`
    + '       would print a pass having compared a set of one.',
  );
}

/**
 * Every manifest that declares a toolchain: the root first — it declares
 * `eslint` for `//#lint:scripts` exactly as the workspaces declare it for their
 * own lint, and skipping it would leave the repo's most-shared module with one
 * declarer outside the comparison — then one per workspace.
 *
 * @type {{ relPath: string, declared: [string, string][] }[]}
 */
const manifests = [MANIFEST, ...workspaceDirs.map(relDir => `${relDir}/${MANIFEST}`)]
  .map(relPath => ({
    relPath,
    declared: readDeclaredRanges(relPath, readJson(path.join(repoRoot, relPath))),
  }));

/**
 * Module name -> every manifest declaring it, with the range each one states.
 *
 * @type {Map<string, { relPath: string, range: string }[]>}
 */
const declarers = new Map();

for (const { relPath, declared } of manifests) {
  for (const [name, range] of declared) {
    const declared_ = declarers.get(name);
    if (declared_ === undefined)
      declarers.set(name, [{ relPath, range }]);
    else
      declared_.push({ relPath, range });
  }
}

/**
 * The assertion set: the modules two or more manifests declare. Everything else
 * has nobody to disagree with, which is what makes this list-free.
 *
 * @type {[string, { relPath: string, range: string }[]][]}
 */
const shared = [...declarers]
  .filter(([, list]) => list.length > 1)
  .sort(([a], [b]) => a.localeCompare(b));

if (shared.length === 0) {
  refuse(
    `no module is declared in \`${FIELD}\` by two or more manifests, so this guard has\n`
    + 'nothing to compare and would report success over an empty assertion set.\n'
    + `  read: ${manifests.length} ${MANIFEST}(s) — the root's and one per workspace\n`
    + '  fix: if the toolchain really moved somewhere this guard cannot see — a generator,\n'
    + '       a single hoisted manifest, one workspace left standing — then its subject is\n'
    + '       gone and it must not go on printing a pass over nothing: delete it, or teach\n'
    + '       it where the ranges are declared now. Every module having exactly one\n'
    + '       declarer is not a repo whose toolchain agrees; it is a repo where nothing\n'
    + '       here was ever asked.',
  );
}

/**
 * The declarers of one module, grouped by the range they state, most-held
 * range first — the shape a failure has to print, because "who says what" is
 * the whole content of the disagreement.
 *
 * @param {{ relPath: string, range: string }[]} list
 * @returns {[string, string[]][]} range -> the manifests stating it
 */
function groupByRange(list) {
  /** @type {Map<string, string[]>} */
  const byRange = new Map();

  for (const { relPath, range } of list) {
    const stated = byRange.get(range);
    if (stated === undefined)
      byRange.set(range, [relPath]);
    else
      stated.push(relPath);
  }

  return [...byRange].sort(
    ([rangeA, a], [rangeB, b]) => b.length - a.length || rangeA.localeCompare(rangeB),
  );
}

/**
 * Which range to state everywhere, where the counts answer that — and where
 * they do not, that they do not.
 *
 * A tie is worth saying out loud: the usual failure is one manifest bumped in a
 * PR that needed one fix, and there the majority is the range to restore. Two
 * equal camps is a different situation, and printing the first of them as "the
 * majority" would be this guard picking a side by sort order.
 *
 * @param {[string, string[]][]} groups from `groupByRange`, ordered
 * @param {number} total how many manifests declare the module
 * @returns {string} a clause, ready to sit inside the fix
 */
function majorityClause(groups, total) {
  const [[topRange, topStaters]] = groups;
  const tied = groups.filter(([, staters]) => staters.length === topStaters.length);

  if (tied.length > 1) {
    return `no range holds a majority — ${tied.length} of them tie at ${topStaters.length} `
      + 'declarer(s) each, so this is a decision to make rather than a stray bump to revert';
  }

  return `\`${topRange}\` is the majority, held by ${topStaters.length} of the ${total} `
    + 'manifest(s) declaring it';
}

for (const [name, list] of shared) {
  const groups = groupByRange(list);

  if (groups.length === 1)
    continue;

  // One line per range, so the disagreement reads as the camps it is rather
  // than as a list of manifests the reader has to sort by hand.
  const camps = groups
    .map(([range, staters]) => `           ${range} (${staters.length}): ${staters.join(', ')}`)
    .join('\n');

  const majority = majorityClause(groups, list.length);

  fail(
    name,
    `${list.length} manifest(s) declare it in \`${FIELD}\`, at ${groups.length} different `
    + `ranges\n${camps}`,
    `pick ONE range and state that exact string in every manifest above — ${majority}. npm `
    + `installs the minority's copy nested under the workspaces holding it, so those build, `
    + `test and lint against a different \`${name}\` than `
    + 'the rest of the repo — and every task stays green on both sides of the skew, because '
    + 'nothing else in this build compares one workspace\'s manifest with another\'s. If the '
    + 'ranges only differ in their floor, the version already installed is the tiebreaker '
    + `\`${HOIST_GUARD}\` reads out of package-lock.json. Identity is on the range STRING here, `
    + `so \`^1.2.0\` and \`^1.2.3\` fail even though npm can satisfy both from one copy: one `
    + `decision written in ${list.length} places is checkable by grep, where "do these two `
    + 'ranges overlap enough" is a re-implementation of the resolver.',
  );
}

if (failures.length > 0) {
  console.error(
    `\n${GUARD_NAME}: ${failures.length} module(s) declared at more than one range\n\n`
    + `${failures.map(entry => `  ✗ ${entry}`).join('\n\n')}\n`,
  );
  process.exit(1);
}

// What was actually compared, named rather than counted: a manifest that stops
// declaring a toolchain drops out of the first count, and a module that drops to
// one declarer moves from the agreed line to the unexamined one. Both are this
// guard covering less under a pass line that would otherwise read identically.
const declaringManifests = manifests.filter(({ declared }) => declared.length > 0);

const agreed = shared
  .map(([name, list]) => `${name}@${list[0].range}(${list.length})`)
  .join(', ');

const singleDeclarer = [...declarers]
  .filter(([, list]) => list.length === 1)
  .map(([name]) => name)
  .sort();

console.log(
  `${GUARD_NAME}: ${shared.length} shared module(s) agree across ${declaringManifests.length} of `
  + `${manifests.length} manifest(s) read\n`
  + `  agreed (name@range, declarers): ${agreed}\n`
  + `  declared by one manifest, so nothing to disagree with (unexamined): ${
    singleDeclarer.join(', ') || 'none'}`,
);
