#!/usr/bin/env node
// Ref-test presence guard: a package that forwards a ref must have a test that
// proves the ref arrives.
//
// A forwarded ref is the one part of a pass-through wrapper that renders
// correctly while being broken. Every Phase 2 package is a two-line component —
// destructure a default, spread the rest into a Radix primitive — and the ref
// travels inside that spread:
//
//     export function Stack({ direction = 'column', ...rest }: StackProps) {
//       return <Flex direction={direction} {...rest} />;
//     }
//
// Stop spreading `rest`, name the props explicitly, wrap the component in a
// memo that drops it, and the component still renders, still lays out, still
// passes every class-name assertion in its test file — and every consumer's
// `ref` is silently null. Types do not help: React 19 puts `ref` in
// `ComponentPropsWithRef`, so an implementation that accepts the prop and never
// passes it on type-checks exactly as well as one that does.
//
// The gap this closes was found by reading test bodies rather than test names,
// and it was a gap of the plainest kind: `stack` and `inline` shipped no ref
// test at all, next to nine sibling packages that had one. Nothing reported it.
// A missing test is not a red line — it is one fewer green line among many, in a
// suite whose count nobody knows by heart. That is the shape this repo already
// refuses elsewhere (see `check-publish-contract`'s task coverage): a reviewer
// cannot catch an absence, only a check can.
//
// WHAT IS REQUIRED, AND HOW IT IS DERIVED
//
// The required set is derived from source, not enumerated here — an enumeration
// is a list to forget to extend, and the package somebody forgets is the new one
// with no test. A workspace must have a ref test when any of its `src/` sources
// carries a ref-forwarding marker:
//
//   - `ComponentPropsWithRef<…>` — React's ref-carrying props type, and the form
//     all ten wrapper packages use. Declaring it IS the ref contract: the
//     component's public props include `ref`, so a consumer may pass one.
//   - `forwardRef` — the pre-React-19 form. Nothing here uses it today; it is
//     matched so that a package written in it does not slip through as "no
//     marker found".
//   - `export { … } from '@radix-ui/themes'` — a Radix component re-exported
//     whole rather than wrapped. `text-field` is this: it ships `TextField.Root`,
//     whose ref Radix composes onto the inner `<input>`.
//
// Markers are matched against comment-stripped source, because the comment
// `// React 19: ref is a regular prop, no forwardRef needed` sits in four of
// these packages and would otherwise classify a package by its prose.
//
// AND WHAT REFUSES RATHER THAN PASSES
//
// A marker list can only be trusted if a package it does not match is *known*
// not to forward a ref, rather than merely unmatched — otherwise every future
// component silently joins the exempt set and this guard shrinks to whatever it
// happened to recognise. So a workspace that LOOKS like a React component
// package — it has a non-test, non-story `.tsx` under `src/`, i.e. it renders
// JSX outside a test — and matches no marker must say so in its own manifest,
// in the same shape `check-publish-contract` already uses for a declared task
// omission:
//
//     "pineapple": { "refTestNotApplicable": "<why nothing here takes a ref>" }
//
// Undeclared and unmatched is a REFUSAL, not a pass. So is a package that
// declares the opt-out and matches a marker anyway (the declaration is false),
// and so is a marker set that matches zero packages (a guard that scanned
// nothing reports green over everything).
//
// One limit, named rather than papered over: the "looks like a component
// package" gate is the presence of a `.tsx`, so a component written without JSX
// — `createElement` in a `.ts` — is gated out and, if it also carries no marker,
// is neither required nor asked to declare. Markers themselves are read from
// `.ts` as well as `.tsx`, so such a package still lands in the required set the
// moment it types its props the way every package here does. If one ever ships
// that does neither, widen the gate; do not add it to an allowlist.
//
// WHAT COUNTS AS THE TEST
//
// The convention is the one the nine existing tests already share — a title
// starting `forwards refs to the underlying`, a `ref={…}` on the rendered
// component, and a `toBeInstanceOf(HTML…Element)` on what came back. All three
// are read out of the SAME `it(…)` call, extracted by matching its parentheses,
// so a title in one test and an assertion in another does not satisfy it.
//
// What this cannot judge is whether the assertion names the RIGHT element:
// `HTMLElement` passes here and is the weaker assertion `docs/plan.md` records a
// delta for. That is a review question — a wrong assertion is visible in a diff.
// An absent test is not, which is the whole subject of this file.
//
// Reads source and test files only, no `dist/`, so it runs BEFORE
// `turbo run build` in both `verify` and CI.
//
//   node scripts/check-ref-tests.mjs

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { listWorkspaceDirs } from './workspace-globs.mjs';

const GUARD_NAME = 'check-ref-tests';

// Every workspace keeps its code in `src/`. A workspace without one owns no
// component sources to classify.
const SOURCE_DIR = 'src';

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);
const COMPONENT_EXTENSION = '.tsx';

// Neither a test nor a story defines the package's component. A story that
// happens to write `ComponentPropsWithRef` describes the component; it is not a
// second one.
const NOT_A_SOURCE = /\.(?:test|stories)\.[cm]?[jt]sx?$/;

const TEST_FILE = /\.test\.[cm]?[jt]sx?$/;

// The three ways a package here declares that its public props carry a ref.
// Matched against comment-stripped source — see the header on why.
const REF_MARKERS = [
  {
    label: 'ComponentPropsWithRef<…>',
    pattern: /\bComponentPropsWithRef\s*</,
  },
  {
    label: 'forwardRef',
    pattern: /\bforwardRef\b/,
  },
  {
    label: 'export … from \'@radix-ui/themes\'',
    pattern: /\bexport\s*\{[^}]*\}\s*from\s*['"]@radix-ui\/themes['"]/,
  },
];

// Where a workspace declares that nothing it exports takes a ref, and why:
//   "pineapple": { "refTestNotApplicable": "<reason>" }
// The namespace is the one check-publish-contract's task opt-out already uses.
const OPT_OUT_NAMESPACE = 'pineapple';
const OPT_OUT_FIELD = 'refTestNotApplicable';
const OPT_OUT_PATH = `${OPT_OUT_NAMESPACE}.${OPT_OUT_FIELD}`;

// A reason has to say something. Matches check-publish-contract's threshold, for
// the same reason: "n/a" is an undeclared omission wearing a declaration's
// clothes.
const MIN_REASON_LENGTH = 20;

// Every test title in a file, whichever quote it is written in. Enumerating them
// all — rather than searching for the one — is what lets a failure print the
// titles that ARE there, which is the difference between "no ref test" and "no
// ref test, and here is what this file does assert".
//
// The lookbehind keeps `/re/.test('…')` from reading as a test declaration, and
// it also means `it.skip('forwards refs…')` does not match — which is the right
// answer twice over, since a skipped ref test is not a ref test.
const TEST_TITLE = /(?<![.\w])(?:it|test)\s*\(\s*(['"])((?:(?!\1).)*)\1/g;

// The shared opening of all nine existing ref-test titles. A prefix rather than
// a full spelling: `box` writes "…the underlying element", `badge` "…the
// underlying span element", `text-field` "…the underlying input element", and
// naming the element is the useful half of the convention, not a deviation from
// it. Lower-case, so `test/prefer-lowercase-title` is satisfied by construction.
const REF_TEST_TITLE_PREFIX = 'forwards refs to the underlying';

// The two things the test body has to do. A title alone is a claim; these are
// the assertion that the claim was executed.
const REF_ATTACHED = /\bref=\{/;
const REF_ASSERTED = /\btoBeInstanceOf\(\s*HTML[A-Za-z]*Element\s*\)/;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @type {string[]} */
const failures = [];

/**
 * A condition under which this guard cannot report on the repo at all: it exits
 * immediately rather than printing a pass over what it could not classify.
 *
 * @param {string} message problem and fix, already formatted
 * @returns {never}
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
 * Comments are prose, and prose about a ref is not a ref. Four packages here
 * carry `// React 19: ref is a regular prop, no forwardRef needed`, which would
 * otherwise classify them by their explanation rather than by their code.
 *
 * JS/TS only — this guard reads no CSS or HTML — and deliberately local rather
 * than shared: `scripts/workspace-globs.mjs` is the module for what a workspace
 * IS, and a second shared module for four lines of regex would couple more than
 * it removes.
 *
 * @param {string} source
 * @returns {string}
 */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/**
 * Every file under a directory, recursively, repo-root-relative.
 *
 * @param {string} relDir
 * @returns {string[]} sorted; empty when the directory does not exist
 */
function listFilesUnder(relDir) {
  /** @type {string[]} */
  const found = [];

  /** @param {string} current */
  function walk(current) {
    let entries;
    try {
      entries = readdirSync(path.join(repoRoot, current), { withFileTypes: true });
    }
    catch {
      return;
    }
    for (const entry of entries) {
      const relPath = `${current}/${entry.name}`;
      if (entry.isDirectory()) walk(relPath);
      else if (entry.isFile()) found.push(relPath);
    }
  }

  walk(relDir);
  return found.sort();
}

/**
 * The arguments of a call, read from its opening parenthesis to the matching
 * close — strings, template literals and comments skipped so a `)` inside one
 * does not end the call early.
 *
 * Returns null when the parentheses do not balance, which the caller turns into
 * a REFUSAL rather than a guess. This reader does not lex regex literals: a
 * quote character inside one (`/[^']/`) would be read as opening a string. That
 * shape appears in no ref test here, and the failure mode is a refusal naming
 * this function, not a silent pass.
 *
 * @param {string} source
 * @param {number} openParen index of the `(`
 * @returns {string|null}
 */
function readCallArguments(source, openParen) {
  let depth = 0;

  for (let i = openParen; i < source.length; i++) {
    const char = source[i];

    if (char === '\'' || char === '"' || char === '`') {
      const closing = skipStringLiteral(source, i);
      if (closing === -1) return null;
      i = closing;
      continue;
    }
    if (char === '/' && source[i + 1] === '/') {
      const newline = source.indexOf('\n', i);
      if (newline === -1) return null;
      i = newline;
      continue;
    }
    if (char === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      if (end === -1) return null;
      i = end + 1;
      continue;
    }

    if (char === '(') depth++;
    else if (char === ')') {
      depth--;
      if (depth === 0) return source.slice(openParen + 1, i);
    }
  }

  return null;
}

/**
 * @param {string} source
 * @param {number} openQuote index of the opening quote
 * @returns {number} index of the closing quote, or -1 if the literal never closes
 */
function skipStringLiteral(source, openQuote) {
  const quote = source[openQuote];
  for (let i = openQuote + 1; i < source.length; i++) {
    if (source[i] === '\\') {
      i++;
      continue;
    }
    if (source[i] === quote) return i;
  }
  return -1;
}

/**
 * Every test in a file, as its title and where its `it(…)` call opens. The body
 * is NOT read here: parsing is the expensive, fallible half, and it is only owed
 * for the one test this guard is about.
 *
 * @param {string} source
 * @returns {{ title: string, openParen: number }[]}
 */
function listTests(source) {
  return [...source.matchAll(TEST_TITLE)].map(match => ({
    title: match[2],
    openParen: source.indexOf('(', match.index),
  }));
}

/**
 * The body of one ref test, or a refusal.
 *
 * Called only for a title that already matched the ref-test convention, which is
 * what keeps this reader pointed at bodies of a known shape. It was not always:
 * reading every test in the repo walked it straight into
 * `packages/theme/src/getFoucScript.test.ts`, whose `literal.replace(/'/g, '"')`
 * is a regex literal holding a quote — legitimate code this reader cannot lex,
 * and refusing on it would have failed a clean repo over a test that has nothing
 * to do with refs.
 *
 * @param {string} relPath for the refusal message
 * @param {string} source
 * @param {{ title: string, openParen: number }} test
 * @returns {string}
 */
function readTestBody(relPath, source, test) {
  const body = readCallArguments(source, test.openParen);

  if (body === null) {
    refuse(
      `could not read the \`it(…)\` call for "${test.title}" in ${relPath} — its\n`
      + 'parentheses do not balance as far as this reader is concerned.\n'
      + `  fix: this guard extracts a ref test's body by matching parentheses (see\n`
      + `       \`readCallArguments()\` in scripts/${GUARD_NAME}.mjs), skipping strings and\n`
      + '       comments but NOT regex literals — a quote inside one reads as a string that\n'
      + '       never closes. Rewrite the assertion without it, or teach the reader that\n'
      + '       shape. It refuses rather than guessing: a body it read wrongly is a ref test\n'
      + '       reported present or absent on the strength of a mis-parse.',
    );
  }

  return body;
}

/**
 * @param {unknown} manifest
 * @returns {unknown} the raw opt-out value, whatever shape it is in
 */
function readOptOut(manifest) {
  return manifest?.[OPT_OUT_NAMESPACE]?.[OPT_OUT_FIELD];
}

const workspaceDirs = listWorkspaceDirs(GUARD_NAME);

/**
 * Every workspace, classified. `markers` is what its sources declare;
 * `looksLikeComponents` is whether it renders JSX outside a test or a story.
 *
 * @type {{ relDir: string, name: string, markers: string[], looksLikeComponents: boolean, optOut: unknown, testFiles: string[] }[]}
 */
const workspaces = [];
let scannedSourceFiles = 0;

for (const relDir of workspaceDirs) {
  const manifest = JSON.parse(readFileSync(path.join(repoRoot, relDir, 'package.json'), 'utf8'));

  const srcDir = `${relDir}/${SOURCE_DIR}`;
  let hasSrc = true;
  try {
    if (!statSync(path.join(repoRoot, srcDir)).isDirectory()) hasSrc = false;
  }
  catch {
    hasSrc = false;
  }

  const files = hasSrc ? listFilesUnder(srcDir) : [];
  const sourceFiles = files.filter(
    relPath => SOURCE_EXTENSIONS.has(path.extname(relPath)) && !NOT_A_SOURCE.test(relPath),
  );
  const testFiles = files.filter(relPath => TEST_FILE.test(relPath));

  scannedSourceFiles += sourceFiles.length;

  const markers = new Set();
  for (const relPath of sourceFiles) {
    const source = stripComments(readFileSync(path.join(repoRoot, relPath), 'utf8'));
    for (const marker of REF_MARKERS) {
      if (marker.pattern.test(source)) markers.add(marker.label);
    }
  }

  workspaces.push({
    relDir,
    name: manifest.name ?? relDir,
    markers: [...markers].sort(),
    looksLikeComponents: sourceFiles.some(
      relPath => path.extname(relPath) === COMPONENT_EXTENSION,
    ),
    optOut: readOptOut(manifest),
    testFiles,
  });
}

// A scan of nothing passes everything. Both counts below are the guard reporting
// on its own reach rather than on the repo.
if (scannedSourceFiles === 0) {
  refuse(
    `matched 0 source file(s) across ${workspaceDirs.length} workspace(s).\n`
    + `  fix: this guard reads ${[...SOURCE_EXTENSIONS].join(', ')} files under each workspace's\n`
    + `       ${SOURCE_DIR}/ that are neither tests nor stories. Matching none means it is inert,\n`
    + '       not that the repo is clean — if the layout moved, teach this file the new one.',
  );
}

const required = workspaces.filter(workspace => workspace.markers.length > 0);
const declaredExempt = workspaces.filter(
  workspace => workspace.markers.length === 0 && workspace.optOut !== undefined,
);
const unclassified = workspaces.filter(
  workspace => workspace.markers.length === 0
    && workspace.optOut === undefined
    && workspace.looksLikeComponents,
);
const contradictory = workspaces.filter(
  workspace => workspace.markers.length > 0 && workspace.optOut !== undefined,
);

if (required.length === 0) {
  refuse(
    `no workspace matched any ref-forwarding marker, so this guard would require\n`
    + 'a ref test of nobody and report success.\n'
    + `  markers: ${REF_MARKERS.map(marker => marker.label).join(', ')}\n`
    + `  fix: if the packages here stopped declaring their props with\n`
    + '       `ComponentPropsWithRef` — a codemod, a move to a shared props type — teach\n'
    + `       REF_MARKERS in scripts/${GUARD_NAME}.mjs the new shape. If nothing in this repo\n`
    + '       forwards a ref any more, delete this guard rather than leaving it passing over\n'
    + '       a set it no longer matches.',
  );
}

if (unclassified.length > 0) {
  refuse(
    `${unclassified.length} workspace(s) render JSX outside a test or a story and match no\n`
    + 'ref-forwarding marker, so this guard cannot tell a component that takes no ref from\n'
    + `one whose ref contract it failed to recognise: ${unclassified.map(w => w.name).join(', ')}\n`
    + `  markers: ${REF_MARKERS.map(marker => marker.label).join(', ')}\n`
    + '  fix: if the package DOES forward a ref, type its props with\n'
    + `       \`ComponentPropsWithRef<typeof …>\` — or teach REF_MARKERS in scripts/${GUARD_NAME}.mjs\n`
    + '       the form it uses. If it does not, declare that in its own package.json:\n'
    + `       \`"${OPT_OUT_NAMESPACE}": { "${OPT_OUT_FIELD}": "<why nothing here takes a ref>" }\`.\n`
    + '       Refused rather than skipped on purpose: an unmatched package would otherwise\n'
    + '       join the exempt set silently, and this guard would shrink to whatever it\n'
    + '       happened to recognise while printing the same pass.',
  );
}

if (contradictory.length > 0) {
  refuse(
    `${contradictory.length} workspace(s) declare ${OPT_OUT_PATH} and forward a ref anyway:\n`
    + `${contradictory.map(w => `    ${w.name} — ${w.markers.join(', ')}`).join('\n')}\n`
    + `  fix: remove ${OPT_OUT_PATH} from that package.json and add the ref test. The\n`
    + '       declaration says nothing here takes a ref; the source says otherwise, and a\n'
    + '       false declaration is worse than none — it exempts the package from this guard\n'
    + '       for as long as nobody re-reads it.',
  );
}

for (const workspace of declaredExempt) {
  const reason = workspace.optOut;
  if (typeof reason !== 'string' || reason.trim().length < MIN_REASON_LENGTH) {
    fail(
      workspace.name,
      `${OPT_OUT_PATH} is ${JSON.stringify(reason)}, which does not explain anything`,
      `give a real reason (at least ${MIN_REASON_LENGTH} characters) in `
      + `${workspace.relDir}/package.json saying why nothing this package exports takes a `
      + 'ref. The point of the declaration is that the next reader can tell a deliberate '
      + 'gap from an oversight.',
    );
  }

  const strayRefTests = workspace.testFiles.filter((relPath) => {
    const source = readFileSync(path.join(repoRoot, relPath), 'utf8');
    return listTests(source).some(test => test.title.startsWith(REF_TEST_TITLE_PREFIX));
  });

  if (strayRefTests.length > 0) {
    fail(
      workspace.name,
      `declares ${OPT_OUT_PATH} but ${strayRefTests.join(', ')} `
      + 'already tests a forwarded ref',
      `remove ${OPT_OUT_PATH} from ${workspace.relDir}/package.json. The test is the `
      + 'evidence that this package does forward a ref, so the declaration is false and '
      + 'keeps the package out of this guard for as long as it stands.',
    );
  }
}

for (const workspace of required) {
  if (workspace.testFiles.length === 0) {
    fail(
      workspace.name,
      `forwards a ref (${workspace.markers.join(', ')}) and has no test file at all`,
      `add ${workspace.relDir}/${SOURCE_DIR}/<Component>.test.tsx with a test titled `
      + `\`${REF_TEST_TITLE_PREFIX} element\`, rendering the component with a \`ref={…}\` `
      + 'callback and asserting `toBeInstanceOf(HTMLDivElement)` (or whichever element it '
      + 'renders) on what came back. Copy packages/box/src/Box.test.tsx.',
    );
    continue;
  }

  /** @type {string[]} */
  const titlesSeen = [];
  /** @type {{ relPath: string, body: string }[]} */
  const refTests = [];

  for (const relPath of workspace.testFiles) {
    const source = readFileSync(path.join(repoRoot, relPath), 'utf8');
    for (const test of listTests(source)) {
      titlesSeen.push(test.title);
      if (test.title.startsWith(REF_TEST_TITLE_PREFIX)) {
        refTests.push({ relPath, body: readTestBody(relPath, source, test) });
      }
    }
  }

  if (refTests.length === 0) {
    fail(
      workspace.name,
      `forwards a ref (${workspace.markers.join(', ')}) and no test says so — `
      + `${titlesSeen.length} test(s) in ${workspace.testFiles.join(', ')}, none of them `
      + `titled \`${REF_TEST_TITLE_PREFIX}…\``
      + (titlesSeen.length > 0 ? `\n    what is asserted instead: ${titlesSeen.map(t => `"${t}"`).join(', ')}` : ''),
      `add a test titled \`${REF_TEST_TITLE_PREFIX} element\` (name the element when it is `
      + 'not a div, as `badge` and `text-field` do), rendering the component with a '
      + '`ref={…}` callback and asserting `toBeInstanceOf(HTML…Element)` on what came back. '
      + 'Copy packages/box/src/Box.test.tsx. The class-name assertions above it all pass '
      + 'against a component that accepts `ref` and drops it — that is the whole reason '
      + 'this one has to exist separately.',
    );
    continue;
  }

  // Present in name is not present in fact. Both halves are read out of the same
  // `it(…)`, so a title over an empty body — or over a body that renders without
  // attaching anything — fails here rather than counting.
  const attached = refTests.filter(test => REF_ATTACHED.test(test.body));
  if (attached.length === 0) {
    fail(
      workspace.name,
      `has a \`${REF_TEST_TITLE_PREFIX}…\` test in `
      + `${refTests.map(t => t.relPath).join(', ')} that never attaches a ref`,
      'render the component with `ref={(el) => { received = el; }}` inside that test. A '
      + 'ref test that does not pass a ref asserts nothing about forwarding, and it is '
      + 'green — which is exactly the shape this guard exists to stop.',
    );
    continue;
  }

  if (!attached.some(test => REF_ASSERTED.test(test.body))) {
    fail(
      workspace.name,
      `has a \`${REF_TEST_TITLE_PREFIX}…\` test in `
      + `${attached.map(t => t.relPath).join(', ')} that attaches a ref and never asserts `
      + 'what arrived',
      'assert `expect(received).toBeInstanceOf(HTMLDivElement)` — or whichever element the '
      + 'component renders — inside that test. Name the concrete element rather than '
      + '`HTMLElement`: per `docs/plan.md` §Deltas, `HTMLElement` holds for whatever the '
      + 'component turns into next, so it would not catch the element changing underneath '
      + 'the package.',
    );
  }
}

if (failures.length > 0) {
  console.error(
    `\n${GUARD_NAME}: ${failures.length} missing or hollow ref test(s)\n\n`
    + `${failures.map(entry => `  ✗ ${entry}`).join('\n\n')}\n`,
  );
  process.exit(1);
}

const exemptSummary = declaredExempt.length > 0
  ? declaredExempt.map(workspace => workspace.name).join(', ')
  : 'none';

console.log(
  `${GUARD_NAME}: ${required.length} ref-forwarding package(s), each with its ref test\n`
  + `  ${scannedSourceFiles} source file(s) scanned across ${workspaceDirs.length} workspace(s)\n`
  + `  declared ${OPT_OUT_PATH}: ${exemptSummary}`,
);
