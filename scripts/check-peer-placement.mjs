#!/usr/bin/env node
// Peer-placement guard: a module ANY workspace declares in `peerDependencies`
// may appear in NO publishable workspace's `dependencies` — or its
// `optionalDependencies`, which npm installs by default and which therefore
// ships the identical second copy under a field name that reads as if it might
// not.
//
// docs/plan.md principle 3 says React and Radix stay peers and stay external.
// `check-peer-externals` holds the "stay external" half, and its assertion D
// holds one half of the other: every module a package uses at runtime must be
// declared — "as a peer OR a dependency". That `or` is not sloppiness, it is D's
// subject: D is about an UNDECLARED module, and for THAT question either field
// is an answer. WHICH of the two a module is declared in is the question D never
// asks. This file is that question.
//
// It is not a filing preference. A module the repo asks the CONSUMER to supply
// is consumer-supplied by definition, and the peer declaration is the whole of
// what keeps npm from installing a second copy into their tree. Declare the same
// module in a field of that package npm installs anyway — `dependencies`, or
// `optionalDependencies`, where "optional" describes what happens when the
// install FAILS rather than whether npm attempts it — and a copy lands beside
// the one they already have: two Reacts, two module registries, two sets of hook
// state. What the consumer sees is the duplicate-React "invalid hook call"
// principle 3 is written about — in their stack trace, in their repo, with
// nothing in this one having failed. The package builds, its own tests pass
// (they import `src/`), the tarball is well formed, and
// `check-publish-contract` reads manifest fields without an opinion on what is
// in them.
//
// WHERE THE MISFILING HIDES
//
// In a package with NO JSX. `check-peer-externals` counts JSX as a runtime use
// of the JSX import source, which is what puts `react` in front of its
// assertions for all eleven Phase 2 wrappers even though none of them names it.
// A hooks-only package — `use-local-storage` — has no JSX, so it emits no
// `react/jsx-runtime` import for that heuristic to see; its `react` is an
// ordinary import, and assertion D is satisfied by a misfiled `dependencies`
// entry exactly as happily as by a peer. The quietest package in the repo is
// therefore the one where the loudest failure is written, and the guard for it
// has to read placement rather than presence.
//
// NO LIST OF MODULE NAMES
//
// The predicate is "is anyone's peer", derived from the manifests on every run
// — never `['react', 'react-dom', '@radix-ui/themes']` written down here. A list
// is a thing to forget to extend, and the module somebody forgets is the one
// that has just moved. This is `check-token-drift`'s rule applied to peers: read
// the vocabulary from where it is defined, and the definition site is the union
// of what the workspaces themselves declare.
//
// One consequence has to be said out loud, because it reads as a hole until it
// is: a workspace dependency in `dependencies` is LEGAL here precisely while
// nobody declares it a peer. `@pineappleui/theme` depends on
// `@pineappleui/tokens` and `@pineappleui/use-local-storage` — a decided choice,
// theme ships them for the consumer rather than asking the consumer for them —
// and this guard has no opinion about it. The day any package declares `tokens`
// a peer, the same manifests make theme's entry a failure here, with no edit to
// this file.
//
// WHAT IT DELIBERATELY DOES NOT PROVE
//
//   - `devDependencies` are unexamined, in every workspace. They do not ship:
//     `files: ["dist"]` never carries a story, which is why the seven packages
//     whose story picker imports `@pineappleui/tokens` declare it there.
//   - PRIVATE workspaces' installed fields are unexamined. Nothing of theirs
//     reaches a consumer's tree, so a peer sitting in one is not a second copy
//     of anything. `@pineappleui/vitest-preset` declares `react` and `react-dom`
//     as dependencies today — the docs/plan.md delta that exists because there is
//     no app workspace to hoist them — and it is legal exactly while that package
//     stays private. Assertion 3 below still runs over them, because "both at
//     once" is nonsense in any manifest.
//   - TRANSITIVE peers are npm's job. `@pineappleui/theme` depends on
//     `@pineappleui/use-local-storage`, whose own `react` peer the consumer has
//     to satisfy; npm reports an unmet peer at install time, and re-deriving that
//     here would be a second, worse resolver.
//   - `bundleDependencies`/`bundledDependencies` is not read, and that omission
//     is a decision rather than a field nobody thought of. Nobody declares one
//     today, and it ships by a different MECHANISM: its names are inlined into
//     the tarball at pack time rather than installed from the registry when the
//     consumer installs the package, so what it duplicates and what an install
//     resolves are different questions from the one asked here. Widening to it
//     is a separate argument, and this sentence is what says so. The two fields
//     npm installs by DEFAULT — `dependencies` and `optionalDependencies` — are
//     both read, because for the question this guard asks they are the same
//     field with two names.
//
// Three assertions, and each failure names the module, the manifest and the fix:
//
//   1. UNION — every name any workspace declares in `peerDependencies`, private
//      workspaces included, together with who declares it. A private workspace's
//      peer is as much a statement that the consumer supplies the module as a
//      publishable one's.
//   2. MISFILED — no publishable workspace lists a name from that union in
//      either field npm installs, `dependencies` or `optionalDependencies`. The
//      failure names WHICH of the two it was found in, because that is the line
//      to edit.
//   3. CONTRADICTORY — no workspace, private included, lists one name in BOTH
//      its `peerDependencies` and either installed field. Checked first, and a
//      pair it reports is not reported again by 2: one edit gets one failure,
//      and the more specific diagnosis is the one worth printing.
//
// Reads manifests only — one `package.json` per workspace `listWorkspaceDirs()`
// returns, no `dist/`, no sources — so it runs BEFORE `turbo run build` in both
// `verify` and CI.
//
// A union of nothing is compared against nothing, so an empty peer set REFUSES
// rather than reporting a pass over every dependency in the repo. So does a run
// that discovers no workspaces, or no publishable ones: each of those is this
// guard having asked nobody for anything, in the same green words it uses when
// it asked everybody.
//
//   node scripts/check-peer-placement.mjs

import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { listWorkspaceDirs } from './workspace-globs.mjs';

const GUARD_NAME = 'check-peer-placement';

const MANIFEST = 'package.json';
const PEER_FIELD = 'peerDependencies';

// The fields npm installs by DEFAULT, which is the whole of why both are here.
// `optionalDependencies` is not opt-in: npm installs it like `dependencies` and
// merely tolerates a failure, so a peer misfiled into it lands the same second
// copy in the consumer's tree — and under a field name that reads as if it
// might not have.
const DEPENDENCY_FIELDS = ['dependencies', 'optionalDependencies'];

/** The pair spelled out, for the prose that has to name both. */
const DEPENDENCY_FIELDS_PHRASE = DEPENDENCY_FIELDS.map(field => `\`${field}\``).join(' or ');

// Where the other half of principle 3 is written, named in the fix because
// moving a module to `peerDependencies` without listing it there leaves tsup
// free to inline the copy the move was meant to stop.
const TSUP_CONFIG = 'tsup.config.ts';
const EXTERNAL_FIELD = 'external';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @type {string[]} */
const failures = [];

/**
 * A condition under which this guard has nothing to assert over: it exits
 * immediately rather than printing a pass over a set it never compared.
 *
 * @param {string} message problem and fix, already formatted
 * @returns {never} the process is gone before a caller resumes
 */
function refuse(message) {
  console.error(`\n${GUARD_NAME}: ${message}\n`);
  process.exit(1);
}

/**
 * @param {string} subject the workspace the problem is about
 * @param {string} problem
 * @param {string} fix
 */
function fail(subject, problem, fix) {
  failures.push(`${subject}: ${problem}\n    fix: ${fix}`);
}

/**
 * The module names one manifest field declares.
 *
 * An absent field is an empty list — most workspaces here declare no
 * `dependencies` at all. A field of any other shape is REFUSED rather than
 * coerced: npm reads a dependency map and nothing else, so a field this cannot
 * read is a field whose names went unchecked, and skipping it would be a pass
 * over exactly the manifest that is already unusual.
 *
 * @param {string} relDir the workspace, for the refusal message
 * @param {Record<string, unknown>} manifest
 * @param {string} field
 * @returns {string[]} sorted, so a failure list reads the same on every machine
 */
function readDeclaredNames(relDir, manifest, field) {
  const declared = manifest[field];

  if (declared === undefined)
    return [];

  if (typeof declared !== 'object' || declared === null || Array.isArray(declared)) {
    refuse(
      `${relDir}/${MANIFEST} declares \`${field}\` as ${Array.isArray(declared) ? 'an array' : typeof declared},\n`
      + 'and npm reads that field as a map of name to range.\n'
      + `  fix: write \`"${field}": { "<name>": "<range>" }\`, or drop the field. It is refused\n`
      + '       rather than skipped because every name in it is a name this guard would\n'
      + '       otherwise have compared, and a manifest shape nothing here understands is the\n'
      + '       last place to guess.',
    );
  }

  return Object.keys(declared).sort();
}

const workspaceDirs = listWorkspaceDirs(GUARD_NAME);

if (workspaceDirs.length === 0) {
  refuse(
    'found no workspaces in the root package.json globs.\n'
    + '  fix: run `npm install` so package-lock.json lists them. Zero workspaces is a guard\n'
    + '       that read no manifest at all, not a repo whose manifests are clean.',
  );
}

/**
 * Every workspace, as the fields this guard compares.
 *
 * The installed fields stay SEPARATE rather than merged into one list: every
 * failure below has to name the field it found the module in, because "delete
 * this `optionalDependencies` entry" and "delete this `dependencies` entry" are
 * edits to different lines of the manifest, and a message that named neither
 * would leave the reader diffing the two fields by hand.
 *
 * @type {{ relDir: string, name: string, isPublishable: boolean, peers: string[], installedFields: { field: string, names: string[] }[] }[]}
 */
const workspaces = workspaceDirs.map((relDir) => {
  const manifest = JSON.parse(readFileSync(path.join(repoRoot, relDir, MANIFEST), 'utf8'));

  return {
    relDir,
    name: manifest.name ?? relDir,
    // The same reading `check-publish-contract` uses: `private` is what decides
    // whether anything here ever lands in someone else's node_modules.
    isPublishable: !manifest.private,
    peers: readDeclaredNames(relDir, manifest, PEER_FIELD),
    installedFields: DEPENDENCY_FIELDS.map(field => ({
      field,
      names: readDeclaredNames(relDir, manifest, field),
    })),
  };
});

/**
 * Every name a workspace declares in any field npm installs, in field order.
 *
 * @param {{ installedFields: { names: string[] }[] }} workspace
 * @returns {string[]} `dependencies` first, then `optionalDependencies`, each sorted
 */
function declaredInstalledNames(workspace) {
  return workspace.installedFields.flatMap(({ names }) => names);
}

// ---------------------------------------------------------------------------
// Assertion 1 — the union, and who declares each member.
// ---------------------------------------------------------------------------

/**
 * Module name -> the workspaces declaring it a peer, as workspace records rather
 * than names: assertion 2's fix asks whether every one of them is PRIVATE, which
 * a list of strings cannot answer.
 *
 * @type {Map<string, { name: string, isPublishable: boolean }[]>}
 */
const peerDeclarers = new Map();

for (const workspace of workspaces) {
  for (const name of workspace.peers) {
    const declarers = peerDeclarers.get(name);
    if (declarers === undefined)
      peerDeclarers.set(name, [workspace]);
    else
      declarers.push(workspace);
  }
}

if (peerDeclarers.size === 0) {
  refuse(
    `no workspace declares a \`${PEER_FIELD}\` at all, so this guard would forbid nothing\n`
    + `to nobody and report success over every ${DEPENDENCY_FIELDS_PHRASE} entry in the repo.\n`
    + `  read: ${workspaces.length} ${MANIFEST}(s), across ${workspaceDirs.length} workspace(s)\n`
    + '  fix: if the packages here stopped declaring React and Radix as peers — a codemod, a\n'
    + '       move to a shared manifest generator — this guard has lost its subject and the\n'
    + `       real failure is upstream of it: docs/plan.md §3 says what \`${PEER_FIELD}\`\n`
    + '       is for. If the repo genuinely publishes nothing a consumer supplies any more,\n'
    + '       delete this guard rather than leaving it passing over a union it can no longer\n'
    + '       build.',
  );
}

const publishable = workspaces.filter(workspace => workspace.isPublishable);
const privateWorkspaces = workspaces.filter(workspace => !workspace.isPublishable);

if (publishable.length === 0) {
  refuse(
    `every one of the ${workspaces.length} workspace(s) here is private, so assertion 2 — the\n`
    + 'one this guard exists for — has no manifest to hold.\n'
    + `  fix: this guard forbids a peer module in a PUBLISHABLE workspace's ${DEPENDENCY_FIELDS_PHRASE},\n`
    + '       because those are the fields that land in a consumer\'s node_modules. With nothing\n'
    + '       publishable it would print the same pass having compared nothing. If the repo\n'
    + '       has stopped publishing, delete this guard along with the release pipeline; if a\n'
    + '       manifest lost its `publishConfig` by accident, that is the bug.',
  );
}

/**
 * The clause that says an `optionalDependencies` entry is not opt-in, appended
 * only where that is the field at fault — `dependencies` needs no such warning,
 * and carrying it there anyway would read as boilerplate.
 *
 * @param {string} field the field the module was found in
 * @returns {string} empty for `dependencies`
 */
function noteOnOptionality(field) {
  if (field === 'dependencies')
    return '';
  return ` (npm installs \`${field}\` by default — "optional" describes what happens when that `
    + 'install FAILS, not whether it is attempted)';
}

// ---------------------------------------------------------------------------
// Assertion 3 — one workspace, one module, a peer and an installed field.
//
// Run before assertion 2 so the pair it reports is reported once, with the
// diagnosis that fits: the contradiction is inside a single manifest and the fix
// is to pick a field, where assertion 2's fix is about what a SIBLING workspace
// says the consumer supplies.
// ---------------------------------------------------------------------------

/** @type {Set<string>} `<relDir>\0<module>` pairs assertion 3 has already reported */
const contradictoryPairs = new Set();

for (const workspace of workspaces) {
  for (const { field, names } of workspace.installedFields) {
    for (const name of names) {
      if (!workspace.peers.includes(name))
        continue;

      contradictoryPairs.add(`${workspace.relDir}\0${name}`);

      fail(
        `${workspace.name} (${workspace.relDir}/${MANIFEST})`,
        `declares \`${name}\` in BOTH \`${PEER_FIELD}\` and \`${field}\``,
        `keep exactly one. The peer entry says the consumer supplies \`${name}\`; the `
        + `\`${field}\` entry has npm install it here regardless${noteOnOptionality(field)}, so `
        + 'the copy this package brings is the one its own imports resolve to and the '
        + 'consumer\'s copy sits beside it — which is the duplicate the peer entry was written '
        + 'to prevent, with a line in the manifest that reads as preventing it. Delete the '
        + `\`${field}\` entry if the consumer supplies it (and list \`${name}\` in `
        + `${TSUP_CONFIG}'s \`${EXTERNAL_FIELD}\`); delete the peer entry, in a commit that says `
        + 'why, if this package must own its copy.',
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Assertion 2 — a peer of anyone, in a field anything published installs.
// ---------------------------------------------------------------------------

for (const workspace of publishable) {
  for (const { field, names } of workspace.installedFields) {
    for (const name of names) {
      const declarers = peerDeclarers.get(name);
      if (declarers === undefined)
        continue;
      if (contradictoryPairs.has(`${workspace.relDir}\0${name}`))
        continue;

      fail(
        `${workspace.name} (${workspace.relDir}/${MANIFEST})`,
        `declares \`${name}\` in \`${field}\`, and ${declarers.length} workspace(s) `
        + `declare it in \`${PEER_FIELD}\`: ${declarers.map(declarer => declarer.name).join(', ')}`,
        `move \`${name}\` from \`${field}\` to \`${PEER_FIELD}\` in `
        + `${workspace.relDir}/${MANIFEST}, and list it in ${workspace.relDir}/${TSUP_CONFIG}'s `
        + `\`${EXTERNAL_FIELD}\` array — both halves, per docs/plan.md §3. A module this repo `
        + `asks the consumer to supply is consumer-supplied everywhere: declared in \`${field}\` `
        + `of a package they install${noteOnOptionality(field)}, npm installs a SECOND copy into `
        + 'their tree beside the one they already have. For `react` that is two module registries '
        + 'and two sets of hook state — an "invalid hook call" in the consumer\'s app, in their '
        + 'stack trace, nowhere near this commit. If this package genuinely must own its own '
        + 'copy, the peer declarations above are what to change, in a commit that argues it.',
      );
    }
  }
}

if (failures.length > 0) {
  console.error(
    `\n${GUARD_NAME}: ${failures.length} misfiled peer module(s)\n\n`
    + `${failures.map(entry => `  ✗ ${entry}`).join('\n\n')}\n`,
  );
  process.exit(1);
}

const declaringPeers = workspaces.filter(workspace => workspace.peers.length > 0);

// What was actually compared, named rather than counted: the failure this guard
// is about is one entry in one of these lists, so a reader asking whether it
// read the right manifests can read them off the pass line. A publishable
// workspace dropping out of the second line is this count going quiet the way
// `check-peer-externals`' stylesheet count would.
const withDependencies = publishable.filter(workspace => declaredInstalledNames(workspace).length > 0);

const peerSummary = [...peerDeclarers]
  .map(([name, declarers]) => `${name}(${declarers.length})`)
  .sort()
  .join(', ');

const dependencySummary = withDependencies
  .map(workspace => `${workspace.name} [${declaredInstalledNames(workspace).join(', ')}]`)
  .join(', ');

console.log(
  `${GUARD_NAME}: ${peerDeclarers.size} peer module(s) across ${declaringPeers.length} `
  + 'workspace(s), no publishable dependency misfiles one\n'
  + `  peers: ${peerSummary}\n`
  + `  ${publishable.length} publishable workspace(s), ${withDependencies.length} declaring `
  + `${DEPENDENCY_FIELDS_PHRASE}: ${dependencySummary || 'none'}\n`
  + `  private, ${DEPENDENCY_FIELDS_PHRASE} not examined: `
  + `${privateWorkspaces.map(workspace => workspace.name).join(', ') || 'none'}`,
);
