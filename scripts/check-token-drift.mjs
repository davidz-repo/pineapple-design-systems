#!/usr/bin/env node
// Token-drift guard: nothing outside @pineappleui/tokens may re-type a list that
// the tokens package already owns.
//
// This exists because the drift it catches has already shipped twice, silently.
// The upstream monorepo's FOUC script hard-codes its accent list as an ES5 string:
//
//     var ACCENT_COLORS = ['indigo', 'violet', 'teal', 'orange', 'crimson'];
//     ... prefs.accentColor : 'indigo';
//
// Both lines are wrong now. `bronze` was added to the real list and never added
// here, and `bronze` became the default while this still says `indigo`. Nothing
// failed. Types cannot help: the list lives inside a string, so tsc sees a string.
// Tests cannot help either, unless someone thinks to write the test that compares
// two lists nobody knows are supposed to match.
//
// The premise that made this look unavoidable — "the FOUC script cannot import,
// it runs before the bundle" — is false, and the fix is already written in the
// other consuming app: the GENERATED script cannot import, but the GENERATOR is
// an ordinary module that can.
//
//     import { ACCENT_COLORS, GRAY_BY_ACCENT, DEFAULT_PREFERENCES } from './tokens';
//     var ACCENT_COLORS = ${JSON.stringify([...ACCENT_COLORS])};
//
// One list, serialized at build time. Derivation is always available; hand-typing
// is always a choice.
//
// DELIBERATELY NO ALLOWLIST.
// An allowlist is where drift hides: the one file that "has to" hard-code the list
// is precisely the file that drifted. The only exemption is structural — the tokens
// package itself, which is the definition site and must contain the list to be it.
// That is derived from the package location, not enumerated here.
//
// Run it *after* `turbo run build` — the vocabulary is read from the built tokens.
//
//   node scripts/check-token-drift.mjs

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

// The package that owns every list checked here. Its own sources are the
// definition site: exempt structurally, by path, never by name.
const TOKENS_PKG_DIR = 'packages/tokens';
const TOKENS_ENTRY = `${TOKENS_PKG_DIR}/dist/index.mjs`;

// Code only. A list that drifts in code changes behaviour silently; the same
// list in prose is visible in review and executes nothing, so .md is out of
// scope on purpose rather than by omission.
const SCANNED_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css', '.html', '.json',
]);

// Two members of one list is a copy of that list. One is a legitimate single
// reference — `<Badge accentColor="bronze">` names a colour, it does not restate
// the set of colours.
const COPY_THRESHOLD = 2;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @type {string[]} */
const failures = [];

/**
 * Every string a token collection contributes to the vocabulary, grouped by the
 * export it came from. Grouping matters: a file holding one accent name and one
 * gray name has not copied either list, but a file holding two accent names has.
 *
 * Arrays contribute their string members. Plain objects contribute their keys
 * *and* their string values — a gray-by-accent map drifts on either side.
 *
 * @param {Record<string, unknown>} tokens
 * @returns {Map<string, Set<string>>} export name -> members
 */
function collectVocabulary(tokens) {
  const vocabulary = new Map();

  for (const [exportName, value] of Object.entries(tokens)) {
    const members = new Set();

    if (Array.isArray(value)) {
      for (const member of value) {
        if (typeof member === 'string') members.add(member);
      }
    }
    else if (value !== null && typeof value === 'object') {
      for (const [key, member] of Object.entries(value)) {
        members.add(key);
        if (typeof member === 'string') members.add(member);
      }
    }

    if (members.size >= COPY_THRESHOLD) vocabulary.set(exportName, members);
  }

  return vocabulary;
}

/**
 * Comments are prose. A header explaining that bronze superseded violet is
 * documentation, not a second copy of the list, and failing it would teach
 * people to delete the explanation rather than the duplication.
 *
 * Imperfect by construction — a `//` inside a string literal ends that line
 * early. Both directions are acceptable here: over-stripping can only hide a
 * finding that the same list would also trigger elsewhere in the file, and
 * under-stripping surfaces a name for a human to look at.
 *
 * @param {string} source
 * @returns {string}
 */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ') // /* block */, also covers CSS
    .replace(/<!--[\s\S]*?-->/g, ' ') // <!-- html -->
    .replace(/(^|[^:])\/\/.*$/gm, '$1'); // // line, sparing the // in a URL
}

/** Tracked files only — never node_modules/, never dist/, never a build artefact. */
function listTrackedFiles() {
  const stdout = execFileSync('git', ['ls-files', '-z'], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  return stdout.split('\0').filter(Boolean);
}

const tokensEntryPath = path.join(repoRoot, TOKENS_ENTRY);
let tokens;
try {
  tokens = await import(pathToFileURL(tokensEntryPath).href);
}
catch (error) {
  console.error(
    `\ncheck-token-drift: could not import ${TOKENS_ENTRY}.\n`
    + '  fix: run `npx turbo run build` first — this guard reads the vocabulary it\n'
    + '       enforces from the built tokens package, so that the guard and the\n'
    + '       packages it checks can never disagree about what the list is.\n',
  );
  console.error(error);
  process.exit(1);
}

const vocabulary = collectVocabulary(tokens);

// A guard that checks an empty vocabulary reports green over everything. That is
// the failure mode this repo already refuses elsewhere: a check that ran nothing
// is not a pass. Fail instead of passing vacuously.
if (vocabulary.size === 0) {
  console.error(
    `\ncheck-token-drift: ${TOKENS_ENTRY} exports no collection with `
    + `${COPY_THRESHOLD} or more string members, so this guard would scan for nothing `
    + 'and report success.\n'
    + '  fix: either export the shared list from the tokens package, or delete this\n'
    + '       guard. Do not leave it passing — it would certify every future package\n'
    + '       as drift-free without ever having looked for drift.\n',
  );
  process.exit(1);
}

const scannedFiles = listTrackedFiles().filter((relPath) => {
  if (!SCANNED_EXTENSIONS.has(path.extname(relPath))) return false;
  // The definition site. Structural: this package must contain the lists in
  // order to be the thing every other package derives them from.
  if (relPath === `${TOKENS_PKG_DIR}/package.json`) return true;
  return !relPath.startsWith(`${TOKENS_PKG_DIR}/`);
});

if (scannedFiles.length === 0) {
  console.error(
    '\ncheck-token-drift: matched 0 files to scan.\n'
    + '  fix: this guard only sees git-tracked files with these extensions: '
    + `${[...SCANNED_EXTENSIONS].join(', ')}.\n`
    + '       Matching nothing means the guard is inert, not that the repo is clean.\n',
  );
  process.exit(1);
}

let skippedMissing = 0;

for (const relPath of scannedFiles) {
  // The index can list a file that is not on disk — `git add -N` then deleted, a
  // `git rm --cached`, a half-finished rebase. That is a working-tree state, not
  // drift, so skip it. Counted, not swallowed: the pass line reports the skips so
  // a scan that quietly shrank is visible rather than looking like a clean repo.
  let raw;
  try {
    raw = readFileSync(path.join(repoRoot, relPath), 'utf8');
  }
  catch (error) {
    if (error.code === 'ENOENT') {
      skippedMissing++;
      continue;
    }
    throw error;
  }

  const source = stripComments(raw);

  for (const [exportName, members] of vocabulary) {
    const found = [...members]
      .filter(member => new RegExp(`\\b${member}\\b`).test(source))
      .sort();

    if (found.length < COPY_THRESHOLD) continue;

    failures.push(
      `${relPath}: restates ${found.length} member(s) of ${exportName} `
      + `(${found.join(', ')})\n`
      + `    fix: import ${exportName} from @pineappleui/tokens instead of writing the\n`
      + '         members out. If this is a string the browser runs before any bundle\n'
      + '         loads (a FOUC script), the generator is still an ordinary module:\n'
      + `         serialize the real list with \`\${JSON.stringify([...${exportName}])}\`\n`
      + '         rather than hand-typing it. A hand-typed copy does not fail when it\n'
      + '         falls out of date — that is why this check exists.',
    );
  }
}

if (failures.length > 0) {
  console.error(
    `\ncheck-token-drift: ${failures.length} hard-coded token list(s)\n\n`
    + `${failures.map(f => `  ✗ ${f}`).join('\n\n')}\n`,
  );
  process.exit(1);
}

const vocabularySummary = [...vocabulary]
  .map(([exportName, members]) => `${exportName}(${members.size})`)
  .join(', ');

console.log(
  `check-token-drift: ${scannedFiles.length - skippedMissing} file(s) scanned, `
  + 'no hard-coded token lists\n'
  + `  vocabulary read from ${TOKENS_ENTRY}: ${vocabularySummary}\n`
  + `  definition site exempt: ${TOKENS_PKG_DIR}/`
  + (skippedMissing > 0 ? `\n  ${skippedMissing} indexed file(s) absent from the working tree, skipped` : ''),
);
