#!/usr/bin/env node
// CI-invariant guard: two pairings across .github/workflows/ci.yml, the root
// package.json and scripts/ that nothing in the build can fail on today.
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
//      and concludes the stale entries are gone.
//
//      What is asserted is an EQUALITY, not a prefix relation: the
//      `restore-keys` entry must BE the static portion of `key` — `key`
//      truncated at its first `${{ hashFiles(…) }}`, which is the part that
//      changes with the inputs and so the part no fallback can name. Equality
//      is what makes a salt anywhere in the static portion necessarily shared
//      by both lines. A prefix test would not: `turbo-` and the empty string
//      are both prefixes of a salted key, and both are the inert shape above,
//      matching every entry the previous salt wrote.
//
//      One residual is accepted deliberately: de-salting BOTH lines together
//      still passes, because the pairing — the thing this exists for — is
//      preserved. Whether the cache carries a salt at all is cache policy: an
//      argued, one-line, visible-in-review decision. Whether two lines that
//      must move together did move together is neither argued nor visible, and
//      that is the half a build can hold.
//
//   2. scripts/, `verify` AND CI NAME THE SAME GUARDS. The root `verify` script
//      chains `node scripts/<name>.mjs`; ci.yml runs each guard as its own step,
//      so a failure names which invariant broke. That is one decision written as
//      three hand-maintained lists — the files, the chain, the steps — and every
//      way they can disagree is silent:
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
//      the `run:` steps in ci.yml — and that a step naming a guard carries no
//      `if:` or `continue-on-error:`, since a step that can be skipped or
//      ignored is in the list and out of the run.
//
// The workflow is read line by line rather than parsed. The guards here take no
// dependencies, and a guard against a wiring mistake is the last place to add
// the first one. That reader DETECTS wider than it validates — a cache step is
// any `uses:` value mentioning `actions/cache`, in any spelling — and then
// exits non-zero on anything it cannot read with certainty: a cache step whose
// shape it does not implement, either of the two fields missing, a
// `restore-keys` holding more than the single entry this implements or holding
// nothing, a `key` with no `hashFiles` segment to truncate at, a subdirectory
// under scripts/. Detecting as narrowly as it validates is how a guard comes to
// print a pass over the one step it recognised while a second restores by an
// unsalted prefix beside it, and a guard that silently matched nothing is the
// exact failure this file exists to end.
//
// The one thing it cannot hold is itself. Delete this guard's own step from
// ci.yml and invariant 2 reports it — but only where the guard still runs,
// which is a local `npm run verify` and not the PR. That residual is not
// closable from inside this file, and it is left named rather than papered over
// with an assertion that cannot fire.
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
//
// DETECTION is the permissive half, and deliberately so: any `uses:` value that
// so much as mentions `actions/cache` counts, whatever the spelling — pinned to
// a SHA with the version in a trailing comment, quoted, or a subpath like
// `actions/cache/restore`. Everything this file asserts about the cache rests
// on having seen EVERY cache step, so the detector must not be the same shape
// as the reader below; a step it fails to notice is a step whose `restore-keys`
// nothing looked at, under a printed pass.
const USES_LINE = /^\s*(?:-\s+)?uses:\s*(\S.*?)\s*$/;
const MENTIONS_CACHE = /actions\/cache/;

// VALIDATION is the narrow half: the single spelling the fields below are read
// out of. Anything else detected is refused, not guessed at.
const USES_CACHE_IMPLEMENTED = /^actions\/cache(?:@[^\s#]+)?$/;

const STEP_NAME = /^\s*-\s*name:\s*(.*)$/;

const KEY_FIELD = 'key';
const RESTORE_KEYS_FIELD = 'restore-keys';

// The end of `key`'s static portion. Everything before this interpolation is
// text `restore-keys` can be written against; the interpolation itself is what
// makes `key` change when the inputs change, and is exactly what a prefix match
// is meant to stop short of.
const HASH_FILES = /\$\{\{\s*hashFiles\s*\(/;

// A key that stops a step from running, or from failing the job when it does.
const CONDITIONAL_KEY = /^(if|continue-on-error):/;

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
 * safe direction: it can only lengthen a value, so it can make the equality
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
 * The line after the block that `lines[start]` opens: the first non-blank line
 * indented no deeper than it. The next sibling step, or the end of the file.
 *
 * @param {string[]} lines
 * @param {number} start
 * @returns {number}
 */
function blockEnd(lines, start) {
  const startIndent = indentOf(lines[start]);

  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    if (indentOf(lines[i]) <= startIndent) return i;
  }

  return lines.length;
}

/**
 * The one `actions/cache` step, as a line range.
 *
 * Detected permissively and read narrowly. A step using `actions/cache` in a
 * spelling this cannot read is refused rather than passed over, because passing
 * over it is indistinguishable from there being no such step — and the two
 * refusals below are the ones that would then not fire.
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
  const cacheUses = lines.flatMap((line, index) => {
    const value = USES_LINE.exec(line)?.[1];
    return value !== undefined && MENTIONS_CACHE.test(value) ? [{ index, value }] : [];
  });

  const unreadable = cacheUses.filter(({ value }) => !USES_CACHE_IMPLEMENTED.test(value));

  if (unreadable.length > 0) {
    refuse(
      `${WORKFLOW} uses \`actions/cache\` in ${unreadable.length} spelling(s) this guard does not\n`
      + 'implement, and it reads the two keys out of exactly one:\n'
      + `${unreadable.map(({ index, value }) => `         :${index + 1} uses: ${value}\n`).join('')}`
      + `  fix: write it as \`uses: actions/cache@<ref>\` — unquoted, no trailing comment, no\n`
      + `       subpath — or teach \`findCacheStep()\` in ${SCRIPTS_DIR}/${GUARD_NAME}.mjs the spelling\n`
      + '       used here. Detection is wider than validation on purpose: a step this can see\n'
      + '       but not read is refused, because the alternative is asserting the salt pairing\n'
      + '       of whichever step happened to be recognised and printing a pass, while the one\n'
      + '       beside it restores every pre-salt entry by an unsalted prefix, unexamined.',
    );
  }

  const usesAt = cacheUses.map(({ index }) => index);

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
    if (!/^\s*-\s/.test(lines[i])) continue;
    // The `uses:` line is itself the list item when the step is written
    // `- uses: …` with no `name:` above it.
    if (i === usesAt[0] || indentOf(lines[i]) < usesIndent) {
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

  return {
    start,
    end: blockEnd(lines, start),
    name: STEP_NAME.exec(lines[start])?.[1] ?? '(unnamed step)',
  };
}

/**
 * Every `run:` value within `lines[from, to)`, inline or block, as text to scan.
 *
 * Lines inside a block scalar whose first non-space character is `#` are shell
 * COMMENTS, and skipped. `# node scripts/check-x.mjs (disabled)` is the note
 * someone leaves behind when they take the real step out, and counting it would
 * make the guard list agree precisely when a guard had stopped running.
 *
 * @param {string[]} lines
 * @param {number} from
 * @param {number} to
 * @returns {string[]}
 */
function runCommandsIn(lines, from, to) {
  /** @type {string[]} */
  const commands = [];

  for (let i = from; i < to; i++) {
    const match = /^(\s*)run:(?:\s+(.*))?\s*$/.exec(lines[i]);
    if (!match) continue;

    const runIndent = match[1].length;
    const inline = (match[2] ?? '').trim();

    if (inline !== '' && !BLOCK_SCALAR.test(inline)) {
      commands.push(inline);
      continue;
    }

    for (let j = i + 1; j < to; j++) {
      if (lines[j].trim() === '') continue;
      if (indentOf(lines[j]) <= runIndent) break;
      const body = lines[j].trim();
      if (body.startsWith('#')) continue;
      commands.push(body);
    }
  }

  return commands;
}

/**
 * Every step under a `steps:` key, with the guards its `run:` invokes and any
 * key that can stop it from running.
 *
 * Per step rather than over the whole file, because "is this guard wired into
 * CI?" is a question about the step the invocation sits in: a step carrying
 * `if:` or `continue-on-error:` puts the text of an invocation in the workflow
 * and takes the run out of it.
 *
 * @param {string[]} lines
 * @returns {{ lineNumber: number, name: string, invocations: string[],
 *   conditionalKeys: { key: string, lineNumber: number }[] }[]}
 */
function readSteps(lines) {
  /** @type {number[]} */
  const starts = [];
  let stepsIndent = -1;
  let itemIndent = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;

    if (stepsIndent !== -1 && indentOf(lines[i]) <= stepsIndent) {
      stepsIndent = -1;
      itemIndent = -1;
    }

    if (stepsIndent === -1) {
      const opens = /^(\s*)steps:\s*$/.exec(lines[i]);
      if (opens) stepsIndent = opens[1].length;
      continue;
    }

    if (!/^\s*-\s+/.test(lines[i])) continue;
    if (itemIndent === -1) itemIndent = indentOf(lines[i]);
    if (indentOf(lines[i]) === itemIndent) starts.push(i);
  }

  return starts.map((start) => {
    const end = blockEnd(lines, start);
    // Where the step's own keys begin: past the `- `, which is where the first
    // one sits and where every later one lines up.
    const keyIndent = /^\s*-\s+/.exec(lines[start])[0].length;

    /** @type {{ key: string, lineNumber: number }[]} */
    const conditionalKeys = [];
    for (let i = start; i < end; i++) {
      if (i !== start && indentOf(lines[i]) !== keyIndent) continue;
      const key = CONDITIONAL_KEY.exec(lines[i].slice(keyIndent))?.[1];
      if (key !== undefined) conditionalKeys.push({ key, lineNumber: i + 1 });
    }

    return {
      lineNumber: start + 1,
      name: STEP_NAME.exec(lines[start])?.[1] ?? '(unnamed step)',
      invocations: runCommandsIn(lines, start, end).flatMap(invocationsIn),
      conditionalKeys,
    };
  });
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
    + '       several to assert the equality against. Checking one entry out of several and\n'
    + '       printing a pass would leave the rest free to be the unsalted prefix that\n'
    + '       matches every stale entry — which is the whole failure being guarded.',
  );
}

const keyValue = keyField.values[0];
const restoreValue = restoreField.values[0];

const hashFilesAt = HASH_FILES.exec(keyValue);

if (hashFilesAt === null) {
  refuse(
    `${WORKFLOW}:${keyField.lineNumber} \`${KEY_FIELD}\` holds no \`\${{ hashFiles(…) }}\` segment, so it has no\n`
    + `static portion for \`${RESTORE_KEYS_FIELD}\` to be compared against.\n`
    + `         ${KEY_FIELD}: ${keyValue}\n`
    + `  fix: restore the \`hashFiles(…)\` interpolation in \`${KEY_FIELD}\`, or teach\n`
    + `       ${SCRIPTS_DIR}/${GUARD_NAME}.mjs how the key is composed now. A key with nothing\n`
    + '       hashed into it never changes when the inputs change — every run after the first\n'
    + '       is a hit on the one entry it can write — and with nothing to truncate at, this\n'
    + `       guard would be comparing \`${RESTORE_KEYS_FIELD}\` against the whole key, which is a\n`
    + '       different assertion than the one it documents.',
  );
}

// Everything before the first `${{ hashFiles(…) }}`: the part of `key` that a
// prefix match can be written against, salt included.
const keyStatic = keyValue.slice(0, hashFilesAt.index);

if (restoreValue === '') {
  refuse(
    `${WORKFLOW}:${restoreField.lineNumber} \`${RESTORE_KEYS_FIELD}\` is empty, which is the inert-salt shape\n`
    + 'this guard exists for, taken as far as it goes: an empty prefix matches EVERY entry\n'
    + 'ever written under this path, including every entry the salt above was added to\n'
    + 'discard.\n'
    + `  fix: state the static portion of \`${KEY_FIELD}\` — \`${keyStatic}\` — as the single\n`
    + `       ${RESTORE_KEYS_FIELD} entry. Empty is not "no fallback": a cache step meant never to\n`
    + `       restore across key changes drops \`${RESTORE_KEYS_FIELD}\` and this guard with it. An\n`
    + '       empty string reads as a declared fallback and behaves as "restore anything".',
  );
}

if (restoreValue !== keyStatic) {
  fail(
    `${WORKFLOW}:${keyField.lineNumber} \`${KEY_FIELD}\` and :${restoreField.lineNumber} \`${RESTORE_KEYS_FIELD}\``,
    `\`${RESTORE_KEYS_FIELD}\` is not exactly the static portion of \`${KEY_FIELD}\`\n`
    + `           ${KEY_FIELD}: ${keyValue}\n`
    + `           its static portion: ${keyStatic}\n`
    + `           ${RESTORE_KEYS_FIELD}: ${restoreValue}`,
    `re-salt BOTH lines, or neither: state \`${keyStatic}\` as the single ${RESTORE_KEYS_FIELD} `
    + `entry. \`${RESTORE_KEYS_FIELD}\` is a prefix match, so anything SHORTER than that — an old `
    + 'unsalted prefix, a truncation — is the case this guard exists for: it goes on matching '
    + 'every entry the previous salt wrote, so the cache restores exactly as it did before the '
    + 're-salt, the stale entries keep replaying their recorded stdout, nothing fails, and the '
    + 'salt above reads as applied. Anything the static portion does not match at all is the '
    + 'opposite failure and also wrong: a prefix matching entries this key will never write, a '
    + 'cache that only ever misses. Equality is asserted rather than a prefix relation because '
    + 'every value in that first case — truncated, unsalted, empty — passes a prefix test. The '
    + 'two lines are one decision written twice.',
  );
}

// ---------------------------------------------------------------------------
// Invariant 2 — `verify` and CI run the same guards.
// ---------------------------------------------------------------------------

const scriptsEntries = readdirSync(path.join(repoRoot, SCRIPTS_DIR), { withFileTypes: true });
const scriptsSubdirs = scriptsEntries.filter(entry => entry.isDirectory()).map(entry => entry.name).sort();

if (scriptsSubdirs.length > 0) {
  refuse(
    `${SCRIPTS_DIR}/ holds ${scriptsSubdirs.length} subdirectory(ies) — ${scriptsSubdirs.join(', ')} — and this\n`
    + 'guard reads only the files directly in it.\n'
    + `  fix: keep the guards directly in ${SCRIPTS_DIR}/, or teach both this directory read and\n`
    + `       GUARD_INVOCATION in ${SCRIPTS_DIR}/${GUARD_NAME}.mjs to walk subdirectories. A guard\n`
    + `       moved into ${SCRIPTS_DIR}/ci/ leaves all three lists at once — off this listing, and\n`
    + '       out of both invocation scans, whose path pattern stops at the first `/` — so the\n'
    + '       three would go on agreeing, over a set the moved guard had quietly left.',
  );
}

const guardsOnDisk = scriptsEntries
  .map(entry => entry.name)
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
    `${MANIFEST} declares no \`${VERIFY_SCRIPT}\` script, which is one of the three lists this\n`
    + 'guard compares.\n'
    + `  fix: restore \`${VERIFY_SCRIPT}\` in the root ${MANIFEST}. It is the command the README\n`
    + '       names as the local verification entry point; with it gone, every guard below\n'
    + '       would read as "missing from verify" — or, worse, as a comparison against an\n'
    + '       empty list that happens to have nothing to disagree about.',
  );
}

const workflowSteps = readSteps(workflowLines);

const inVerify = new Set(invocationsIn(verifyScript));
const inWorkflow = new Set(workflowSteps.flatMap(step => step.invocations));

// A step that exists and may not run is wired into the workflow's TEXT and out
// of its runs — and the set comparison below, which reads the text, would count
// it either way. Both keys are legitimate elsewhere: the changeset step carries
// an `if:` and invokes no guard, which is why this is per step.
for (const step of workflowSteps) {
  const guards = step.invocations.filter(name => GUARD_FILE.test(name));
  if (guards.length === 0 || step.conditionalKeys.length === 0) continue;

  fail(
    `${WORKFLOW}:${step.lineNumber} "${step.name}"`,
    `runs ${guards.map(name => `\`${SCRIPTS_DIR}/${name}\``).join(' and ')} under `
    + `${step.conditionalKeys.map(({ key, lineNumber }) => `\`${key}:\` (:${lineNumber})`).join(' and ')}`,
    `drop that key from this step, or move the guard to a step that always runs and fails. `
    + `A conditional guard step is present in the text and absent from the PR that breaks it: `
    + `\`if: false\` and \`continue-on-error: true\` both leave the invocation sitting in `
    + `${WORKFLOW}, where the guard-set check below reads it and counts the guard as wired into `
    + 'CI, while the job goes green having skipped it or having ignored its exit code. The '
    + 'steps that may legitimately not run are the ones that invoke no guard.',
  );
}

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
  [ON_DISK]: `create ${SCRIPTS_DIR}/<guard>.mjs — or, if the file is meant to be a guard under a `
    + `different name, rename it to ${SCRIPTS_DIR}/check-*.mjs, which is the pattern this list `
    + 'matches',
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
  + `is exactly the static portion of ${KEY_FIELD} \`${keyValue}\`\n`
  + `  guard set — ${everyGuard.length} guard(s) named by ${ON_DISK}, by ${IN_VERIFY} and by `
  + `${IN_WORKFLOW}: ${everyGuard.map(name => name.replace(/\.mjs$/, '')).join(', ')}`,
);
