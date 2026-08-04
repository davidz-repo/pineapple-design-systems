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
//   - a props interface that `extends` something — `interface IconProps extends
//     Omit<LucideProps, …>`. A props type built on an imported one INHERITS that
//     type's `ref`: `icons` picks up `RefAttributes<SVGSVGElement>` through the
//     `Omit` (which removes `size` and the a11y props, not `ref`), the prop rides
//     in `...rest` onto the Lucide glyph — itself a `forwardRef` component — and
//     `<Icon ref={…}>` gets a real `<svg>` back. Nothing in the package's own
//     source spells `ref` anywhere, which is exactly how `icons` came to carry a
//     `refTestNotApplicable` that was false.
//   - a `ref` prop written out by hand, or any of React's ref TYPES —
//     `ref?: Ref<HTMLElement>`, `RefObject<…>`, `ElementRef<…>`,
//     `RefAttributes<…>`, `MutableRefObject<…>`. Nothing here matches this today,
//     and that is the point: it is the same blind spot `icons` sat in, reached
//     from the other side. A package that declares its own props (so no
//     `extends` to inherit through) and then adds a `ref` to them by hand would
//     match none of the four above. `live-region` is one edit away from being
//     exactly that shape.
//
// Markers are matched against comment-stripped source, because the comment
// `// React 19: ref is a regular prop, no forwardRef needed` sits in five of
// these packages (`card`, `button`, `heading`, `icon-button`, `text`) and would
// otherwise classify a package by its prose.
//
// All of this reads `src/` and nothing else, which is a gate as much as a scope:
// `apps/gallery`'s only `.tsx` is `.ladle/components.tsx`, outside `src/`, so
// that workspace is never scanned for a marker and never asked to declare
// anything. That is the right answer for a gallery app — it publishes no
// component — but it is a gate, not a finding: a workspace that keeps components
// outside `src/` is invisible here, exactly as one written without JSX is.
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
// Read that contradiction check for exactly what it is: it catches a FALSE
// opt-out only as far as REF_MARKERS reaches. `check-publish-contract`'s
// equivalent is total — it asks whether the declared-missing script exists, and
// the answer is in the manifest — so a reader who has met that one will overrate
// this one. This is the weaker shape: a package whose ref contract no marker
// recognises can declare `refTestNotApplicable` and be believed. `icons` was
// that package, for one commit, with `<Icon ref={…}>` returning an
// `SVGSVGElement` the whole time. The marker above is what makes that shape
// visible; the next one of its kind is visible only once a marker is written for
// it, so widening REF_MARKERS is how this check gets stronger, and there is no
// version of it that is done.
//
// The `interface …Props extends …` marker also over-matches, and that direction
// has NO escape hatch by design. `interface FooProps extends SomeRefFreeBase`
// lands in the required set on the strength of the `extends` alone — this reads
// headings, not type graphs — and the opt-out cannot rescue it: a declared
// `refTestNotApplicable` next to a matched marker is the contradictory REFUSAL
// two paragraphs up. The intended exit is to edit the marker set, in a commit
// that says which shape stopped meaning what it meant. That is deliberately the
// loud, rare move: an over-match costs one argued commit, and the under-match it
// replaced cost a package a false opt-out that nobody re-read.
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
// The convention is the one every existing ref test already shares — a title
// starting `forwards refs to the underlying`, a ref CALLBACK that assigns what
// arrived to a local, and a `toBeInstanceOf(HTML…Element)` on THAT local:
//
//     let received: HTMLDivElement | null = null;
//     render(<Box ref={(el) => { received = el; }}>ref</Box>);
//     expect(received).toBeInstanceOf(HTMLDivElement);
//
// All of it is read out of the SAME `it(…)` call, extracted by matching its
// parentheses, so a title in one test and an assertion in another does not
// satisfy it — and the identifier the callback assigns is read out of the
// callback and required to be the identifier `expect(…)` is given. The three
// pieces have to be one chain, because each pair of them without the third is a
// green test asserting nothing: a `ref={() => {}}` next to
// `expect(container.firstChild).toBeInstanceOf(HTMLDivElement)` attaches a ref,
// asserts an element, and would pass a component that drops every ref on the
// floor. That body is what this file is here to fail, so a ref-titled test whose
// shape this cannot read is a FAILURE naming the convention, never a skip.
//
// The body is comment-stripped before any of it is matched. A test body is prose
// as much as source — `stack`'s and `inline`'s carry five lines explaining what
// the ref rides in — and matching `ref={` against a comment ABOUT `ref={` is the
// same defect as classifying a package by its `// React 19:` note.
//
// Three things remain out of reach, all narrower than what they replaced:
//
//   - whether the assertion names the RIGHT element. `HTMLElement` passes here
//     and is the weaker assertion `docs/plan.md` records a delta for. A wrong
//     assertion is visible in a diff; an absent test is not, which is the whole
//     subject of this file.
//   - the linkage is by NAME. `received` in the callback and `received` in the
//     `expect(…)` are matched as identifiers, not resolved as bindings, so a body
//     that assigned the ref to one `received` and asserted a different, unrelated
//     variable of the same name would still satisfy this. Writing that takes
//     deliberate effort in a ten-line test; writing the no-op body above took
//     none, which is the difference that decided where to stop.
//   - the quantifier is SOME, not every. One conforming ref-titled test satisfies
//     the package, so a second ref-titled test that is hollow rides along
//     untouched. That is the same quantifier every other check in this file uses,
//     and the subject here is a package with NO proof of forwarding rather than a
//     package with one proof and one dud — but it does mean a green line from
//     this guard says "at least one ref test holds", never "every test titled
//     like one does".
//
// Reads source and test files only, no `dist/`, so it runs BEFORE
// `turbo run build` in both `verify` and CI.
//
//   node scripts/check-ref-tests.mjs

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

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

// The five ways a package here declares that its public props carry a ref.
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
  {
    // `[^{]+` cannot cross a `{`, so the `extends` has to belong to THIS
    // interface's heading rather than to anything later in the file. That is
    // what keeps it off `live-region`'s and `theme`'s own `…Props` interfaces,
    // which declare their members and extend nothing — they own every prop they
    // take, so there is no imported `ref` to inherit.
    label: 'interface …Props extends …',
    pattern: /\binterface\s+\w*Props\b[^{]+\bextends\b/,
  },
  {
    // The hand-written route: a package that spells the prop out itself
    // (`ref?: Ref<HTMLElement>`) inherits nothing, extends nothing, and would
    // otherwise match none of the four above — the same blind spot `icons` sat
    // in, reached from the opposite direction. `live-region` is one edit away
    // from being exactly this shape, which is why it is worth matching before
    // anyone writes it. The type names are the ones React exports for the job.
    label: '`ref` prop or a React ref type',
    pattern: /\bref\s*\??\s*:|\b(?:Ref|RefObject|ElementRef|RefAttributes|MutableRefObject)\s*</,
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
//
// `.only` is matched, and the backtick is in the quote class, because both
// blindnesses fail in the UNSAFE direction. A title this pattern cannot see is
// not merely unread: in the `declaredExempt` scan below, whose whole job is to
// find a ref test in a package that swore it has none, an unseen title is a
// silent PASS over exactly the evidence being looked for. `it.only` is also how
// a half-finished debugging session gets committed, which is when a repo most
// needs the scan to still work.
const TEST_TITLE = /(?<![.\w])(?:it|test)(?:\.only)?\s*\(\s*(['"`])((?:(?!\1).)*)\1/g;

// A backtick title carrying `${…}` is not a title this file can read — the text
// depends on a value only the test run has. Dropped rather than half-matched, so
// nothing downstream compares a prefix against a fragment. (None exist here; the
// alternative is deciding a title's meaning from the literal parts of it.)
const TITLE_INTERPOLATION = /\$\{/;

// The shared opening of all twelve existing ref-test titles. A prefix rather than
// a full spelling: `box` writes "…the underlying element", `badge` "…the
// underlying span element", `text-field` "…the underlying input element", and
// naming the element is the useful half of the convention, not a deviation from
// it. Lower-case, so `test/prefer-lowercase-title` is satisfied by construction.
const REF_TEST_TITLE_PREFIX = 'forwards refs to the underlying';

// What the test body has to do, in three linked pieces. A title alone is a
// claim; a ref attached to nothing and an assertion about something else are two
// green lines that survive a component dropping every ref.
//
// The callback's shape is the convention all twelve existing tests are written
// in — `ref={(el) => { received = el; }}`, on one line or three — and the
// identifier it assigns TO is what the assertion then has to name. Matched
// against the comment-stripped body.
const REF_ATTACHED = /\bref=\{/;
const REF_CALLBACK_TARGET
  = /\bref=\{\s*\(\s*([A-Za-z_$][\w$]*)\s*\)\s*=>\s*\{\s*([A-Za-z_$][\w$]*)\s*=\s*\1\s*;?\s*\}/;

// `SVG…Element` alongside `HTML…Element`: `icons` forwards its ref to a Lucide
// glyph, so the node that arrives is an `SVGSVGElement` and no `HTML…` name is
// the right one for it. Still the concrete element, never `Element` — per
// `docs/plan.md` §Deltas, the loose name holds for whatever the component turns
// into next.
const REF_ELEMENT = '(?:HTML|SVG)[A-Za-z]*Element';

/**
 * `expect(<the identifier the ref callback assigned>).toBeInstanceOf(HTML…)`.
 * The name is a `\w`-only capture from `REF_CALLBACK_TARGET`, so it carries
 * nothing to escape into this pattern.
 *
 * @param {string} identifier
 * @returns {RegExp} the assertion pattern for that one name
 */
function refAssertedOn(identifier) {
  return new RegExp(
    `\\bexpect\\(\\s*${identifier}\\s*!?\\s*\\)\\s*\\.toBeInstanceOf\\(\\s*${REF_ELEMENT}\\s*\\)`,
  );
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @type {string[]} */
const failures = [];

/**
 * A condition under which this guard cannot report on the repo at all: it exits
 * immediately rather than printing a pass over what it could not classify.
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
 * Comments are prose, and prose about a ref is not a ref. Five packages here
 * carry `// React 19: ref is a regular prop, no forwardRef needed`, and
 * `stack`'s and `inline`'s ref tests explain in comments what `ref={` rides in —
 * either would otherwise be read as the code it describes.
 *
 * Scans rather than substitutes, because a substitution cannot tell a comment
 * from a `//` inside a string. The regex this replaced spared one shape
 * (`[^:]`, i.e. a URL's `https://`) and truncated every other line holding one:
 * `const path = 'a//b';` lost everything from the quote onwards, taking any
 * marker on that line with it. Quotes and template literals are therefore
 * skipped whole, by the same `skipStringLiteral()` `readCallArguments()` uses —
 * one reader for "where does this literal end", not two.
 *
 * REGEX LITERALS ARE NOT LEXED, which is the accepted gap: a quote inside one
 * (`/'/g`) reads as opening a string. An unterminated literal therefore keeps
 * the remainder of the file VERBATIM rather than swallowing it — comments after
 * that point survive into the output, which can only over-report a marker (a
 * loud, wrong "add a ref test") and never silently shrink the required set.
 * `scripts/check-peer-externals.mjs`'s `stripNonCode()` is the higher-fidelity
 * sibling: it does lex regex literals, tracks expression position, and reports
 * unterminated constructs to its caller. Reconciling the two into one shared
 * lexer is worth doing and is not done here — the gap is named so that the next
 * reader finds one accepted duplicate rather than two implementations that each
 * look authoritative.
 *
 * @param {string} source
 * @returns {string} same line structure, comment text removed
 */
function stripComments(source) {
  let stripped = '';

  for (let i = 0; i < source.length; i++) {
    const char = source[i];

    if (char === '\'' || char === '"' || char === '`') {
      const closing = skipStringLiteral(source, i);
      if (closing === -1) {
        stripped += source.slice(i);
        break;
      }
      stripped += source.slice(i, closing + 1);
      i = closing;
      continue;
    }

    if (char === '/' && source[i + 1] === '/') {
      const newline = source.indexOf('\n', i);
      if (newline === -1)
        break;
      stripped += '\n'; // Line structure survives; the prose does not.
      i = newline;
      continue;
    }

    if (char === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      if (end === -1) {
        stripped += source.slice(i);
        break;
      }
      stripped += ' ';
      i = end + 1;
      continue;
    }

    stripped += char;
  }

  return stripped;
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
      if (entry.isDirectory())
        walk(relPath);
      else if (entry.isFile())
        found.push(relPath);
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
 * @returns {string|null} the text between the parentheses, or null when they do
 * not balance
 */
function readCallArguments(source, openParen) {
  let depth = 0;

  for (let i = openParen; i < source.length; i++) {
    const char = source[i];

    if (char === '\'' || char === '"' || char === '`') {
      const closing = skipStringLiteral(source, i);
      if (closing === -1)
        return null;
      i = closing;
      continue;
    }
    if (char === '/' && source[i + 1] === '/') {
      const newline = source.indexOf('\n', i);
      if (newline === -1)
        return null;
      i = newline;
      continue;
    }
    if (char === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      if (end === -1)
        return null;
      i = end + 1;
      continue;
    }

    if (char === '(') {
      depth++;
    }
    else if (char === ')') {
      depth--;
      if (depth === 0)
        return source.slice(openParen + 1, i);
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
    if (source[i] === quote)
      return i;
  }
  return -1;
}

/**
 * Every test in a file, as its title and where its `it(…)` call opens. The body
 * is NOT read here: parsing is the expensive, fallible half, and it is only owed
 * for the one test this guard is about.
 *
 * @param {string} source
 * @returns {{ title: string, openParen: number }[]} one entry per test, in file
 * order
 */
function listTests(source) {
  return [...source.matchAll(TEST_TITLE)]
    .filter(match => !TITLE_INTERPOLATION.test(match[2]))
    .map(match => ({
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
 * Returned comment-stripped, because every match against a body is a match for
 * code: a body whose only `ref={` and `toBeInstanceOf(HTMLDivElement)` sit
 * inside comments describes a ref test rather than being one, and it passed here
 * until this call was added.
 *
 * @param {string} relPath for the refusal message
 * @param {string} source
 * @param {{ title: string, openParen: number }} test
 * @returns {string} the body text, comments stripped
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

  return stripComments(body);
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
    if (!statSync(path.join(repoRoot, srcDir)).isDirectory())
      hasSrc = false;
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
      if (marker.pattern.test(source))
        markers.add(marker.label);
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
// The fourth bucket, and the only one nothing is asked of: no marker, no
// opt-out, and no JSX outside a test or a story. Named in the summary rather
// than left implicit, because "20 workspaces scanned, 12 required" invites the
// reader to assume the other eight were judged and cleared. These were not
// judged at all — they are the tooling and token packages, plus the gallery app
// whose components live outside `src/`. Seeing the list is how a reader notices
// a workspace that should NOT be on it.
const outOfScope = workspaces.filter(
  workspace => workspace.markers.length === 0
    && workspace.optOut === undefined
    && !workspace.looksLikeComponents,
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
      + `titled \`${REF_TEST_TITLE_PREFIX}…\`${
        titlesSeen.length > 0
          ? `\n    what is asserted instead: ${titlesSeen.map(t => `"${t}"`).join(', ')}`
          : ''}`,
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

  // What the ref callback assigns to. A `ref={…}` this cannot read is a failure
  // naming the convention, never a skip: the unreadable shapes are `ref={ref}`
  // and `ref={() => {}}`, and both are how a hollow ref test gets written.
  const linkable = attached
    .map(test => ({ ...test, target: REF_CALLBACK_TARGET.exec(test.body)?.[2] }))
    .filter(test => test.target !== undefined);

  if (linkable.length === 0) {
    fail(
      workspace.name,
      `has a \`${REF_TEST_TITLE_PREFIX}…\` test in `
      + `${attached.map(t => t.relPath).join(', ')} whose \`ref={…}\` is not the shape this `
      + 'guard can follow to an assertion',
      'write the ref as the callback every other package here uses — '
      + '`ref={(el) => { received = el; }}` — and assert on `received`. The chain from the '
      + 'ref to the assertion is the whole check: without it, `ref={() => {}}` beside '
      + '`expect(container.firstChild).toBeInstanceOf(HTMLDivElement)` is a green test that '
      + 'passes a component dropping every ref. Refused rather than waved through, because '
      + 'a shape this cannot read is a shape it cannot vouch for.',
    );
    continue;
  }

  if (!linkable.some(test => refAssertedOn(test.target).test(test.body))) {
    fail(
      workspace.name,
      `has a \`${REF_TEST_TITLE_PREFIX}…\` test in `
      + `${linkable.map(t => t.relPath).join(', ')} that attaches a ref to `
      + `\`${linkable.map(t => t.target).join('`, `')}\` and never asserts what arrived there`,
      `assert \`expect(${linkable[0].target}).toBeInstanceOf(HTMLDivElement)\` — or whichever `
      + 'element the component renders — inside that test, on the same variable the ref '
      + 'callback assigned. Asserting anything else (`container.firstChild`, a query result) '
      + 'passes without the ref ever arriving. Name the concrete element rather than '
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

/** @param {{ name: string }[]} group */
const names = group => (group.length > 0 ? group.map(workspace => workspace.name).join(', ') : 'none');

console.log(
  `${GUARD_NAME}: ${required.length} ref-forwarding package(s), each with its ref test\n`
  + `  ${scannedSourceFiles} source file(s) scanned across ${workspaceDirs.length} workspace(s)\n`
  + `  declared ${OPT_OUT_PATH}: ${names(declaredExempt)}\n`
  + `  no marker, no JSX outside a test, nothing asked of them: ${names(outOfScope)}`,
);
