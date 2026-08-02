#!/usr/bin/env node
// `ladle build` exits 0 on a failed build. This wrapper is the gate.
//
// @ladle/react 5.1.1 wraps vite's `build()` in a try/catch that logs the error
// and returns `false` (`lib/cli/vite-prod.js`); `lib/cli/build.js` ignores that
// return value and carries on — it writes `meta.json`, prints its timing line
// and resolves. So the process prints "✗ Build failed", writes a fresh
// `meta.json` listing every story it was asked to compile, and exits **0**.
// And because vite's `emptyOutDir` runs at write time, which is never reached,
// `build/` still holds the PREVIOUS bundle: on a warm tree the task reports
// success and ships a stale gallery.
//
// Reproduced against 5.1.1 by breaking an import in one story: exit code 0,
// `build/index.html` untouched, `build/meta.json` rewritten.
//
// That is the whole reason the gallery defines `build` at all. docs/plan.md
// leans on this task to catch a story that stops compiling, an alias that stops
// resolving, a decorator that breaks every story, and a
// `@pineappleui/theme/styles.css` specifier `tsc` cannot see — and all four are
// exactly what ladle swallows.
//
// Four checks, deliberately independent, because the two kinds can each miss on
// their own: a marker is a string in someone else's output, and an artifact
// timestamp says nothing about WHY:
//
//   1. the ladle process exited non-zero. It never does today; kept so that the
//      day upstream fixes this, the fix is what reports rather than this file
//   2. its output carries the failure marker, or is missing the success one.
//      Names the failure, and catches a build that failed before vite wrote
//      anything at all
//   3. `build/index.html` — what vite emits, and what it does NOT rewrite when
//      the build fails — has a different mtime than before this run. The one
//      artifact fact that does not depend on matching a string, and the one
//      that still holds if ladle's wording changes
//   4. `build/meta.json` parses and lists at least one story. It is the index
//      the gallery serves, so "the build succeeded" has to mean "it built the
//      stories" rather than "it emitted an empty page"
//
// Check 4 stops at "more than zero" on purpose: comparing the count against the
// story files on disk would be a second implementation of the glob
// `scripts/check-alias-fences.mjs` already owns, and two implementations of one
// rule is the drift this repo writes guards against.
//
// Ladle's output is captured rather than streamed, so it appears in one go when
// the build finishes instead of live. That is the cost of reading it.
//
//   node scripts/build.mjs

import { spawnSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const LADLE_BIN = 'ladle';
const OUT_DIR = 'build';
const META_FILE = 'meta.json';
const ENTRY_FILE = 'index.html';

// vite's logger prints "✗ Build failed in 378ms" and ladle prints
// "✓  Meta.json successfully created." whatever happened. Matched without the
// decoration, which is colour-coded and version-dependent.
const FAILURE_MARKER = 'Build failed';
const SUCCESS_MARKER = 'successfully';

const galleryDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const metaPath = path.join(galleryDir, OUT_DIR, META_FILE);
const entryPath = path.join(galleryDir, OUT_DIR, ENTRY_FILE);

/** @type {string[]} */
const problems = [];

/** mtime in ms, or null when the file is not there. */
function readMtime(filePath) {
  try {
    return statSync(filePath).mtimeMs;
  }
  catch {
    return null;
  }
}

const entryMtimeBefore = readMtime(entryPath);

// `ladle` resolves through the `node_modules/.bin` entries npm puts on PATH for
// a script it runs, which is how this is invoked (`npm run build`, or turbo
// running the same). Spawned rather than imported: `@ladle/react/build` exports
// the function whose return value the CLI already ignores, so there would be
// nothing to read.
const ladle = spawnSync(LADLE_BIN, ['build'], {
  cwd: galleryDir,
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
});

if (ladle.error) {
  console.error(
    `\ngallery build: could not run \`${LADLE_BIN} build\` (${ladle.error.message}).\n`
    + '  fix: run this through the package manager (`npm run build` in apps/gallery, or\n'
    + `       \`npx turbo run build\`), which is what puts ${LADLE_BIN} on PATH.\n`,
  );
  process.exit(1);
}

process.stdout.write(ladle.stdout ?? '');
process.stderr.write(ladle.stderr ?? '');

const output = `${ladle.stdout ?? ''}\n${ladle.stderr ?? ''}`;

if (ladle.status !== 0) {
  problems.push(`\`${LADLE_BIN} build\` exited ${ladle.status ?? `on signal ${ladle.signal}`}`);
}

if (output.includes(FAILURE_MARKER)) {
  problems.push(`its output contains "${FAILURE_MARKER}"`);
}

if (!output.includes(SUCCESS_MARKER)) {
  problems.push(`its output never says "${SUCCESS_MARKER}", so it did not finish`);
}

if (readMtime(entryPath) === entryMtimeBefore) {
  problems.push(
    `${OUT_DIR}/${ENTRY_FILE} was not rewritten by this run`
    + `${entryMtimeBefore === null ? ' (it does not exist)' : ''}, so what is in ${OUT_DIR}/ is `
    + 'the previous build',
  );
}

let storyCount = null;
try {
  const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
  storyCount = Object.keys(meta.stories ?? {}).length;
}
catch (error) {
  problems.push(`${OUT_DIR}/${META_FILE} could not be read as JSON (${error.message})`);
}

if (storyCount === 0) {
  problems.push(`${OUT_DIR}/${META_FILE} lists no stories`);
}

if (problems.length > 0) {
  console.error(
    `\ngallery build: the build did not succeed, whatever its exit code said\n\n`
    + `${problems.map(problem => `  ✗ ${problem}`).join('\n')}\n\n`
    + '  fix: read the ladle output above — the first error in it is the real one.\n'
    + `       \`${LADLE_BIN} build\` exits 0 even when vite fails (@ladle/react 5.1.1\n`
    + '       catches the error, logs it, and returns a value its own CLI ignores), so\n'
    + '       this wrapper exists to turn that back into a failed task. Without it a\n'
    + '       broken story, a dropped alias or a missing stylesheet ships a green build\n'
    + `       over the ${OUT_DIR}/ directory from last time.\n`,
  );
  process.exit(1);
}

console.log(
  `gallery build: OK — ${storyCount} story(ies) in ${OUT_DIR}/${META_FILE}, `
  + `${OUT_DIR}/${ENTRY_FILE} rewritten by this run.`,
);
