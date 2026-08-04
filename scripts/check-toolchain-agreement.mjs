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
// The failure is quiet for the same kind of structural reason the vite 8 -> 6
// downgrade was quiet — a question nothing in this build was asking — though
// not the same question, and not the same shape: `vite` had no declarer at all,
// so one hoist decided what every workspace ran, where here each declarer gets
// a copy its own range accepts and what is lost is that they are not the same
// copy. Nothing else in this build ever compares one workspace's manifest with
// another's. Bump `packages/box` to `typescript@~5.8.0` in the PR that
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
//   - AGREEMENT AMONG DECLARERS IS NOT EVERY WORKSPACE DECLARING. The subject is
//     the manifests that state a range for a module, and a workspace stating
//     none makes no claim for this guard to compare: it takes whatever holds the
//     top slot, which is the `vite` shape exactly — used everywhere, declared
//     nowhere, and so decided by the first package that did declare one.
//     Nineteen of the twenty-one manifests declare `typescript`; the two that
//     do not — the root and `packages/eslint-config`, neither of which has a
//     TypeScript source to compile — are legitimately silent rather than
//     disagreeing. So a module can be unanimous here and still be resolved for
//     part of the repo by a decision nobody wrote down. The pass line's "21 of 21
//     manifest(s) read" is a count of manifests READ, not of declarers of any
//     one module — that number is the parenthesis beside each name.
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
//     with a single declarer. There is a second exit of the same shape, through
//     the FIELD rather than the count — move a module from `devDependencies` to
//     `dependencies` in enough manifests and it leaves this guard's subject
//     without ever being deleted, green on the way out.
//   - `dependencies` AND `peerDependencies` ARE OUT OF SCOPE, and that is a
//     boundary rather than a field nobody thought of.
//     A `dependencies` range TRAVELS WITH THE PACKAGE: it is installed into a
//     consumer's tree by an `npm install` of the published tarball, so what it
//     must satisfy is a question about what this repo SHIPS —
//     `check-publish-contract`'s and `check-peer-placement`'s subject — rather
//     than about which toolchain the repo builds on, which is the only thing
//     asserted here.
//     For `peerDependencies`, WHERE a peer module is declared is
//     `check-peer-placement`'s assertion and whether it stayed out of `dist/` is
//     `check-peer-externals`'; peer RANGES are a non-proof
//     `check-peer-placement` names out loud, in the pass line it prints them on
//     ("names only — the ranges beside them are unexamined"). Absorbing them
//     here quietly would give that sentence a second and contradicting answer.
//     "Identical string" is also the wrong predicate over that field, and the
//     repo diverges across the two fields twice today: `eslint` is peered
//     `^10.0.0` by `@pineappleui/eslint-config` and dev-declared `^10.1.0` by 20
//     of the 21 manifests, and `vitest` is peered `^4.0.0` by
//     `@pineappleui/vitest-preset` and dev-declared `^4.1.2`. Neither of those
//     is explained by "a peer range is the window offered to a CONSUMER":
//     `check-peer-placement`'s own header says the party supplying both of those
//     peers is THIS repo. What the two fields do owe each other is CONTAINMENT
//     — the dev range falling inside the peer window, so no workspace here
//     builds against a version its own peer entry says a supplier need not have
//     — and that relation is asserted by nothing in this repo. It is a
//     candidate for `check-peer-placement`, which already reads both fields, and
//     it is going to the ledger rather than being smuggled in as a fourth
//     predicate of a guard whose subject is identity.
//
// REFUSALS
//
// Loud refusal over silent pass, on each of the ways this guard can end up
// asserting nothing: no workspace discovered at all; no module declared by two
// or more manifests, which is an assertion set with nothing in it; and a
// `devDependencies` field that is not the map of name to range npm reads,
// naming the manifest. Each of those is a missing SUBJECT, and there is nothing
// left to report but the refusal.
//
// A single range that is not a string is narrower than any of them — one entry,
// with the rest of the field still readable — so it is a FAILURE and the run
// goes on to the comparison: a defect in one manifest and a disagreement
// between two others report in the SAME run rather than one per fix. The entry
// leaves the comparison rather than being coerced into it, because two
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
 * @param {string} subject the module the problem is about, or the manifest
 * where the problem is one manifest's own
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
 * field of any other shape is REFUSED rather than coerced: every entry in it is
 * an entry this guard would otherwise have compared, and a manifest shape
 * nothing here understands is the last place to guess.
 *
 * A single range that is not a string is narrower than that — one entry of one
 * manifest, with the rest of the field still readable — so it is a FAILURE and
 * the run goes on: every disagreement in the repo reports in one run rather
 * than one per fix. The entry itself leaves the comparison, because a range
 * this guard cannot compare as text is not one it guesses at.
 *
 * @param {string} relPath the manifest, repo-root-relative, for the message
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
    fail(
      relPath,
      `declares ${unreadable.length} \`${FIELD}\` range(s) that are not strings:\n${unreadable
        .map(([name, range]) => `           ${name}: ${JSON.stringify(range)}`)
        .join('\n')}`,
      'state each range as the string npm reads — `"^1.2.3"`, `"~1.2.3"`, `"*"`. This guard '
      + 'compares range strings for identity, and a range of another type is reported rather '
      + 'than stringified: `5` and `"5"` would compare as a DISAGREEMENT and then print as the '
      + 'same character, which is a failure nobody can act on. Until it is a string the entry '
      + 'stays out of the comparison, so this manifest is not counted a declarer of that '
      + 'module and the run continues without it.',
    );
  }

  return /** @type {[string, string][]} */ (
    Object.entries(declared)
      .filter(([, range]) => typeof range === 'string')
      .sort(([a], [b]) => a.localeCompare(b))
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
 * @type {{ relPath: string, name: unknown, declared: [string, string][] }[]}
 */
const manifests = [MANIFEST, ...workspaceDirs.map(relDir => `${relDir}/${MANIFEST}`)]
  .map((relPath) => {
    const manifest = readJson(path.join(repoRoot, relPath));
    return {
      relPath,
      name: manifest.name,
      declared: readDeclaredRanges(relPath, manifest),
    };
  });

/**
 * The module names npm resolves to a DIRECTORY in this repo rather than to the
 * registry — every workspace's own `name`, taken from the manifests already
 * read so the two answers cannot differ. The root is not one: nothing links to
 * it.
 *
 * A disagreement about one of these names is a different failure from a
 * disagreement about a registry module, and the fix has to say which it is.
 *
 * @type {Set<string>}
 */
const workspaceNames = new Set(
  manifests
    .filter(({ relPath, name }) => relPath !== MANIFEST && typeof name === 'string')
    .map(({ name }) => /** @type {string} */ (name)),
);

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
 * The most-held range, together with anything level with it. One entry is a
 * majority; more than one is a tie, and the two are different both in what the
 * fix can recommend and in what npm is about to do with the camps.
 *
 * @param {[string, string[]][]} groups from `groupByRange`, ordered
 * @returns {[string, string[]][]} the leading group and its ties, in that order
 */
function findTopRanges(groups) {
  const [[, topStaters]] = groups;
  return groups.filter(([, staters]) => staters.length === topStaters.length);
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
function formatMajorityClause(groups, total) {
  const tied = findTopRanges(groups);
  const [topRange, topStaters] = tied[0];

  if (tied.length > 1) {
    return `no range holds a majority — ${tied.length} of them tie at ${topStaters.length} `
      + 'declarer(s) each, so this is a decision to make rather than a stray bump to revert';
  }

  return `${JSON.stringify(topRange)} is the majority, held by ${topStaters.length} of the ${total} `
    + 'manifest(s) declaring it';
}

/**
 * What npm actually does with the camps — the half of the failure they cannot
 * show, and a different thing depending on what the module IS.
 *
 * A module from the REGISTRY is answered with a copy: the range npm did not
 * hoist is satisfied by a second copy nested under the workspaces declaring it,
 * so two toolchains are installed and each side is right about its own.
 *
 * A module that names a WORKSPACE of this repo is answered with a link or not
 * at all: npm links the sibling directory while the declared range accepts the
 * version that workspace's manifest carries, and goes to the REGISTRY for a
 * package of that name when it does not. There is no nested copy and no skew —
 * there is a manifest that has stopped building against the source beside it.
 * `check-toolchain-hoist` splits its own messages on exactly this distinction,
 * for the same reason: a range naming a sibling is not a version question.
 *
 * @param {string} name the module the manifests disagree about
 * @param {boolean} hasMajority whether one range is held by more manifests than
 * every other — with two camps tied there is no minority whose copy gets nested
 * @returns {string} a sentence, ready to sit inside the fix
 */
function formatSkewNote(name, hasMajority) {
  if (workspaceNames.has(name)) {
    return `\`${name}\` is a workspace of this repo, so a manifest that disagrees is not `
      + 'getting a second copy: npm LINKS the workspace directory while the range a manifest '
      + `declares accepts the version \`${name}\`'s own manifest carries, and goes to the `
      + 'REGISTRY for a package of that name when it does not. So the manifest whose range has '
      + 'stopped accepting its sibling builds against whatever the registry answers with under '
      + 'that name — a published older copy, or a package this repo does not own — rather than '
      + 'against the source beside it. That is why every sibling range in `devDependencies` '
      + 'here is written `*`: it accepts whatever the sibling manifest says today. A sibling '
      + 'range in `dependencies` travels to consumers and is pinned instead — that field is '
      + '`check-publish-contract`\'s subject, and it forbids `*` there.';
  }

  if (hasMajority) {
    return `npm installs the minority's copy nested under the workspaces holding it, so those `
      + `build, test and lint against a different \`${name}\` than the rest of the repo.`;
  }

  return `npm gives one of these ranges the top \`node_modules/\` slot and installs the other `
    + `camp's copy nested under the workspaces holding it, so one camp builds, tests and lints `
    + `against a different \`${name}\` than the other.`;
}

for (const [name, list] of shared) {
  const groups = groupByRange(list);

  if (groups.length === 1)
    continue;

  // One line per range, so the disagreement reads as the camps it is rather
  // than as a list of manifests the reader has to sort by hand. The range is
  // printed QUOTED — the standard this guard's own non-string-range failure
  // states — because `"~5.7.2 "` and `"~5.7.2"` are a disagreement it reports
  // and print as the same characters without it.
  const camps = groups
    .map(([range, staters]) => `           ${JSON.stringify(range)} (${staters.length}): ${
      staters.join(', ')}`)
    .join('\n');

  const majority = formatMajorityClause(groups, list.length);
  const skew = formatSkewNote(name, findTopRanges(groups).length === 1);

  fail(
    name,
    `${list.length} manifest(s) declare it in \`${FIELD}\`, at ${groups.length} different `
    + `ranges\n${camps}`,
    `pick ONE range and state that exact string in every manifest above — ${majority}. ${skew} `
    + 'Every task stays green on both sides of that, because nothing else in this build '
    + 'compares one workspace\'s manifest with another\'s. If the '
    + 'ranges only differ in their floor, the version already installed is the tiebreaker '
    + `\`${HOIST_GUARD}\` reads out of package-lock.json. Identity is on the range STRING here, `
    + `so \`^1.2.0\` and \`^1.2.3\` fail even though npm can satisfy both from one copy: one `
    + `decision written in ${list.length} places is checkable by grep, where "do these two `
    + 'ranges overlap enough" is a re-implementation of the resolver.',
  );
}

if (failures.length > 0) {
  console.error(
    `\n${GUARD_NAME}: ${failures.length} problem(s) in the manifests' \`${FIELD}\`\n\n`
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
