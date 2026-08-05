#!/usr/bin/env node
// CI-invariant guard: four pairings across .github/workflows/ci.yml,
// .github/workflows/deploy-site.yml, turbo.json, the root package.json and
// scripts/ that nothing in the build can fail on today.
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
//   3. THE scripts/ LINT IS WIRED ON ALL THREE LEGS. The root is not a
//      workspace, so `scripts/` has no package `lint` script for `turbo run
//      lint` to find. It is linted by a root task instead, and that one
//      sentence — "`turbo run lint` also lints scripts/" — is written as three
//      declarations across two files: the root package.json's `lint:scripts`
//      SCRIPT, turbo.json's `//#lint:scripts` TASK, and the `//#lint:scripts`
//      entry in turbo.json's `lint.dependsOn`. Two of the three go silent when
//      removed:
//
//        - the root SCRIPT renamed or deleted: the task is still declared and
//          still depended on, so turbo still resolves it — and runs nothing,
//          because the root manifest has no script by that name. The run is
//          green with the `scripts/` lint simply absent from it.
//        - the `dependsOn` ENTRY deleted: `lint` stops reaching the root task,
//          so the single unfiltered `turbo run build lint test typecheck` that
//          CI and `verify` run never asks for it. Every package still lints,
//          every task still passes, and the guards are out of the run.
//
//      Deleting the TASK BLOCK while leaving the edge is the one leg that
//      already fails loudly — turbo refuses a `dependsOn` naming a task it
//      cannot find. It is asserted with the other two anyway: which leg is the
//      loud one is turbo's decision and not this repo's, and an assertion
//      covering only the legs a tool happens to catch this year is how a guard
//      quietly stops covering them.
//
//      The task's `inputs` are checked against that same script, because the
//      inputs are a fourth copy of "what gets linted": a lint TARGET outside
//      them is a file whose change does not move the task's hash, so the first
//      run's recorded pass replays over a `scripts/` the linter has not read
//      since. Every positional argument of `eslint <target>…` must be named by
//      `inputs` — as itself, or by a glob rooted at it.
//
//      This guard is the cheapest home for all of it: it already reads the root
//      manifest, it already runs in both places by invariant 2, and it already
//      owns the rule that hand-maintained lists spelling out one decision have
//      to agree. A new guard file would arrive needing exactly the three-way
//      wiring invariant 2 exists to certify — a wiring assertion that itself
//      has to be wired in.
//
//   4. THE DEPLOY BUILD CHECKS THE ARTIFACT IT PRODUCES. deploy-site.yml is the
//      only build of this site anybody reads: it has no `needs:` on CI, it
//      races CI on a push to main, and it ships whatever it built. Everything
//      else it delegates to CI is CORRECTNESS someone else verified and does
//      not change what is shipped — but the site's `build` writes a gitignored
//      `apps/site/generated/props/`, and if the turbo edge that fills it were
//      ever deleted, this workflow would build from a fresh checkout where the
//      directory does not exist, vite's glob would match zero files, and
//      designpineapple.com would ship every package page saying it has no
//      props table. CI would be red on that same commit and the deploy would
//      go out anyway.
//
//      So the step running check-props-coverage.mjs after the build is
//      load-bearing, and until now it was held by nothing: invariant 2 reads
//      ci.yml alone, so deleting the deploy step left all four guards exiting
//      0. It is asserted with its POSITION, not just its presence — after the
//      build, because before it the directory does not exist yet, and before
//      the artifact upload, because a guard that fails after the upload has
//      let the wrong bytes past the only gate they get.
//
// The workflows are read line by line rather than parsed. The guards here take no
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
// turbo.json is JSONC — it carries `//` comments and turbo reads it that way —
// so it is comment-stripped before `JSON.parse`. The stripper is string-aware
// out of necessity rather than taste: the task invariant 3 is about is named by
// the string `"//#lint:scripts"`, and a stripper that treats every `//` as the
// start of a comment truncates the exact value it was added to check, leaving
// the guard reporting a missing task over a file that declares one. scripts/
// already holds three comment strippers of differing fidelity —
// `stripNonCode()` in check-peer-externals (the highest: it lexes regex
// literals and reports what it cannot read), `stripComments()` in
// check-ref-tests, and `stripComments()` in check-token-drift, a chain of
// replaces — and this is deliberately a fourth, minimal and JSONC-specific: it
// knows double-quoted strings with backslash escapes, `//`, `/* */`, and
// nothing else, because JSON has nothing else. Reconciling the four into one
// shared lexer is worth doing and is not done here; the gap is named so the
// next reader finds accepted duplicates rather than four implementations that
// each look authoritative.
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
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const GUARD_NAME = 'check-ci-invariants';

const WORKFLOW = '.github/workflows/ci.yml';
const MANIFEST = 'package.json';
const SCRIPTS_DIR = 'scripts';
const VERIFY_SCRIPT = 'verify';

// Invariant 4's four names: the workflow that ships the site, the guard that
// has to run inside it, and the two steps it has to sit between.
const DEPLOY_WORKFLOW = '.github/workflows/deploy-site.yml';
const ARTIFACT_GUARD = 'check-props-coverage.mjs';
// Detected wider than it is validated, like the cache step above: any `run:`
// asking turbo for a build, however the filter is spelled.
const BUILDS_THE_SITE = /\bturbo\b.+\brun\b.+\bbuild\b/;
const UPLOADS_THE_ARTIFACT = /actions\/upload-pages-artifact/;

// Invariant 3's four names: the root script, the turbo task that runs it, the
// task that has to depend on it, and the linter the script is expected to be.
const TURBO_CONFIG = 'turbo.json';
const LINT_SCRIPTS_SCRIPT = 'lint:scripts';
const LINT_SCRIPTS_TASK = `//#${LINT_SCRIPTS_SCRIPT}`;
const LINT_TASK = 'lint';
const LINTER = 'eslint';

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

/**
 * Exits non-zero: nothing below is meaningful once a field cannot be read.
 *
 * @param {string} message problem and fix, already formatted
 * @returns {never} the process is gone before a caller resumes
 */
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
 * @returns {{ lineNumber: number, values: string[] }|null} null when the range
 * holds no such field
 */
function readField(lines, from, to, field) {
  const pattern = new RegExp(`^(\\s*)${field}:(?:\\s+(.*))?\\s*$`);

  for (let i = from; i < to; i++) {
    const match = pattern.exec(lines[i]);
    if (!match)
      continue;

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
      if (lines[j].trim() === '')
        continue;
      if (indentOf(lines[j]) <= fieldIndent)
        break;
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
 * @returns {number} that line's index, or `lines.length`
 */
function blockEnd(lines, start) {
  const startIndent = indentOf(lines[start]);

  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].trim() === '')
      continue;
    if (indentOf(lines[i]) <= startIndent)
      return i;
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
 * @returns {{ start: number, end: number, name: string }} the step's first line,
 * the line after it, and its `name:` where it has one
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
    if (!/^\s*-\s/.test(lines[i]))
      continue;
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
 * @returns {string[]} one entry per command line
 */
function runCommandsIn(lines, from, to) {
  /** @type {string[]} */
  const commands = [];

  for (let i = from; i < to; i++) {
    const match = /^(\s*)run:(?:\s+(.*))?\s*$/.exec(lines[i]);
    if (!match)
      continue;

    const runIndent = match[1].length;
    const inline = (match[2] ?? '').trim();

    if (inline !== '' && !BLOCK_SCALAR.test(inline)) {
      commands.push(inline);
      continue;
    }

    for (let j = i + 1; j < to; j++) {
      if (lines[j].trim() === '')
        continue;
      if (indentOf(lines[j]) <= runIndent)
        break;
      const body = lines[j].trim();
      if (body.startsWith('#'))
        continue;
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
 * @returns {{ lineNumber: number, name: string, commands: string[],
 *   uses: string[], invocations: string[],
 *   conditionalKeys: { key: string, lineNumber: number }[] }[]} one entry per
 *   step, in file order
 */
function readSteps(lines) {
  /** @type {number[]} */
  const starts = [];
  let stepsIndent = -1;
  let itemIndent = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '')
      continue;

    if (stepsIndent !== -1 && indentOf(lines[i]) <= stepsIndent) {
      stepsIndent = -1;
      itemIndent = -1;
    }

    if (stepsIndent === -1) {
      const opens = /^(\s*)steps:\s*$/.exec(lines[i]);
      if (opens)
        stepsIndent = opens[1].length;
      continue;
    }

    if (!/^\s*-\s+/.test(lines[i]))
      continue;
    if (itemIndent === -1)
      itemIndent = indentOf(lines[i]);
    if (indentOf(lines[i]) === itemIndent)
      starts.push(i);
  }

  return starts.map((start) => {
    const end = blockEnd(lines, start);
    // Where the step's own keys begin: past the `- `, which is where the first
    // one sits and where every later one lines up.
    const keyIndent = /^\s*-\s+/.exec(lines[start])[0].length;

    /** @type {{ key: string, lineNumber: number }[]} */
    const conditionalKeys = [];
    for (let i = start; i < end; i++) {
      if (i !== start && indentOf(lines[i]) !== keyIndent)
        continue;
      const key = CONDITIONAL_KEY.exec(lines[i].slice(keyIndent))?.[1];
      if (key !== undefined)
        conditionalKeys.push({ key, lineNumber: i + 1 });
    }

    const commands = runCommandsIn(lines, start, end);

    return {
      lineNumber: start + 1,
      name: STEP_NAME.exec(lines[start])?.[1] ?? '(unnamed step)',
      commands,
      uses: lines.slice(start, end)
        .map(line => USES_LINE.exec(line)?.[1])
        .filter(value => value !== undefined),
      invocations: commands.flatMap(invocationsIn),
      conditionalKeys,
    };
  });
}

/** @param {string} text @returns {string[]} the guard file names it invokes. */
function invocationsIn(text) {
  return [...text.matchAll(GUARD_INVOCATION)].map(match => match[1]);
}

/**
 * A workflow, by line.
 *
 * A missing file is refused with the fix rather than left to throw ENOENT: this
 * guard's whole subject is a workflow that stopped running what it should, and
 * "the workflow is not where the guard looks" is the largest version of that.
 *
 * @param {string} relativePath
 * @param {string} why what stops being held when this file is not there
 * @returns {string[]} the file's lines, its newlines dropped
 */
function readWorkflowLines(relativePath, why) {
  try {
    return readFileSync(path.join(repoRoot, relativePath), 'utf8').split(/\r?\n/);
  }
  catch (error) {
    if (error.code !== 'ENOENT')
      throw error;
    // `return` because `refuse()` is `never`: this branch does not fall out of
    // the function, it ends the process.
    return refuse(
      `${relativePath} does not exist, so ${why}\n`
      + `  fix: restore it, or point this guard at the file that does that job now. A\n`
      + `       workflow constant naming a file that is not there is a guard certifying\n`
      + '       something nothing runs.',
    );
  }
}

/**
 * JSONC, minus its comments. String-aware because the value this guard reads
 * out of turbo.json is itself `"//#lint:scripts"` — see the header on why this
 * is a fourth stripper rather than one of the three already in scripts/.
 *
 * @param {string} source
 * @returns {{ json: string } | { unterminated: string }} refuses rather than
 * guessing when the scan runs off the end of a literal or a block comment.
 */
function stripJsoncComments(source) {
  let json = '';
  let index = 0;

  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];

    if (char === '"') {
      let end = index + 1;
      while (end < source.length && source[end] !== '"')
        end += source[end] === '\\' ? 2 : 1;
      if (end >= source.length)
        return { unterminated: 'a string' };
      json += source.slice(index, end + 1);
      index = end + 1;
      continue;
    }

    if (char === '/' && next === '/') {
      const end = source.indexOf('\n', index);
      if (end === -1)
        break;
      index = end; // Keep the newline, so a parse error names the right line.
      continue;
    }

    if (char === '/' && next === '*') {
      const end = source.indexOf('*/', index + 2);
      if (end === -1)
        return { unterminated: 'a block comment' };
      json += ' ';
      index = end + 2;
      continue;
    }

    json += char;
    index++;
  }

  return { json };
}

/**
 * turbo.json, parsed.
 *
 * Missing or unreadable is refused with the fix rather than left to throw:
 * every leg of invariant 3 is a claim about this file, and a guard that cannot
 * read it has nothing to say about them.
 *
 * @returns {Record<string, unknown>} the config, comments stripped
 */
function readTurboConfig() {
  let source;
  try {
    source = readFileSync(path.join(repoRoot, TURBO_CONFIG), 'utf8');
  }
  catch (error) {
    if (error.code !== 'ENOENT')
      throw error;
    return refuse(
      `${TURBO_CONFIG} does not exist, so the task that lints ${SCRIPTS_DIR}/ has no file to be\n`
      + '  declared in.\n'
      + `  fix: restore it. Without ${TURBO_CONFIG} there is no build graph at all, and this\n`
      + `       guard refuses rather than reporting the ${SCRIPTS_DIR}/ lint wiring as absent —\n`
      + '       which would be true and useless.',
    );
  }

  const stripped = stripJsoncComments(source);
  if ('unterminated' in stripped) {
    return refuse(
      `${TURBO_CONFIG} ends inside ${stripped.unterminated}, so this guard cannot tell its\n`
      + 'comments from its values.\n'
      + `  fix: close it. Everything invariant 3 asserts is read out of this file, and half a\n`
      + '       parse is a task list with entries missing — which reads exactly like the\n'
      + '       wiring having been deleted.',
    );
  }

  try {
    return JSON.parse(stripped.json);
  }
  catch (error) {
    return refuse(
      `${TURBO_CONFIG} does not parse as JSON once its comments are stripped: ${error.message}\n`
      + `  fix: check it for a trailing comma or an unquoted key — the shapes JSONC allows\n`
      + `       beyond comments, which \`stripJsoncComments()\` in ${SCRIPTS_DIR}/${GUARD_NAME}.mjs\n`
      + '       does not implement. turbo would accept the file and this guard would refuse\n'
      + '       it, so the fix is either the file or that function, never a skipped assertion.',
    );
  }
}

/**
 * The paths `lint:scripts` lints, out of its `eslint <target>…` command.
 *
 * Options are refused rather than skipped: `--max-warnings 0` puts a `0` in
 * argument position, and no text reader can tell an option's VALUE from a
 * target. Guessing in one direction invents a missing input; guessing in the
 * other drops a real target out of the coverage check below.
 *
 * @param {string} command
 * @returns {string[]} the command's positional arguments, in order
 */
function readLintTargets(command) {
  const [binary, ...args] = command.trim().split(/\s+/);

  if (binary !== LINTER) {
    refuse(
      `${MANIFEST}'s \`${LINT_SCRIPTS_SCRIPT}\` runs \`${binary}\`, and this guard reads lint targets\n`
      + `out of an \`${LINTER} <target>…\` command.\n`
      + `         ${LINT_SCRIPTS_SCRIPT}: ${command}\n`
      + `  fix: teach \`readLintTargets()\` in ${SCRIPTS_DIR}/${GUARD_NAME}.mjs this command's shape.\n`
      + `       The check it feeds is "${TURBO_CONFIG}'s \`inputs\` cover what is linted"; over a\n`
      + '       command it cannot read, that check would be an empty target list agreeing with\n'
      + '       any inputs at all.',
    );
  }

  const options = args.filter(arg => arg.startsWith('-'));
  if (options.length > 0) {
    refuse(
      `${MANIFEST}'s \`${LINT_SCRIPTS_SCRIPT}\` passes option(s) — ${options.join(', ')} — and this guard\n`
      + 'reads the arguments after `eslint` as lint targets.\n'
      + `         ${LINT_SCRIPTS_SCRIPT}: ${command}\n`
      + `  fix: teach \`readLintTargets()\` in ${SCRIPTS_DIR}/${GUARD_NAME}.mjs which options take a\n`
      + '       value, or configure the linter through eslint.config.mjs instead of the command\n'
      + '       line. An option\'s value sits in argument position, so a reader that skips only\n'
      + `       the flag would assert that ${TURBO_CONFIG} lists \`0\` among its inputs.`,
    );
  }

  if (args.length === 0) {
    refuse(
      `${MANIFEST}'s \`${LINT_SCRIPTS_SCRIPT}\` names no lint target.\n`
      + `         ${LINT_SCRIPTS_SCRIPT}: ${command}\n`
      + `  fix: state the paths to lint — \`${LINTER} ${SCRIPTS_DIR} eslint.config.mjs\`. With no\n`
      + '       target this guard has nothing to check the task\'s `inputs` against, and eslint\n'
      + '       itself lints nothing.',
    );
  }

  return args;
}

/**
 * Whether an `inputs` entry names `target`: as itself, or as a glob rooted at
 * it — `scripts` is covered by `scripts` and by `scripts/**`.
 *
 * Text, not glob semantics, and honest about the difference: a glob rooted at
 * the target that matches only part of the tree under it is counted as
 * covering, so this can pass over a narrow input it cannot evaluate. It cannot
 * go the other way — an entry rooted somewhere else never counts, which is the
 * direction the assertion is for.
 *
 * @param {string} input
 * @param {string} target
 * @returns {boolean} whether this one entry accounts for the target
 */
function coversTarget(input, target) {
  const normalized = target.replace(/\/+$/, '');
  if (input === normalized)
    return true;
  if (!input.startsWith(`${normalized}/`))
    return false;
  return input.slice(normalized.length + 1).includes('*');
}

const workflowLines = readWorkflowLines(
  WORKFLOW,
  'the cache-salt and guard-set invariants have no workflow to hold.',
);
const deployLines = readWorkflowLines(
  DEPLOY_WORKFLOW,
  'there is no deploy path to check the shipped artifact on.',
);
const rootManifest = JSON.parse(readFileSync(path.join(repoRoot, MANIFEST), 'utf8'));

// ---------------------------------------------------------------------------
// Invariant 1 — the cache salt is in `key` AND in `restore-keys`.
// ---------------------------------------------------------------------------

const cacheStep = findCacheStep(workflowLines);
const keyField = readField(workflowLines, cacheStep.start, cacheStep.end, KEY_FIELD);
const restoreField = readField(workflowLines, cacheStep.start, cacheStep.end, RESTORE_KEYS_FIELD);

for (const [field, read] of [[KEY_FIELD, keyField], [RESTORE_KEYS_FIELD, restoreField]]) {
  if (read !== null)
    continue;
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
  if (read.values.length === 1)
    continue;
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
  if (guards.length === 0 || step.conditionalKeys.length === 0)
    continue;

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
  if (names.size > 0)
    continue;
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
  if (absent.length === 0)
    continue;

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

// ---------------------------------------------------------------------------
// Invariant 3 — the scripts/ lint is wired on all three legs.
// ---------------------------------------------------------------------------

const turboConfig = readTurboConfig();
const turboTasks = typeof turboConfig.tasks === 'object' && turboConfig.tasks !== null
  ? turboConfig.tasks
  : {};

const lintScriptsCommand = rootManifest.scripts?.[LINT_SCRIPTS_SCRIPT];
const lintScriptsTask = turboTasks[LINT_SCRIPTS_TASK];
const lintTask = turboTasks[LINT_TASK];

const hasLintScriptsTask = typeof lintScriptsTask === 'object' && lintScriptsTask !== null;

if (typeof lintScriptsCommand !== 'string') {
  fail(
    `${MANIFEST} \`scripts.${LINT_SCRIPTS_SCRIPT}\``,
    `is missing — it is the command the ${TURBO_CONFIG} task \`${LINT_SCRIPTS_TASK}\` runs`,
    `restore \`"${LINT_SCRIPTS_SCRIPT}": "${LINTER} ${SCRIPTS_DIR} eslint.config.mjs"\` in `
    + `${MANIFEST}, or take the whole wiring out — task block and \`${LINT_TASK}.dependsOn\` entry `
    + 'with it. This is the leg that goes green: turbo resolves the task, finds no script of '
    + `that name in the root manifest, and reports it as having nothing to run, so \`turbo run `
    + `${LINT_TASK}\` passes with ${SCRIPTS_DIR}/ linted by nobody. Renaming the script is the `
    + 'same edit — the task names it by string.',
  );
}

if (!hasLintScriptsTask) {
  fail(
    `${TURBO_CONFIG} \`tasks["${LINT_SCRIPTS_TASK}"]\``,
    lintScriptsTask === undefined
      ? `is missing, so the build graph holds no task that runs \`${LINT_SCRIPTS_SCRIPT}\``
      : `is ${typeof lintScriptsTask}, not a task block`,
    `restore the task, with \`inputs\` naming what it lints. ${SCRIPTS_DIR}/ is linted through a `
    + `ROOT task because the root is not a workspace and has no package \`${LINT_TASK}\` script for `
    + `\`turbo run ${LINT_TASK}\` to find — with the task gone there is nothing left for the `
    + `\`${LINT_TASK}\` task to depend on, and the guards leave the one unfiltered run that CI and `
    + `\`${VERIFY_SCRIPT}\` already do.`,
  );
}

if (typeof lintTask !== 'object' || lintTask === null) {
  fail(
    `${TURBO_CONFIG} \`tasks.${LINT_TASK}\``,
    `is missing, so there is no ${LINT_TASK} task to carry the \`${LINT_SCRIPTS_TASK}\` dependency`,
    `restore the \`${LINT_TASK}\` task with \`"dependsOn": ["^build", "${LINT_SCRIPTS_TASK}"]\`. The `
    + `root task is reached only through that edge: it is what puts ${SCRIPTS_DIR}/ inside the `
    + `single \`turbo run build ${LINT_TASK} test typecheck\` that CI and \`${VERIFY_SCRIPT}\` run, `
    + 'rather than beside it as a second command someone has to remember.',
  );
}
else if (!(Array.isArray(lintTask.dependsOn) && lintTask.dependsOn.includes(LINT_SCRIPTS_TASK))) {
  fail(
    `${TURBO_CONFIG} \`tasks.${LINT_TASK}.dependsOn\``,
    `does not name \`${LINT_SCRIPTS_TASK}\``,
    `add \`"${LINT_SCRIPTS_TASK}"\` to it. This is the other leg that goes green: the task block `
    + `stays, the root script stays, and nothing asks for either — \`turbo run ${LINT_TASK}\` runs `
    + `every package's lint, passes, and never reaches the root task, so ${SCRIPTS_DIR}/ is linted `
    + `by no command anyone runs. Removing the edge is also the obvious way to "fix" a slow `
    + `${LINT_TASK}, which is why it is asserted rather than commented.`,
  );
}

/** @type {string[]} */
const lintTargets = typeof lintScriptsCommand === 'string' ? readLintTargets(lintScriptsCommand) : [];

if (hasLintScriptsTask && lintTargets.length > 0) {
  const { inputs } = lintScriptsTask;

  if (inputs !== undefined && !Array.isArray(inputs)) {
    refuse(
      `${TURBO_CONFIG}'s \`${LINT_SCRIPTS_TASK}\` declares \`inputs\` as ${typeof inputs}, and this guard\n`
      + 'reads it as the array turbo documents.\n'
      + '  fix: state `inputs` as an array of path patterns, or drop the field. It is refused\n'
      + '       rather than skipped because the assertion it feeds — that everything the lint\n'
      + '       reads is hashed into the task — is the difference between a cached pass and a\n'
      + '       pass.',
    );
  }

  // No `inputs` field at all is turbo's default: the whole repo is hashed, which
  // covers every target by construction. There is nothing to assert there, and
  // asserting it would be asking for the wider hash.
  if (Array.isArray(inputs)) {
    const uncovered = lintTargets.filter(
      target => !inputs.some(input => typeof input === 'string' && coversTarget(input, target)),
    );

    if (uncovered.length > 0) {
      fail(
        `${TURBO_CONFIG} \`tasks["${LINT_SCRIPTS_TASK}"].inputs\``,
        `names none of ${uncovered.map(target => `\`${target}\``).join(', ')}, which `
        + `\`${LINT_SCRIPTS_SCRIPT}\` lints\n           ${LINT_SCRIPTS_SCRIPT}: ${lintScriptsCommand}\n`
        + `           inputs: ${inputs.join(', ')}`,
        `add each linted path to \`inputs\` — as itself or as a glob rooted at it (\`${SCRIPTS_DIR}\` `
        + `is covered by \`${SCRIPTS_DIR}/**\`). A target outside \`inputs\` is a file whose change `
        + `does not move the task's hash, so turbo replays the first run's recorded pass over a `
        + `${SCRIPTS_DIR}/ the linter has not read since — a green ${LINT_TASK} that is a cache hit, `
        + 'not a check.',
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Invariant 4 — the deploy build checks the artifact it produces.
// ---------------------------------------------------------------------------

const deploySteps = readSteps(deployLines);

/**
 * @param {(step: { commands: string[], uses: string[] }) => boolean} matches
 * @param {string} what the step, named as it reads in a message
 * @param {string} how what the reader looked for
 * @returns {number} the index of the one step that matches
 */
function deployStepIndex(matches, what, how) {
  const found = deploySteps.filter(matches);
  if (found.length !== 1) {
    // Refused, not reported: with the step unfound there is nothing to place
    // the guard relative to, and an ordering assertion that quietly stopped
    // having two ends would print a pass over any order at all.
    refuse(
      `${DEPLOY_WORKFLOW} has ${found.length} step(s) that ${what}, and this guard implements\n`
      + 'exactly one.\n'
      + `  fix: keep one such step, or teach ${SCRIPTS_DIR}/${GUARD_NAME}.mjs the shape it has\n`
      + `       now — it is found by ${how}. Invariant 4 asserts WHERE the\n`
      + `       \`${ARTIFACT_GUARD}\` step sits, and both ends of that have to be real.`,
    );
  }
  return deploySteps.indexOf(found[0]);
}

const buildsAt = deployStepIndex(
  step => step.commands.some(command => BUILDS_THE_SITE.test(command)),
  'build the site',
  `a \`run:\` matching ${BUILDS_THE_SITE}`,
);
const uploadsAt = deployStepIndex(
  step => step.uses.some(value => UPLOADS_THE_ARTIFACT.test(value)),
  'upload the Pages artifact',
  `a \`uses:\` matching ${UPLOADS_THE_ARTIFACT}`,
);

const artifactGuardSteps = deploySteps.filter(step => step.invocations.includes(ARTIFACT_GUARD));

if (artifactGuardSteps.length === 0) {
  fail(
    DEPLOY_WORKFLOW,
    `never runs \`${SCRIPTS_DIR}/${ARTIFACT_GUARD}\``,
    `add a step running \`node ${SCRIPTS_DIR}/${ARTIFACT_GUARD}\` after "`
    + `${deploySteps[buildsAt].name}". This workflow has no \`needs:\` on ${WORKFLOW} and races `
    + `it on a push to main, and unlike lint and test — correctness someone else verified, which `
    + `does not change what ships — the props artifact is produced BY this build. Delete the `
    + `turbo edge that fills \`apps/site/generated/props/\` and this job builds from a fresh `
    + `checkout where that directory does not exist, matches zero files, and publishes every `
    + `package page saying it has no props table, while ${WORKFLOW} goes red beside it and stops `
    + 'nothing.',
  );
}

for (const step of artifactGuardSteps) {
  if (step.conditionalKeys.length > 0) {
    fail(
      `${DEPLOY_WORKFLOW}:${step.lineNumber} "${step.name}"`,
      `runs \`${SCRIPTS_DIR}/${ARTIFACT_GUARD}\` under `
      + `${step.conditionalKeys.map(({ key, lineNumber }) => `\`${key}:\` (:${lineNumber})`).join(' and ')}`,
      'drop that key. A guard the deploy may skip, or whose exit code it ignores, is in the '
      + 'file and out of the run — and this is the last gate the published bytes get.',
    );
  }

  const at = deploySteps.indexOf(step);
  if (at < buildsAt) {
    fail(
      `${DEPLOY_WORKFLOW}:${step.lineNumber} "${step.name}"`,
      `runs \`${SCRIPTS_DIR}/${ARTIFACT_GUARD}\` BEFORE "${deploySteps[buildsAt].name}" `
      + `(:${deploySteps[buildsAt].lineNumber})`,
      'move it after the build. `apps/site/generated/props/` is gitignored, so before the build '
      + 'it does not exist on a fresh checkout and the guard is asserting against the wrong '
      + 'run — it would fail every deploy for a reason that has nothing to do with what is '
      + 'about to ship.',
    );
  }
  if (at > uploadsAt) {
    fail(
      `${DEPLOY_WORKFLOW}:${step.lineNumber} "${step.name}"`,
      `runs \`${SCRIPTS_DIR}/${ARTIFACT_GUARD}\` AFTER "${deploySteps[uploadsAt].name}" `
      + `(:${deploySteps[uploadsAt].lineNumber})`,
      'move it above the upload. A guard that fails after the artifact has been uploaded has '
      + 'let the wrong bytes past the only gate they get; the job goes red and the pages are '
      + 'already staged for deployment.',
    );
  }
}

if (failures.length > 0) {
  console.error(
    `\n${GUARD_NAME}: ${failures.length} broken CI invariant(s)\n\n`
    + `${failures.map(f => `  ✗ ${f}`).join('\n\n')}\n`,
  );
  process.exit(1);
}

console.log(
  `${GUARD_NAME}: all four CI invariants hold\n`
  + `  cache salt — ${WORKFLOW} "${cacheStep.name}": ${RESTORE_KEYS_FIELD} \`${restoreValue}\` `
  + `is exactly the static portion of ${KEY_FIELD} \`${keyValue}\`\n`
  + `  guard set — ${everyGuard.length} guard(s) named by ${ON_DISK}, by ${IN_VERIFY} and by `
  + `${IN_WORKFLOW}: ${everyGuard.map(name => name.replace(/\.mjs$/, '')).join(', ')}\n`
  + `  ${SCRIPTS_DIR}/ lint — ${MANIFEST} \`${LINT_SCRIPTS_SCRIPT}\`, ${TURBO_CONFIG} task `
  + `\`${LINT_SCRIPTS_TASK}\` and \`${LINT_TASK}.dependsOn\` naming it, with inputs covering `
  + `${lintTargets.join(', ')}\n`
  + `  shipped artifact — ${DEPLOY_WORKFLOW} runs ${SCRIPTS_DIR}/${ARTIFACT_GUARD} in `
  + `"${artifactGuardSteps.map(step => step.name).join('", "')}", after "`
  + `${deploySteps[buildsAt].name}" and before "${deploySteps[uploadsAt].name}"`,
);
