#!/usr/bin/env node
// Published-types guard: compile every `dist/index.d.ts` this repo publishes the
// way a CONSUMER will, rather than the way this repo does.
//
// Nothing else in the build does. `packages/tsconfig/base.json` sets
// `skipLibCheck: true` and enables no `exactOptionalPropertyTypes`, and every
// package's `typecheck` inherits it — which is the right setting for compiling
// this repo's own sources against sixteen third-party `.d.ts` files it does not
// own, and is exactly the setting under which a type error in a file WE publish
// cannot be seen. `tsup` emits declarations without checking them against a
// consumer's options either. So the published `.d.ts` is the one artifact in
// this repo that ships unverified, and the two ways it breaks are both silent
// here:
//
//   - `interface X extends Omit<Up, …> { p?: Up['p'] }`. A member re-declared in
//     a derived interface REPLACES the inherited one rather than intersecting
//     with it, and an indexed access on an OPTIONAL property carries the
//     `| undefined`. Against upstream's `p?: T` that is `error TS2430:
//     Interface 'X' incorrectly extends …` for every consumer on
//     `exactOptionalPropertyTypes` — and `skipLibCheck` DEFAULTS to false, so
//     it is the default consumer who sees it, in our file, on a line they
//     cannot edit. `packages/icons` shipped exactly this.
//   - the same shape under `skipLibCheck: true`: the error is suppressed and the
//     TYPE is still the relaxed one, so `{ absoluteStrokeWidth: undefined }`
//     goes from rejected to accepted. Nobody's build goes red; the contract just
//     quietly loosens.
//
// WHAT IS COMPILED, AND WHAT IS REPORTED
//
// Subject: every workspace whose manifest declares `types`, resolved against the
// package directory — derived rather than listed, so a new publishable package
// is covered the day it is added, and a package that stops declaring `types` is
// refused below rather than dropping out of the count. That is one program over
// all of them rather than one per package, for the reason
// `apps/site/scripts/extract-props.mjs` gives: they share almost every `.d.ts`
// they read, and the checker can share them too.
//
// Reported: diagnostics whose file is one of those `dist/` trees, and nothing
// else. `skipLibCheck: false` means the whole of `node_modules` is checked too,
// and it is not clean — `@radix-ui/themes` ships its own TS2430 and
// `@radix-ui/primitive` reaches for `setImmediate` without `@types/node` — none
// of which is this repo's to fix or its consumers' to see. A diagnostic with no
// FILE is a different thing: that is the compiler rejecting the options below,
// which would leave this guard compiling nothing and printing a pass, so it is
// refused rather than filtered.
//
// The options are one representative strict consumer, not a matrix: `strict`,
// `exactOptionalPropertyTypes`, and `skipLibCheck: false` — the three that make
// the published surface answerable — over `bundler` resolution and React's JSX.
// A consumer on `node16` resolution or on a different `lib` is not covered here,
// and the honest reason is that the failure class above is a property of the
// declaration, not of the resolver.
//
// Runs AFTER `turbo run build`: it reads `dist/`, which is gitignored.
//
//   node scripts/check-dts-strict.mjs

import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { listWorkspaceDirs } from './workspace-globs.mjs';

const GUARD_NAME = 'check-dts-strict';

// The manifest field that names the file consumers' editors and compilers read.
const TYPES_FIELD = 'types';

// Where a reported diagnostic has to live: a workspace's own published tree.
const DIST_SEGMENT = `${path.sep}dist${path.sep}`;

const BUILD_TASK = 'npx turbo run build';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const require = createRequire(import.meta.url);
const ts = require('typescript');

/** @type {string[]} */
const failures = [];

/**
 * @param {string} subject the package or file the problem is about
 * @param {string} problem
 * @param {string} fix
 */
function fail(subject, problem, fix) {
  failures.push(`${subject}: ${problem}\n    fix: ${fix}`);
}

/**
 * A condition under which this guard cannot report on the repo at all.
 *
 * @param {string} message problem and fix, already formatted
 * @returns {never} the process is gone before a caller resumes
 */
function refuse(message) {
  console.error(`\n${GUARD_NAME}: ${message}\n`);
  process.exit(1);
}

/**
 * The consumer this compiles as. `strict` plus the two options that decide
 * whether our own `.d.ts` is even looked at, and whether an optional property
 * may be handed an explicit `undefined`.
 */
const CONSUMER_OPTIONS = {
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  moduleDetection: ts.ModuleDetectionKind.Force,
  lib: ['lib.es2020.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
  jsx: ts.JsxEmit.ReactJSX,
  strict: true,
  exactOptionalPropertyTypes: true,
  skipLibCheck: false,
  esModuleInterop: true,
  noEmit: true,
  // No ambient `@types/*` pulled in by directory scan: a consumer's globals are
  // theirs, and the question here is only whether OUR declarations hold up.
  types: [],
};

/** @type {{ name: string, relDir: string, entry: string }[]} */
const subjects = [];

for (const relDir of listWorkspaceDirs(GUARD_NAME)) {
  const manifest = JSON.parse(readFileSync(path.join(repoRoot, relDir, 'package.json'), 'utf8'));
  const declared = manifest[TYPES_FIELD];
  if (typeof declared !== 'string') {
    continue;
  }

  const entry = path.resolve(repoRoot, relDir, declared);
  if (!existsSync(entry)) {
    // Not `fail`: with the file absent there is nothing to compile, and a
    // subject silently leaving the set is the shape of failure this whole file
    // is about.
    refuse(
      `${manifest.name ?? relDir} declares \`${TYPES_FIELD}\`: "${declared}", and that file does not exist.\n`
      + `  fix: run \`${BUILD_TASK}\` first — this guard reads the built \`dist/\`, which is\n`
      + '       gitignored. If the field is wrong, fix it: `check-publish-contract` asserts\n'
      + '       that the tarball carries what `exports` names, and this guard is what reads\n'
      + '       the declarations inside it. Skipping the package instead would take it out\n'
      + '       of the count below without taking it out of the registry.',
    );
  }

  subjects.push({ name: manifest.name ?? relDir, relDir, entry });
}

if (subjects.length === 0) {
  refuse(
    `no workspace declares a \`${TYPES_FIELD}\` entry, so this guard would compile nothing and\n`
    + 'report success.\n'
    + `  fix: if the packages publish their declarations some other way now, teach the\n`
    + `       subject discovery in scripts/${GUARD_NAME}.mjs where to find them. An empty\n`
    + '       subject set is inert, not clean: every published `.d.ts` would be unchecked\n'
    + '       under the same green line this prints when it checks them all.',
  );
}

const program = ts.createProgram({
  rootNames: subjects.map(subject => subject.entry),
  options: CONSUMER_OPTIONS,
});

const diagnostics = ts.getPreEmitDiagnostics(program);

const optionErrors = diagnostics.filter(diagnostic => diagnostic.file === undefined);
if (optionErrors.length > 0) {
  refuse(
    `the compiler rejected the consumer options this guard compiles with, before reading\n`
    + 'any of the declarations:\n'
    + `${optionErrors.map(
      diagnostic => `         TS${diagnostic.code}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}\n`,
    ).join('')}`
    + `  fix: correct CONSUMER_OPTIONS in scripts/${GUARD_NAME}.mjs. A file-less diagnostic is\n`
    + '       the whole compilation failing to start, and the per-file filter below would\n'
    + '       drop it and print a pass over zero checked declarations.',
  );
}

for (const diagnostic of diagnostics) {
  const fileName = diagnostic.file?.fileName;
  if (fileName === undefined) {
    continue;
  }
  const native = path.normalize(fileName);
  const owner = subjects.find(
    subject => native.startsWith(path.join(repoRoot, subject.relDir) + path.sep)
      && native.includes(DIST_SEGMENT),
  );
  if (owner === undefined) {
    continue;
  }

  const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
  fail(
    `${path.relative(repoRoot, fileName)}:${line + 1}:${character + 1}`,
    `TS${diagnostic.code}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n           ')}`,
    `fix the declaration in ${owner.relDir}/src/ that emits this. Every consumer on `
    + '`exactOptionalPropertyTypes` sees it in a file they cannot edit — and `skipLibCheck` '
    + 'defaults to FALSE, so that is the default consumer, not an exotic one. The usual cause '
    + 'is an `interface X extends Omit<Up, …>` that re-declares an inherited prop: an interface '
    + 'member REPLACES what it inherits, and `Up[\'p\']` on an optional prop is `T | undefined`. '
    + 'Write the type as an INTERSECTION instead — `type X = Omit<Up, …> & { p?: Up[\'p\'] }` — '
    + 'and upstream\'s declaration survives beside the restatement, which is what the seven '
    + 'Radix wrappers do.',
  );
}

if (failures.length > 0) {
  console.error(
    `\n${GUARD_NAME}: ${failures.length} error(s) in the declarations this repo publishes\n\n`
    + `${failures.map(entry => `  ✗ ${entry}`).join('\n\n')}\n`,
  );
  process.exit(1);
}

console.log(
  `${GUARD_NAME}: ${subjects.length} published \`${TYPES_FIELD}\` entr(ies) compile clean under a `
  + 'consumer\'s options\n'
  + '  strict, exactOptionalPropertyTypes, skipLibCheck: false — none of which this repo\'s own '
  + '`typecheck` uses\n'
  + `  ${subjects.map(subject => subject.name).join(', ')}`,
);
