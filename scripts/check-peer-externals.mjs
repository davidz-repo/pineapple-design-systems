#!/usr/bin/env node
// Peer/external lockstep guard: what a package declares as somebody else's job
// must also be what the bundler leaves for somebody else to supply.
//
// docs/plan.md principle 3 states the rule in two halves, and BOTH are required:
//
//   - `peerDependencies` keeps npm from installing a second React into the
//     consumer's tree.
//   - `tsup.config.ts`'s `external` keeps tsup from inlining a copy of React
//     into `dist/index.mjs`.
//
// Either half alone still ships a duplicate React, and a duplicate React is an
// "invalid hook call" in the CONSUMER's app — the failure lands in someone
// else's stack trace, in a different repo, hours or weeks after the commit that
// caused it. Nothing here catches it today: the package builds, its own tests
// pass (they import from `src/`, not `dist/`), `npm pack` reports a fine-looking
// tarball, and the guard that reads dist/ only asserts that the folder is not
// empty. A reviewer diffing a Phase 2 package against the live-region template
// has to notice that one string is missing from one array.
//
// Four assertions, per workspace that builds a `dist/`:
//
//   A. STATIC — every module imported under `src/` that the manifest declares in
//      `peerDependencies` or `dependencies` appears in `external`. Cheap, reads
//      config only, and names the fix as a one-line edit.
//   B. BUILT — every one of those that is actually used at RUNTIME still appears
//      as a bare import specifier in `dist/index.mjs`. This is the assertion
//      that survives a bundler upgrade, a `noExternal`, or any other way the
//      config can say one thing and the artifact do another: it reads what
//      shipped, not what was requested.
//   C. REVERSE — every bare specifier `dist/index.mjs` imports is declared in
//      the manifest. An external nobody declares is a phantom dependency: npm
//      installs nothing for it and the consumer crashes at first import.
//   D. UNDECLARED — every module used at RUNTIME under `src/` is declared as a
//      peer or a dependency. This is the one that catches the worst version of
//      the bug, and it is not redundant with A: tsup externalises everything in
//      `dependencies`/`peerDependencies` automatically, so as long as the
//      DECLARATION is there the bundle stays honest even with `external`
//      incomplete. It is when the declaration goes missing — copy a Phase 2
//      template, lose the `peerDependencies` block, keep writing JSX — that
//      React is really inlined, and then A has nothing declared to check, C
//      has no import to look at, and `dist/index.mjs` silently grows from 1 KB
//      to 80 KB of somebody else's React.
//
// JSX counts as a runtime use of the JSX import source, even when a file names
// no React identifier at all. `packages/icons/src/Icon.tsx` imports only
// `lucide-react`, yet its built output imports `react/jsx-runtime` — because
// `jsx: "react-jsx"` makes the compiler insert that import. Drop `react` from
// `external` there and the runtime inlines silently. The import source is read
// from the package's tsconfig chain rather than assumed, so a package that sets
// `jsxImportSource` is checked against the source it actually uses.
//
// CSS is invisible to all four assertions. They read JS/TS import syntax, so a
// dependency a stylesheet pulls in — Phase 3's theme does
// `@import '@fontsource-variable/geist/index.css'`, resolved by the CONSUMER's
// bundler — is a real runtime dependency that nothing here would report as
// undeclared or as inlined. The Phase 3 PR is where that gets its own check.
//
// Everything below reads source as TEXT: the configs are TypeScript, and
// importing them would mean compiling them. A text scan is imprecise at the
// edges, so every heuristic here is written to err toward a LOUD false failure
// a human resolves, never toward a silent pass — and each one names its
// residual imprecision where it is defined.
//
// Run it *after* `turbo run build` — assertions B and C read `dist/`.
//
//   node scripts/check-peer-externals.mjs

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire, isBuiltin } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { listWorkspaceDirs } from './workspace-globs.mjs';

// A workspace is in scope iff it has a tsup config: that is what produces the
// `dist/` these assertions read. Tooling packages (tsconfig, eslint-config,
// vitest-preset) ship source and have nothing to inline.
const TSUP_CONFIG = 'tsup.config.ts';
const BUILD_ENTRY = 'dist/index.mjs';
const SRC_DIR = 'src';

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const JSX_EXTENSIONS = new Set(['.tsx', '.jsx']);

// tsup bundles the graph reachable from `entry`. Tests and stories are not in
// it, so a story's `import { useState } from 'react'` is not a statement about
// what ships and must not be read as one.
const EXCLUDED_SOURCE_PATTERN = /\.(?:test|spec|stories)\./;

// `jsx: "react-jsx" | "react-jsxdev"` makes the compiler insert an import of
// `<jsxImportSource>/jsx-runtime`. Classic `jsx: "react"` does not — it emits
// `React.createElement`, which requires a value import the scan already sees.
const AUTOMATIC_JSX = new Set(['react-jsx', 'react-jsxdev']);
const DEFAULT_JSX_IMPORT_SOURCE = 'react';
const JSX_RUNTIME_SUBPATH = 'jsx-runtime';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @type {string[]} */
const failures = [];

/** @type {string[]} */
const skipped = [];

/**
 * @param {string} pkgName
 * @param {string} problem
 * @param {string} fix
 */
function fail(pkgName, problem, fix) {
  failures.push(`${pkgName}: ${problem}\n    fix: ${fix}`);
}

/**
 * `JSON.parse`, with the file named in any error it throws — a bare
 * `SyntaxError: Unexpected token /` says nothing about which of a dozen files
 * produced it.
 *
 * `allowComments` reads JSONC, which is what a tsconfig actually is: every
 * tsconfig in this repo carries a `$schema` line, several carry `//` notes, and
 * `tsc` accepts both. Trailing commas are the one JSONC liberty NOT handled —
 * they surface as a named parse failure rather than a wrong answer.
 *
 * @param {string} filePath absolute
 * @param {{ allowComments?: boolean }} options
 */
function readJson(filePath, { allowComments = false } = {}) {
  const text = readFileSync(filePath, 'utf8');
  let source = text;

  if (allowComments) {
    const scanned = stripNonCode(text);
    if ('unterminated' in scanned) {
      throw new Error(`${filePath} ends inside ${scanned.unterminated}`);
    }
    source = scanned.code;
  }

  try {
    return JSON.parse(source);
  }
  catch (cause) {
    throw new Error(`${filePath} is not valid JSON${allowComments ? 'C' : ''}: ${cause.message}`, { cause });
  }
}

/** @param {string} dir @returns {string[]} absolute paths */
function listFilesRecursively(dir) {
  /** @type {string[]} */
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...listFilesRecursively(absolute));
    else if (entry.isFile()) found.push(absolute);
  }
  return found;
}

function exists(absolutePath) {
  try {
    statSync(absolutePath);
    return true;
  }
  catch {
    return false;
  }
}

// Characters that can END a JavaScript expression. What follows one of them is
// an operator: `a / b` is division and `a < b` is a comparison, where the same
// character after `(`, `=`, `,`, `return` or nothing at all opens a regex
// literal or a JSX element.
const EXPRESSION_END = /[\w$)\]'"`]/;
// Keywords end in word characters, so they look like the end of an expression
// and are not. `return /re/.test(x)`, `typeof <div/>`.
const EXPRESSION_KEYWORD = /\b(?:return|typeof|case|await|yield|in|of|do|else|void|delete)$/;
// A string literal is a module specifier only in these positions: `from '…'`,
// `import '…'`, `import('…')`. Everything else quoted is data.
const SPECIFIER_LEAD = /(?:\bfrom|\bimport|\()\s*$/;

/** @param {string} codeSoFar @returns {boolean} */
function isExpressionPosition(codeSoFar) {
  const before = codeSoFar.trimEnd();
  if (before === '') return true;
  return !EXPRESSION_END.test(before.at(-1)) || EXPRESSION_KEYWORD.test(before);
}

/** End index (exclusive) of the string or template literal opening at `start`. */
function endOfStringLiteral(source, start) {
  const quote = source[start];
  for (let i = start + 1; i < source.length; i++) {
    const char = source[i];
    if (char === '\\') { i++; continue; }
    if (char === quote) return i + 1;
    // A raw newline cannot appear in a quoted string. Reaching one means the
    // scan mis-identified the opening quote, and guessing further is worse than
    // refusing.
    if (char === '\n' && quote !== '`') return -1;
  }
  return -1;
}

/**
 * Whether the `/` at `index` opens a regex literal.
 *
 * Expression position is necessary but not sufficient, because JSX puts slashes
 * in exactly those places without meaning a regex: `</Tag>` closes an element
 * and `<Tag {...rest} />` self-closes one, and both sit right where a regex
 * could legally start. Reading either as a regex swallows the rest of the line.
 *
 * The cost is the mirror case — a real regex written directly after a `}` or
 * starting with `>` is scanned as ordinary code. Its contents are then read as
 * code too, which is why an unbalanced quote inside one ends the scan as a
 * refusal rather than a wrong answer.
 */
function isRegexLiteralStart(codeSoFar, source, index) {
  if (!isExpressionPosition(codeSoFar)) return false;
  const before = codeSoFar.trimEnd().at(-1);
  if (before === '<' || before === '}') return false; // `</Tag>`, `{value} />`
  if (source[index + 1] === '>') return false; // `<Tag />`
  return true;
}

/** End index (exclusive) of the regex literal opening at `start`. */
function endOfRegexLiteral(source, start) {
  let inClass = false;
  for (let i = start + 1; i < source.length; i++) {
    const char = source[i];
    if (char === '\\') { i++; continue; }
    if (char === '[') inClass = true;
    else if (char === ']') inClass = false;
    else if (char === '/' && !inClass) return i + 1;
    else if (char === '\n') return -1;
  }
  return -1;
}

/**
 * Source with everything that is not executable code removed: comments always,
 * and — with `blankStringContents` — the contents of template literals and of
 * every string that is not in module-specifier position.
 *
 * Comments hold example imports and explanations of why something is external;
 * a JSDoc `@example` in a built bundle holds whatever the author wrote; a
 * template literal holds arbitrary text. None of it is an import, and reading
 * one as an import makes the guard report on prose.
 *
 * String- and regex-aware rather than a chain of replaces, because the naive
 * version gets this wrong in both directions: `"https://json.schemastore.org"`
 * in a tsconfig looks like a comment, and `/['"]/` in a bundle looks like an
 * open quote — and one mis-read flips the state of the whole rest of the file.
 *
 * Known imprecision, both documented rather than papered over:
 *   - `${…}` interpolations are blanked with the rest of the template, so an
 *     `await import('pkg')` written inside one is missed. Nothing emits that.
 *   - A quoted string that FOLLOWS a `(` is kept verbatim (that is where a
 *     dynamic specifier lives), so `console.log("import('pkg')")` is still read
 *     as an import — the loud direction.
 *
 * @param {string} source
 * @param {{ blankStringContents?: boolean }} options
 * @returns {{ code: string } | { unterminated: string }} refuses rather than
 * guessing when the scan runs off the end of a literal or a block comment.
 */
function stripNonCode(source, { blankStringContents = false } = {}) {
  let code = '';
  let index = 0;

  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];

    if (char === '/' && next === '/') {
      const end = source.indexOf('\n', index);
      if (end === -1) break;
      index = end; // Keep the newline: line structure matters to the callers.
      continue;
    }

    if (char === '/' && next === '*') {
      const end = source.indexOf('*/', index + 2);
      if (end === -1) return { unterminated: 'a block comment' };
      code += ' ';
      index = end + 2;
      continue;
    }

    if (char === '/' && isRegexLiteralStart(code, source, index)) {
      const end = endOfRegexLiteral(source, index);
      if (end === -1) return { unterminated: 'a regular expression literal' };
      code += ' ';
      index = end;
      continue;
    }

    if (char === '"' || char === '\'' || char === '`') {
      const end = endOfStringLiteral(source, index);
      if (end === -1) {
        return { unterminated: char === '`' ? 'a template literal' : 'a string literal' };
      }
      const isSpecifier = char !== '`' && SPECIFIER_LEAD.test(code);
      code += blankStringContents && !isSpecifier
        ? `${char}${char}`
        : source.slice(index, end);
      index = end;
      continue;
    }

    code += char;
    index++;
  }

  return { code };
}

/**
 * Reads a file as code, reporting the ones this scanner cannot make sense of
 * instead of scanning a half-understood string.
 *
 * @param {string} pkgName
 * @param {string} filePath absolute
 * @param {{ blankStringContents?: boolean }} options
 * @returns {string|null} null once the failure has been reported
 */
function readCode(pkgName, filePath, options) {
  const result = stripNonCode(readFileSync(filePath, 'utf8'), options);
  if ('unterminated' in result) {
    fail(
      pkgName,
      `${path.relative(repoRoot, filePath)} ends inside ${result.unterminated}, so this `
      + 'guard cannot tell code from text in it',
      'check the file parses at all (`npx tsc --noEmit`). If it does, this guard\'s text '
      + 'scan is what is wrong — fix `stripNonCode()` in scripts/check-peer-externals.mjs. '
      + 'It refuses a file it cannot read rather than scanning half of it: half a file '
      + 'yields a shorter import list, and a shorter import list passes.',
    );
    return null;
  }
  return result.code;
}

// `import ... from '<spec>'` / `export ... from '<spec>'`. The clause is
// captured so a type-only import can be told from a runtime one; the negated
// class spans newlines, which multi-line named imports need.
const FROM_IMPORT = /^[ \t]*(?:import|export)\b(?<clause>[^;'"]*?)\bfrom\s*['"](?<specifier>[^'"]+)['"]/gm;
// `import '<spec>'` — a side-effect import, never erased.
const SIDE_EFFECT_IMPORT = /^[ \t]*import\s*['"](?<specifier>[^'"]+)['"]/gm;
// `import('<spec>')` — a runtime import by construction.
const DYNAMIC_IMPORT = /\bimport\s*\(\s*['"](?<specifier>[^'"]+)['"]\s*\)/g;

/**
 * Whether an import clause is erased at compile time. `import type { X }` and
 * `import { type X, type Y }` both compile to nothing, so their absence from
 * `dist/` is correct output rather than evidence of inlining.
 *
 * Deliberately a text test rather than a parse. It errs toward calling a clause
 * a RUNTIME import, which can only cost a loud false failure that a human
 * resolves — never a silent pass, which is the failure mode this file exists to
 * remove.
 *
 * @param {string} clause the text between `import`/`export` and `from`
 */
function isTypeOnlyClause(clause) {
  const trimmed = clause.trim();
  if (/^type\b/.test(trimmed)) return true;

  const braceStart = trimmed.indexOf('{');
  if (braceStart === -1) return false; // default or namespace binding: a value
  if (trimmed.slice(0, braceStart).trim() !== '') return false; // `Default, { ... }`

  const bindings = trimmed
    .slice(braceStart + 1, trimmed.lastIndexOf('}'))
    .split(',')
    .map(binding => binding.trim())
    .filter(Boolean);

  return bindings.length > 0 && bindings.every(binding => /^type\b/.test(binding));
}

// `<Tag …`, `<Tag/>`, `<Tag>` or the fragment `<>`. A candidate only: the same
// text is a type argument in `useState<number>(0)`, which is why every match is
// re-tested for expression position below.
const JSX_CANDIDATE = /<(?:>|[A-Za-z][\w.:-]*(?=[\s/>]))/g;

/**
 * Whether a file contains JSX, as opposed to TypeScript that merely looks like
 * it. `useState<number>(0)`, `useRef<HTMLDivElement>(null)` and
 * `Map<string, Foo>` all match the shape of an opening tag; what they never do
 * is appear where an expression can START. So a candidate counts only when the
 * code before it cannot be the end of an expression — after `(`, `=`, `,`,
 * `&&`, `return`, `>`, or nothing.
 *
 * Fragments (`<>…</>`) are JSX with no tag name and are matched explicitly; a
 * component that returns only a fragment would otherwise read as React-free.
 *
 * Residual imprecision, in the loud direction: a generic type parameter written
 * in expression position — `const identity = <T extends object>(v: T) => v` —
 * is read as JSX. In a `.tsx` file that is nearly what the compiler does too
 * (`.tsx` parses `<T>` as JSX, which is why the `<T,>` form exists), and the
 * cost is a false failure a human reads, not a missed inlining.
 *
 * @param {string} source already stripped of comments and string contents
 */
function hasJsxSyntax(source) {
  for (const match of source.matchAll(JSX_CANDIDATE)) {
    if (isExpressionPosition(source.slice(0, match.index))) return true;
  }
  return false;
}

// A statement that declares a type. `import('pkg')` inside one is a type query,
// erased like any other type annotation.
const TYPE_STATEMENT = /^(?:export\s+|declare\s+)*(?:type|interface)\b/;

/**
 * Whether an `import('pkg')` occurrence is a TYPE query rather than a runtime
 * call. `type Props = import('@radix-ui/react-dialog').DialogProps` compiles to
 * nothing, so requiring a runtime declaration for it is a false failure.
 *
 * Two shapes are exempted:
 *   - its statement — the text back to the previous `;` — declares a type
 *     (`type X = …`, `interface X …`, with `export`/`declare`). Statement, not
 *     line, so the common wrapped form `type P =\n  import('pkg').Q;` is
 *     covered. The repo's lint config enforces semicolons, which is what makes
 *     "the previous `;`" a boundary rather than a guess.
 *   - it sits directly after a `:` in a statement containing no `=` — an
 *     interface member or a type annotation (`icon: import('pkg').Icon`). The
 *     `=` test is what keeps a value position out: `const routes = { page:
 *     import('pkg') }` has one and stays a runtime import.
 *
 * Imprecision, and here it is the QUIET direction — an exempted occurrence is
 * one this guard stops asking about — so both shapes are kept narrow enough to
 * name: a lazy `import()` written as an interface-shaped object member with no
 * assignment anywhere in its statement would be missed. Nothing in a
 * presentational component package has that shape.
 *
 * @param {string} source
 * @param {number} matchIndex
 */
function isTypeQueryImport(source, matchIndex) {
  const statement = source.slice(source.lastIndexOf(';', matchIndex) + 1, matchIndex);
  if (TYPE_STATEMENT.test(statement.trimStart())) return true;
  return statement.trimEnd().endsWith(':') && !statement.includes('=');
}

/**
 * @param {string} specifier
 * @returns {boolean} true for `react` / `@scope/pkg`, false for `./x`, `/x`,
 * `node:fs` and any other protocol.
 */
function isBareSpecifier(specifier) {
  if (specifier.startsWith('.') || specifier.startsWith('/')) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(specifier)) return false;
  return !isBuiltin(specifier);
}

/** `react/jsx-runtime` -> `react`; `@radix-ui/themes/styles.css` -> `@radix-ui/themes`. */
function packageOfSpecifier(specifier) {
  const segments = specifier.split('/');
  return specifier.startsWith('@') ? segments.slice(0, 2).join('/') : segments[0];
}

/**
 * Every bare package name a source tree imports, split by whether the import
 * survives compilation.
 *
 * @param {string[]} files absolute paths
 * @returns {{ imported: Set<string>, runtime: Set<string>, hasJsx: boolean }}
 */
function collectSourceImports(pkgName, files) {
  const imported = new Set();
  const runtime = new Set();
  let hasJsx = false;

  for (const file of files) {
    const source = readCode(pkgName, file, { blankStringContents: true });
    if (source === null) return null;

    if (JSX_EXTENSIONS.has(path.extname(file)) && hasJsxSyntax(source)) hasJsx = true;

    for (const match of source.matchAll(FROM_IMPORT)) {
      const { clause, specifier } = match.groups;
      if (!isBareSpecifier(specifier)) continue;
      const pkg = packageOfSpecifier(specifier);
      imported.add(pkg);
      if (!isTypeOnlyClause(clause)) runtime.add(pkg);
    }

    for (const match of source.matchAll(SIDE_EFFECT_IMPORT)) {
      const { specifier } = match.groups;
      if (!isBareSpecifier(specifier)) continue;
      imported.add(packageOfSpecifier(specifier));
      runtime.add(packageOfSpecifier(specifier));
    }

    for (const match of source.matchAll(DYNAMIC_IMPORT)) {
      const { specifier } = match.groups;
      if (!isBareSpecifier(specifier)) continue;
      const pkg = packageOfSpecifier(specifier);
      // A type query still ties this package to that module — it just does not
      // tie it at RUNTIME, so it belongs in `imported` and not in `runtime`.
      imported.add(pkg);
      if (!isTypeQueryImport(source, match.index)) runtime.add(pkg);
    }
  }

  return { imported, runtime, hasJsx };
}

/**
 * Bare specifiers imported by a built entry point.
 *
 * Reads the artifact through the same scanner as the sources: a bundle carries
 * the JSDoc of everything it inlined, and a `@example` line with
 * `await import('some-pkg')` in it is documentation, not a dependency —
 * assertion C would otherwise report it as a phantom one.
 *
 * @returns {Set<string>|null} null once a read failure has been reported
 */
function collectBuiltImports(pkgName, entryPath) {
  const source = readCode(pkgName, entryPath, { blankStringContents: true });
  if (source === null) return null;

  const specifiers = new Set();

  for (const pattern of [FROM_IMPORT, SIDE_EFFECT_IMPORT, DYNAMIC_IMPORT]) {
    for (const match of source.matchAll(pattern)) {
      const { specifier } = match.groups;
      if (isBareSpecifier(specifier)) specifiers.add(specifier);
    }
  }

  return specifiers;
}

/**
 * The `external` array from a tsup config, read as text: the config is
 * TypeScript, and importing it would mean compiling it.
 *
 * Refuses anything it cannot read literally rather than returning a shorter
 * list — a silently truncated `external` is the exact failure this guard is
 * here to prevent, so an unparseable config has to be loud.
 *
 * @param {string} pkgName
 * @param {string} configPath absolute
 * @returns {Set<string>|null} null when the config could not be read literally
 */
function parseExternal(pkgName, configPath) {
  const source = readCode(pkgName, configPath);
  if (source === null) return null;

  // Negative lookbehind so `noExternal:` is not mistaken for `external:`.
  const keys = [...source.matchAll(/(?<![\w$])external\s*:/g)];
  const arrayMatch = source.match(/(?<![\w$])external\s*:\s*\[(?<body>[^\]]*)\]/);

  if (keys.length === 0) return new Set(); // No externals declared: an empty list.

  if (keys.length > 1) {
    fail(
      pkgName,
      `${TSUP_CONFIG} declares \`external\` ${keys.length} times, and this guard reads only `
      + 'the first',
      `state one \`external\` array in ${TSUP_CONFIG}. A config exporting several builds `
      + 'is a legitimate thing to want — but reading the first array and checking every '
      + 'assertion against it would certify the OTHER builds without looking at them, '
      + 'which is worse than refusing. Extend `parseExternal()` in '
      + 'scripts/check-peer-externals.mjs to check each build against its own entry if '
      + 'the repo starts doing this.',
    );
    return null;
  }

  if (!arrayMatch) {
    fail(
      pkgName,
      `${TSUP_CONFIG} declares \`external\` but not as a literal array, so this guard `
      + 'cannot tell what is externalised',
      `write \`external: ['react', ...]\` as a literal string array in ${TSUP_CONFIG}. `
      + 'This guard reads the config as text on purpose (it is TypeScript, and importing '
      + 'it would mean compiling it); a form it cannot read would otherwise pass as an '
      + 'empty list, which is the failure it exists to catch.',
    );
    return null;
  }

  const { body } = arrayMatch.groups;
  const entries = [...body.matchAll(/['"]([^'"]+)['"]/g)].map(match => match[1]);
  const residue = body.replace(/['"][^'"]*['"]/g, '').replace(/[\s,]/g, '');

  if (residue !== '') {
    fail(
      pkgName,
      `${TSUP_CONFIG}'s \`external\` array contains non-string entries (${residue})`,
      `list externals as plain string literals in ${TSUP_CONFIG}. A regex or a spread `
      + 'entry may well be correct, but this guard cannot evaluate it, and a guard that '
      + 'quietly ignores half the array certifies nothing.',
    );
    return null;
  }

  return new Set(entries);
}

/**
 * The `jsx` / `jsxImportSource` a package actually compiles under, following
 * `extends` to wherever they are set. Read rather than assumed: a package that
 * points JSX at another runtime would otherwise be checked against React's.
 *
 * Tsconfigs are JSONC — every one in this repo carries a `$schema` line and
 * several carry `//` notes — so the read tolerates comments, and a file it
 * still cannot parse (or an `extends` that resolves to nothing) is reported
 * against the package rather than thrown as a bare SyntaxError from a stack
 * that names no package.
 *
 * @param {string} pkgDir absolute
 * @returns {{ options: { jsx?: string, jsxImportSource?: string } } | { unreadable: string }}
 */
function resolveJsxOptions(pkgDir) {
  /** @type {Record<string, unknown>} */
  const merged = {};
  let configPath = path.join(pkgDir, 'tsconfig.json');
  const seen = new Set();

  while (exists(configPath) && !seen.has(configPath)) {
    seen.add(configPath);

    let config;
    try {
      config = readJson(configPath, { allowComments: true });
    }
    catch (error) {
      return { unreadable: error.message };
    }

    // Nearest config wins, so only fill what an inner one has not already set.
    for (const key of ['jsx', 'jsxImportSource']) {
      if (config.compilerOptions?.[key] !== undefined && merged[key] === undefined) {
        merged[key] = config.compilerOptions[key];
      }
    }
    if (typeof config.extends !== 'string') break;

    try {
      configPath = config.extends.startsWith('.')
        ? path.resolve(path.dirname(configPath), config.extends)
        : createRequire(configPath).resolve(config.extends);
    }
    catch (error) {
      return { unreadable: `${configPath} extends "${config.extends}", which does not resolve: ${error.message}` };
    }
  }

  return { options: merged };
}

function checkPackage(relDir) {
  // Resolved from the workspace path itself, not by re-rooting its basename
  // under packages/: `apps/gallery` would otherwise be checked as
  // `packages/gallery` — reading one package's manifest against another's
  // config, or silently finding neither.
  const pkgDir = path.join(repoRoot, relDir);
  const manifest = readJson(path.join(pkgDir, 'package.json'));
  const pkgName = manifest.name ?? relDir;
  const configPath = path.join(pkgDir, TSUP_CONFIG);

  if (!exists(configPath)) {
    skipped.push(`${relDir} (no ${TSUP_CONFIG})`);
    return;
  }

  const entryPath = path.join(pkgDir, BUILD_ENTRY);
  if (!exists(entryPath)) {
    fail(
      pkgName,
      `has ${TSUP_CONFIG} but no ${BUILD_ENTRY}`,
      'run `npx turbo run build` first. Two of the four assertions here read the '
      + 'built output, because what the config asks for and what the bundler emitted '
      + 'are different facts.',
    );
    return;
  }

  // B and C read exactly one file. With `splitting` on, or a second `entry`,
  // tsup puts shared imports in a sibling chunk — where a scan of index.mjs
  // alone would see an inlined peer as an absent import (B) and never look at
  // the chunk's own imports (C). One `.mjs` is the assumption; assert it rather
  // than inherit it.
  const strayChunks = listFilesRecursively(path.dirname(entryPath))
    .filter(file => path.extname(file) === '.mjs' && file !== entryPath)
    .map(file => path.relative(pkgDir, file));

  if (strayChunks.length > 0) {
    fail(
      pkgName,
      `${BUILD_ENTRY} is not the only .mjs in dist/ (also: ${strayChunks.join(', ')}), and `
      + 'assertions B and C read only that one file',
      'extend this guard to read every .mjs under dist/ as one graph — see '
      + '`collectBuiltImports()` in scripts/check-peer-externals.mjs. A split bundle moves '
      + `imports out of ${BUILD_ENTRY} into a chunk, which reads here exactly like a peer `
      + 'that got inlined, and lets a chunk import something no manifest declares with '
      + 'nothing to look at it.',
    );
    return;
  }

  const external = parseExternal(pkgName, configPath);
  if (external === null) return; // Already reported, and nothing below is meaningful.

  const declared = new Map([
    ...Object.keys(manifest.peerDependencies ?? {}).map(name => [name, 'peerDependencies']),
    ...Object.keys(manifest.dependencies ?? {}).map(name => [name, 'dependencies']),
  ]);

  const srcDir = path.join(pkgDir, SRC_DIR);
  const sourceFiles = exists(srcDir)
    ? listFilesRecursively(srcDir).filter(
        file => SOURCE_EXTENSIONS.has(path.extname(file))
          && !EXCLUDED_SOURCE_PATTERN.test(path.basename(file)),
      )
    : [];

  const collected = collectSourceImports(pkgName, sourceFiles);
  if (collected === null) return; // Already reported.
  const { imported, runtime, hasJsx } = collected;

  // The compiler-inserted JSX import. Without this, a package whose sources
  // name no React identifier — every Radix wrapper in Phase 2 — looks as though
  // it does not use React at all, and dropping `react` from `external` inlines
  // the runtime with nothing to notice.
  const jsxOptions = resolveJsxOptions(pkgDir);
  if ('unreadable' in jsxOptions) {
    fail(
      pkgName,
      `its tsconfig chain could not be read (${jsxOptions.unreadable})`,
      'fix the file named above. This guard follows `extends` to learn which JSX import '
      + 'source the package compiles under; assuming React instead would check a package '
      + 'against a runtime it may not use, and skipping the package would drop the one '
      + 'assertion that catches an inlined React in a file that never names it.',
    );
    return;
  }

  const { jsx, jsxImportSource = DEFAULT_JSX_IMPORT_SOURCE } = jsxOptions.options;
  const usesAutomaticJsx = hasJsx && AUTOMATIC_JSX.has(jsx);
  // True when JSX is the ONLY thing tying this package to the import source at
  // RUNTIME — the case a reader is most likely to mistake for "we don't use
  // React here". Tested against `runtime` rather than `imported`, because a
  // package whose only mention of React is `import type { ReactNode }` is
  // exactly that case, and testing `imported` would silence the note for it.
  const jsxIsSoleUse = usesAutomaticJsx && !runtime.has(jsxImportSource);
  if (usesAutomaticJsx) {
    imported.add(jsxImportSource);
    runtime.add(jsxImportSource);
  }

  const built = collectBuiltImports(pkgName, entryPath);
  if (built === null) return; // Already reported.
  const builtPackages = new Set([...built].map(packageOfSpecifier));

  // A. Declared + imported must be external.
  for (const [name, field] of declared) {
    if (!imported.has(name)) continue;
    if (external.has(name)) continue;
    const viaJsx = jsxIsSoleUse && name === jsxImportSource;
    fail(
      pkgName,
      `${name} is declared in ${field} and imported under ${SRC_DIR}/`
      + `${viaJsx ? ` (via JSX, which compiles to an import of ${name}/${JSX_RUNTIME_SUBPATH})` : ''}`
      + `, but is missing from ${TSUP_CONFIG}'s \`external\``,
      `add '${name}' to \`external\` in ${path.basename(pkgDir)}/${TSUP_CONFIG}. `
      + `Nothing is inlined today: tsup externalises whatever the manifest declares, and `
      + `${name} is declared — assertion B reads the artifact and would say so if it were `
      + 'not. What is missing is the second half of docs/plan.md principle 3, and it is '
      + `the half that keeps holding when the first one moves. The day ${name} leaves `
      + `${field} — retired, moved to devDependencies, or dropped when this manifest is `
      + 'copied into the next package — `external` is what still says "leave this to the '
      + 'consumer", and without it that edit silently starts shipping a second copy of '
      + `${name}: an "invalid hook call" in THEIR app, not a failure here.`,
    );
  }

  // D. Used at runtime must be declared by somebody.
  for (const name of [...runtime].sort()) {
    if (declared.has(name)) continue;
    const viaJsx = jsxIsSoleUse && name === jsxImportSource;
    fail(
      pkgName,
      `${name} is used at runtime under ${SRC_DIR}/`
      + `${viaJsx ? ` (via JSX, which compiles to an import of ${name}/${JSX_RUNTIME_SUBPATH})` : ''}`
      + ', but is declared in neither peerDependencies nor dependencies',
      `add "${name}" to peerDependencies in ${path.basename(pkgDir)}/package.json if the `
      + 'consumer should supply it (React, React DOM, Radix), or to dependencies if this '
      + 'package should. A devDependency does not travel in the tarball. This is the '
      + 'version of the bug that actually inlines: tsup externalises whatever the manifest '
      + 'declares, so an undeclared module gets BUNDLED — the build succeeds, the tests '
      + 'pass, dist/index.mjs quietly grows by the size of React, and every consumer ends '
      + 'up with a second copy.',
    );
  }

  // B. Externalised + used at runtime must survive into the built entry.
  for (const [name, field] of declared) {
    if (!runtime.has(name) || !external.has(name)) continue;
    if (builtPackages.has(name)) continue;
    fail(
      pkgName,
      `${name} is declared in ${field}, used at runtime under ${SRC_DIR}/ and listed in `
      + `\`external\`, but ${BUILD_ENTRY} imports nothing from it — it was inlined`,
      `rebuild (\`npx turbo run build\`) and check ${path.basename(pkgDir)}/${TSUP_CONFIG}. `
      + 'A stale dist/ explains this innocently, and so does an import that only exists in '
      + `a module \`entry\` never reaches — this scan reads all of ${SRC_DIR}/, tsup bundles `
      + `only the graph reachable from \`entry\`. Anything else means the config says `
      + `${name} is external and the artifact disagrees, and the artifact is what ships. `
      + 'An inlined peer is a duplicate copy in every consumer that installs this package.',
    );
  }

  // C. Everything the artifact imports must be declared.
  for (const specifier of built) {
    const name = packageOfSpecifier(specifier);
    if (declared.has(name)) continue;
    fail(
      pkgName,
      `${BUILD_ENTRY} imports '${specifier}', but ${name} is in neither `
      + 'peerDependencies nor dependencies',
      `add "${name}" to peerDependencies (if the consumer supplies it) or dependencies `
      + '(if this package does) in package.json. An import that no manifest field names '
      + 'is a phantom dependency: npm installs nothing for it, the tarball passes every '
      + "check here, and the consumer's app fails at the first import of this package.",
    );
  }

  return {
    relDir,
    externals: [...external].sort(),
  };
}

// Discovery — and the assertion that the root declares no workspace root it
// cannot walk — is shared with check-publish-contract.mjs, so the two can never
// disagree about what a workspace is.
const packageDirs = listWorkspaceDirs('check-peer-externals');
if (packageDirs.length === 0) {
  console.error(
    '\ncheck-peer-externals: found no workspaces in the root package.json globs.\n'
    + '  fix: run `npm install` so package-lock.json lists them. Zero workspaces is a\n'
    + '       guard that looked at nothing, not a repo that is clean.\n',
  );
  process.exit(1);
}

/** @type {{ relDir: string, externals: string[] }[]} */
const checked = [];
for (const relDir of packageDirs) {
  const result = checkPackage(relDir);
  if (result) checked.push(result);
}

if (failures.length > 0) {
  console.error(
    `\ncheck-peer-externals: ${failures.length} problem(s) across the workspaces\n\n`
    + `${failures.map(f => `  ✗ ${f}`).join('\n\n')}\n`,
  );
  process.exit(1);
}

// Every workspace here is skippable — none of them has to build — so "all
// skipped" is a reachable state that would otherwise print a pass over nothing.
if (checked.length === 0) {
  console.error(
    `\ncheck-peer-externals: no workspace has a ${TSUP_CONFIG}, so this guard checked `
    + 'nothing and would report success.\n'
    + '  fix: if the repo really publishes no bundled package any more, delete this\n'
    + '       guard. Do not leave it passing — it would certify every future package as\n'
    + '       correctly externalised without ever having looked at one.\n',
  );
  process.exit(1);
}

console.log(
  `check-peer-externals: ${checked.length} bundled package(s) OK\n`
  + `${checked.map(({ relDir, externals }) => `  ${relDir}: external [${externals.join(', ') || 'none'}]`).join('\n')}`
  + (skipped.length > 0 ? `\n  ${skipped.length} workspace(s) build no dist/, skipped: ${skipped.join(', ')}` : ''),
);
