#!/usr/bin/env node
// CI-invariant guard: two pairings between .github/workflows/ci.yml and the
// root package.json that nothing in the build can fail on today.
//
// Each one is held by a comment and by whoever remembers to read it, and each
// one breaks by staying green:
//
//   1. THE TURBO CACHE SALT IS IN BOTH KEYS. The cache step carries `npm11` in
//      `key` AND in `restore-keys`, and the comment above it says why:
//      `restore-keys` is a PREFIX match, so an unsalted prefix goes on matching
//      every entry the previous salt wrote. Re-salt `key` alone — the obvious
//      one-line edit, and the one the `key` line invites — and the cache
//      restores exactly as it did before: the entries the new salt was meant to
//      discard are still matched, still replay their recorded stdout, and
//      nothing anywhere fails. The salt is inert while looking applied, which
//      is worse than not salting at all, because the next reader sees a salt
//      and concludes the stale entries are gone. This asserts the pairing
//      instead of describing it: the `restore-keys` entry must be a prefix of
//      `key`, which holds only while both carry the same salt.
//
//   2. `verify` AND CI RUN THE SAME GUARDS. The root `verify` script chains
//      `node scripts/<name>.mjs`; ci.yml runs each guard as its own step, so a
//      failure names which invariant broke. That is one decision written as two
//      hand-maintained lists, and every way they can disagree is silent:
//
//        - in `verify`, not in ci.yml: the guard never runs on a PR. It runs
//          for whoever types `npm run verify` locally, which is nobody in the
//          path that decides whether a branch merges.
//        - in ci.yml, not in `verify`: `npm run verify` reports a pass with a
//          check missing from it, so the one command the README sells as the
//          local verification entry point quietly stops being one.
//        - on disk, in neither: a `scripts/check-*.mjs` that exists, is
//          documented, reads as covered, and runs nowhere at all.
//
//      Nothing else can notice any of the three. A guard is added by writing a
//      file, and no test, type or lint has an opinion about whether two other
//      files then mention it. The rule was written down once, in the commit
//      message that added check-alias-fences — "a guard added to only one of
//      the two is a guard that does not run where it matters" — and a commit
//      message fails no build. So: assert set equality between the
//      `scripts/check-*.mjs` files on disk, the invocations in `verify`, and
//      the `run:` steps in ci.yml.
//
// The workflow is read line by line rather than parsed. The guards here take no
// dependencies, and a guard against a wiring mistake is the last place to add
// the first one. That reader is narrow on purpose: anything it cannot identify
// with certainty — the cache step, either of its two fields, a `restore-keys`
// holding more than the single entry this implements — exits non-zero instead
// of being skipped, because a guard that silently matched nothing is the exact
// failure this file exists to end.
//
// Reads configs only, so it runs before `turbo run build` in both places — and
// invariant 2 is what makes "in both places" a checkable claim rather than a
// habit.
//
//   node scripts/check-ci-invariants.mjs

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const GUARD_NAME = 'check-ci-invariants';

const WORKFLOW = '.github/workflows/ci.yml';
const MANIFEST = 'package.json';
const SCRIPTS_DIR = 'scripts';
const VERIFY_SCRIPT = 'verify';

// The step whose two fields must agree, found by the action it uses rather than
// by its `name:` — a step name is prose, and free to be reworded by someone who
// has no idea a guard is keyed on it.
const USES_CACHE = /^\s*uses:\s*actions\/cache(?:@\S+)?\s*$/;
const STEP_NAME = /^\s*-\s*name:\s*(.*)$/;

const KEY_FIELD = 'key';
const RESTORE_KEYS_FIELD = 'restore-keys';

// What counts as a guard on disk. `workspace-globs.mjs` is deliberately outside
// the pattern: it is a shared module that exports an assertion its importers
// call, it runs nothing on its own, and it belongs in neither list.
const GUARD_FILE = /^check-[a-z0-9-]+\.mjs$/;

// `node scripts/<guard>.mjs`, wherever it is written — the `verify` chain, or a
// workflow `run:`. The optional `./` keeps two spellings of one path from
// reading as two different guards.
const GUARD_INVOCATION = /\bnode\s+(?:\.\/)?scripts\/([\w.-]+\.mjs)/g;

// A YAML block scalar header (`|`, `|-`, `>2`, …): the value is the indented
// lines below, not the rest of this line.
const BLOCK_SCALAR = /^[|>][+-]?\d*$/;

// A flow collection — `[a, b]`, `{ a: b }`. Refused rather than parsed: this
// workflow writes neither, and guessing at one is how a reader this narrow
// starts returning a confident wrong answer.
const FLOW_COLLECTION = /^[[{]/;

// The three lists invariant 2 compares, named as they read in a message.
const ON_DISK = `${SCRIPTS_DIR}/`;
const IN_VERIFY = `${MANIFEST}'s \`${VERIFY_SCRIPT}\` chain`;
const IN_WORKFLOW = WORKFLOW;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @type {string[]} */
const failures = [];

/**
 * @param {string} subject the file or guard the problem is about
 * @param {string} problem
 * @param {string} fix
 */
function fail(subject, problem, fix) {
  failures.push(`${subject}: ${problem}\n    fix: ${fix}`);
}

/** Exits non-zero: nothing below is meaningful once a field cannot be read. */
function refuse(message) {
  console.error(`\n${GUARD_NAME}: ${message}\n`);
  process.exit(1);
}

/** @param {string} line @returns {number} leading spaces; YAML forbids tabs here. */
function indentOf(line) {
  return line.length - line.trimStart().length;
}

/** @param {string} value */
function stripQuotes(value) {
  const quote = value[0];
  return (quote === '"' || quote === '\'') && value.length > 1 && value.endsWith(quote)
    ? value.slice(1, -1)
    : value;
}

/**
 * The value(s) of `<field>:` within `lines[from, to)`, in the shapes this
 * workflow writes: an inline scalar, or a block below the key — a `|` scalar or
 * a `- ` sequence, which read identically here, one entry per non-blank line.
 *
 * A trailing `# comment` on an inline scalar is NOT stripped, and that is the
 * safe direction: it can only lengthen a value, so it can make the prefix
 * assertion below fail loudly, never pass wrongly.
 *
 * @param {string[]} lines
 * @param {number} from
 * @param {number} to
 * @param {string} field
 * @returns {{ lineNumber: number, values: string[] }|null}
 */
function readField(lines, from, to, field) {
  const pattern = new RegExp(`^(\\s*)${field}:(?:\\s+(.*))?\\s*$`);

  for (let i = from; i < to; i++) {
    const match = pattern.exec(lines[i]);
    if (!match) continue;

    const fieldIndent = match[1].length;
    const inline = (match[2] ?? '').trim();

    if (FLOW_COLLECTION.test(inline)) {
      refuse(
        `${WORKFLOW}:${i + 1} writes \`${field}\` as a flow collection, which this reader\n`
        + 'does not implement.\n'
        + `  fix: write it as an inline scalar or as a block below the key, or teach\n`
        + `       \`readField()\` in ${SCRIPTS_DIR}/${GUARD_NAME}.mjs the flow form. It refuses\n`
        + '       what it cannot read rather than guessing, because a guessed value here\n'
        + '       is a cache-salt assertion that passes without having compared anything.',
      );
    }

    if (inline !== '' && !BLOCK_SCALAR.test(inline)) {
      return { lineNumber: i + 1, values: [stripQuotes(inline)] };
    }

    /** @type {string[]} */
    const values = [];
    for (let j = i + 1; j < to; j++) {
      if (lines[j].trim() === '') continue;
      if (indentOf(lines[j]) <= fieldIndent) break;
      values.push(stripQuotes(lines[j].trim().replace(/^-\s+/, '')));
    }
    return { lineNumber: i + 1, values };
  }

  return null;
}

/**
 * The one `actions/cache` step, as a line range.
 *
 * Exactly one, or this refuses. Zero is the step renamed, moved or removed —
 * every assertion below would then be about a step that is not there. More than
 * one is worse: this guard would check whichever came first and report the pair
 * it happened to read as "the" cache keys, while a second step's unsalted
 * `restore-keys` went on restoring everything.
 *
 * @param {string[]} lines
 * @returns {{ start: number, end: number, name: string }}
 */
function findCacheStep(lines) {
  const usesAt = lines.flatMap((line, index) => (USES_CACHE.test(line) ? [index] : []));

  if (usesAt.length !== 1) {
    refuse(
      `${WORKFLOW} has ${usesAt.length} step(s) using \`actions/cache\`, and this guard\n`
      + 'asserts the key pairing of exactly one.\n'
      + `  fix: ${usesAt.length === 0
        ? 'restore the turbo cache step, or delete this guard along with it — the salt\n'
        + '       pairing it asserts is about a step that is no longer there, and a guard\n'
        + '       whose subject is missing must not go on printing a pass.'
        : `teach \`findCacheStep()\` in ${SCRIPTS_DIR}/${GUARD_NAME}.mjs which caches to check.\n`
        + '       Checking the first and reporting "the cache keys OK" would leave the\n'
        + '       other one free to restore every pre-salt entry, unexamined.'}`,
    );
  }

  const usesIndent = indentOf(lines[usesAt[0]]);
  let start = -1;
  for (let i = usesAt[0]; i >= 0; i--) {
    if (/^\s*-\s/.test(lines[i]) && indentOf(lines[i]) < usesIndent) {
      start = i;
      break;
    }
  }

  if (start === -1) {
    refuse(
      `${WORKFLOW}:${usesAt[0] + 1} uses \`actions/cache\`, but this guard could not find the\n`
      + 'list item that starts the step it belongs to.\n'
      + `  fix: write the step as an ordinary \`- name: …\` entry under \`steps:\`. Without a\n`
      + '       start there is no block to read the two keys out of, and reading them from\n'
      + '       the whole file could pick up another step\'s.',
    );
  }

  const stepIndent = indentOf(lines[start]);
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    if (indentOf(lines[i]) <= stepIndent) {
      end = i;
      break;
    }
  }

  return { start, end, name: STEP_NAME.exec(lines[start])?.[1] ?? '(unnamed step)' };
}

/**
 * Every `run:` value in the workflow, inline or block, as text to scan.
 *
 * @param {string[]} lines
 * @returns {string[]}
 */
function readRunCommands(lines) {
  /** @type {string[]} */
  const commands = [];

  for (let i = 0; i < lines.length; i++) {
    const match = /^(\s*)run:(?:\s+(.*))?\s*$/.exec(lines[i]);
    if (!match) continue;

    const runIndent = match[1].length;
    const inline = (match[2] ?? '').trim();

    if (inline !== '' && !BLOCK_SCALAR.test(inline)) {
      commands.push(inline);
      continue;
    }

    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].trim() === '') continue;
      if (indentOf(lines[j]) <= runIndent) break;
      commands.push(lines[j].trim());
    }
  }

  return commands;
}

/** @param {string} text @returns {string[]} the guard file names it invokes. */
function invocationsIn(text) {
  return [...text.matchAll(GUARD_INVOCATION)].map(match => match[1]);
}

/**
 * The workflow, by line.
 *
 * A missing file is refused with the fix rather than left to throw ENOENT: this
 * guard's whole subject is a workflow that stopped running what it should, and
 * "the workflow is not where the guard looks" is the largest version of that.
 *
 * @returns {string[]}
 */
function readWorkflowLines() {
  try {
    return readFileSync(path.join(repoRoot, WORKFLOW), 'utf8').split(/\r?\n/);
  }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    refuse(
      `${WORKFLOW} does not exist, so neither invariant here has a workflow to hold.\n`
      + '  fix: restore it, or point WORKFLOW in this guard at the file that runs CI now.\n'
      + '       Both assertions below are about that one file; with it gone this guard\n'
      + '       would be certifying a cache key and a guard list that nothing runs.',
    );
  }
}

const workflowLines = readWorkflowLines();
const rootManifest = JSON.parse(readFileSync(path.join(repoRoot, MANIFEST), 'utf8'));

// ---------------------------------------------------------------------------
// Invariant 1 — the cache salt is in `key` AND in `restore-keys`.
// ---------------------------------------------------------------------------

const cacheStep = findCacheStep(workflowLines);
const keyField = readField(workflowLines, cacheStep.start, cacheStep.end, KEY_FIELD);
const restoreField = readField(workflowLines, cacheStep.start, cacheStep.end, RESTORE_KEYS_FIELD);

for (const [field, read] of [[KEY_FIELD, keyField], [RESTORE_KEYS_FIELD, restoreField]]) {
  if (read !== null) continue;
  refuse(
    `${WORKFLOW}'s "${cacheStep.name}" step declares no \`${field}\`, so there is nothing to\n`
    + 'compare the other key against.\n'
    + `  fix: restore \`${field}\` under the step's \`with:\`. A cache step with only a \`key\`\n`
    + '       never restores anything and only ever writes; one with only `restore-keys`\n'
    + '       restores by prefix and never writes. Either is a legitimate thing to want and\n'
    + '       neither is what this step does, so the guard refuses rather than certifying a\n'
    + '       salt pairing between one line and nothing.',
  );
}

for (const [field, read] of [[KEY_FIELD, keyField], [RESTORE_KEYS_FIELD, restoreField]]) {
  if (read.values.length === 1) continue;
  refuse(
    `${WORKFLOW}:${read.lineNumber} \`${field}\` holds ${read.values.length} entries, and this guard\n`
    + 'implements exactly one.\n'
    + `  fix: state a single ${field} entry, or teach ${SCRIPTS_DIR}/${GUARD_NAME}.mjs which of\n`
    + '       several to assert the prefix against. Checking one entry out of several and\n'
    + '       printing a pass would leave the rest free to be the unsalted prefix that\n'
    + '       matches every stale entry — which is the whole failure being guarded.',
  );
}

const keyValue = keyField.values[0];
const restoreValue = restoreField.values[0];

if (!keyValue.startsWith(restoreValue)) {
  fail(
    `${WORKFLOW}:${keyField.lineNumber} \`${KEY_FIELD}\` and :${restoreField.lineNumber} \`${RESTORE_KEYS_FIELD}\``,
    `\`${RESTORE_KEYS_FIELD}\` is not a prefix of \`${KEY_FIELD}\`\n`
    + `           ${KEY_FIELD}: ${keyValue}\n`
    + `           ${RESTORE_KEYS_FIELD}: ${restoreValue}`,
    `re-salt BOTH lines, or neither. \`${RESTORE_KEYS_FIELD}\` is a prefix match, so a prefix `
    + `that ${KEY_FIELD} no longer starts with is either a prefix matching entries this `
    + 'key will never write — a cache that only ever misses — or, in the case this guard '
    + 'exists for, the OLD unsalted prefix still matching every entry the previous salt '
    + 'wrote. That second one restores exactly as it did before the re-salt: the stale '
    + 'entries keep replaying their recorded stdout, nothing fails, and the salt above '
    + 'reads as applied. The two lines are one decision written twice.',
  );
}

// ---------------------------------------------------------------------------
// Invariant 2 — `verify` and CI run the same guards.
// ---------------------------------------------------------------------------

const guardsOnDisk = readdirSync(path.join(repoRoot, SCRIPTS_DIR))
  .filter(name => GUARD_FILE.test(name))
  .sort();

if (guardsOnDisk.length === 0) {
  refuse(
    `${SCRIPTS_DIR}/ holds no file matching ${GUARD_FILE}, so this guard has no set to\n`
    + 'compare and would report success over three empty lists.\n'
    + `  fix: if the repo really runs no guards any more, delete this one rather than\n`
    + '       leaving it green. If they were renamed, teach GUARD_FILE the new shape —\n'
    + '       matching nothing is inert, not clean.',
  );
}

const verifyScript = rootManifest.scripts?.[VERIFY_SCRIPT];

if (typeof verifyScript !== 'string') {
  refuse(
    `${MANIFEST} declares no \`${VERIFY_SCRIPT}\` script, which is one of the two lists this\n`
    + 'guard compares.\n'
    + `  fix: restore \`${VERIFY_SCRIPT}\` in the root ${MANIFEST}. It is the command the README\n`
    + '       names as the local verification entry point; with it gone, every guard below\n'
    + '       would read as "missing from verify" — or, worse, as a comparison against an\n'
    + '       empty list that happens to have nothing to disagree about.',
  );
}

const inVerify = new Set(invocationsIn(verifyScript));
const inWorkflow = new Set(readRunCommands(workflowLines).flatMap(invocationsIn));

for (const [list, names] of [[IN_VERIFY, inVerify], [IN_WORKFLOW, inWorkflow]]) {
  if (names.size > 0) continue;
  refuse(
    `${list} invokes no \`node ${SCRIPTS_DIR}/*.mjs\` at all.\n`
    + `  fix: wire the guards back in, or — if they are now invoked some way this reader\n`
    + `       cannot see — teach GUARD_INVOCATION in ${SCRIPTS_DIR}/${GUARD_NAME}.mjs that shape.\n`
    + '       An empty list agrees with nothing and disagrees with nothing; every guard\n'
    + '       would be reported missing from it, or none would.',
  );
}

const WHY_EACH_LIST = {
  [ON_DISK]: 'the file the other two name does not exist, so the step and the verify link '
    + 'that invoke it fail on a module that is not there',
  [IN_VERIFY]: '`npm run verify`, the local entry point the README names, passes without '
    + 'having run it',
  [IN_WORKFLOW]: 'it never runs on a PR, so the branch that breaks it merges green',
};

const FIX_PER_LIST = {
  [ON_DISK]: `create ${SCRIPTS_DIR}/<guard>.mjs`,
  [IN_VERIFY]: `add \`&& node ${SCRIPTS_DIR}/<guard>.mjs\` to \`${VERIFY_SCRIPT}\` in ${MANIFEST}`,
  [IN_WORKFLOW]: `add a step to ${WORKFLOW} running \`node ${SCRIPTS_DIR}/<guard>.mjs\``,
};

const everyGuard = [...new Set([...guardsOnDisk, ...inVerify, ...inWorkflow])].sort();

for (const name of everyGuard) {
  const presence = [
    [ON_DISK, guardsOnDisk.includes(name)],
    [IN_VERIFY, inVerify.has(name)],
    [IN_WORKFLOW, inWorkflow.has(name)],
  ];
  const absent = presence.filter(([, isPresent]) => !isPresent).map(([list]) => list);
  if (absent.length === 0) continue;

  const present = presence.filter(([, isPresent]) => isPresent).map(([list]) => list);

  fail(
    `${SCRIPTS_DIR}/${name}`,
    `is ${present.length > 0 ? `named by ${present.join(' and ')} but ` : ''}`
    + `missing from ${absent.join(' and ')}`,
    `${absent.map(list => FIX_PER_LIST[list].replace('<guard>.mjs', name)).join(', and ')}. `
    + `The three lists are one decision written three times, and this direction fails `
    + `nothing on its own: ${absent.map(list => `${list} — ${WHY_EACH_LIST[list]}`).join('; ')}. `
    + 'A guard wired into one place is a guard that does not run in the other.',
  );
}

if (failures.length > 0) {
  console.error(
    `\n${GUARD_NAME}: ${failures.length} broken CI invariant(s)\n\n`
    + `${failures.map(f => `  ✗ ${f}`).join('\n\n')}\n`,
  );
  process.exit(1);
}

console.log(
  `${GUARD_NAME}: both CI invariants hold\n`
  + `  cache salt — ${WORKFLOW} "${cacheStep.name}": ${RESTORE_KEYS_FIELD} \`${restoreValue}\` `
  + `is a prefix of ${KEY_FIELD} \`${keyValue}\`\n`
  + `  guard set — ${everyGuard.length} guard(s) named by ${ON_DISK}, by ${IN_VERIFY} and by `
  + `${IN_WORKFLOW}: ${everyGuard.map(name => name.replace(/\.mjs$/, '')).join(', ')}`,
);
