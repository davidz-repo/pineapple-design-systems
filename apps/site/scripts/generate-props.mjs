#!/usr/bin/env node
// Writes apps/site/generated/props/<slug>.json — one file per public package,
// the input to the Props section of every package page.
//
// Run by the site's `props` turbo task, which `build` and `test` depend on, so
// the artifact exists before anything reads it. It is GITIGNORED on purpose: a
// committed copy is a second source of truth that goes stale between the commit
// that changes a prop and the commit that regenerates the table, and
// `scripts/check-token-drift.mjs` — which scans `git ls-files` for hard-coded
// token vocabularies — has no allowlist and would fail on the accent-colour
// unions this file writes out verbatim.
//
// One file per package rather than one index, because that is how every other
// per-package thing on this site is loaded: the page pulls its own chunk (see
// `content.ts`), and a single index would ship every package's props to a
// reader looking at one.
//
// Refuses rather than writing a plausible-looking empty answer. Three ways this
// can be inert while exiting 0, and each of them leaves the site rendering
// "documents no props" on every page:
//
//   1. no packages discovered — the layout moved;
//   2. no components found in any of them — the component predicate stopped
//      matching (a React types upgrade, a change in how packages export);
//   3. no prop classified as a layout prop while Radix wrappers were extracted —
//      Radix moved its shared prop modules, so every layout prop would land in
//      the main table and the disclosure that exists to keep 41 rows out of it
//      would be empty.
//
// The first two are wrong answers. The third is only a worse table, and it is
// still refused: a degradation nothing reports is one nobody fixes.
//
//   node scripts/generate-props.mjs

import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { extractPackageProps, readCompilerOptions } from './extract-props.mjs';

const TOOL_NAME = 'generate-props';

// apps/site/scripts/ -> apps/site -> repo root.
const siteDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(siteDir, '../..');

const PACKAGES_DIR = 'packages';
const ENTRY = 'src/index.ts';
const OUT_DIR = path.join(siteDir, 'generated/props');

// The compiler options the SITE compiles these packages with — including the
// fenced `paths` that map every `@pineappleui/*` to its source. Read rather
// than restated so the props a reader sees come from the same resolution the
// page they are on was built with.
const SITE_TSCONFIG = path.join(siteDir, 'tsconfig.json');

// What makes a package one this site documents: `packages/*` with a manifest
// that is not private. The same set `src/registry.test.ts` asserts the registry
// against, derived the same way, so a new package appears here the day it lands.
const require = createRequire(import.meta.url);
const ts = require('typescript');

/**
 * @param {string} message problem and fix, already formatted
 * @returns {never} the process is gone before a caller resumes
 */
function refuse(message) {
  console.error(`\n${TOOL_NAME}: ${message}\n`);
  process.exit(1);
}

/**
 * Every package this site documents: `packages/*` with a non-private manifest
 * and a `src/index.ts`.
 *
 * @returns {{ slug: string, entry: string }[]} sorted, so the run is reproducible
 */
function listPublicPackages() {
  let dirents;
  try {
    dirents = readdirSync(path.join(repoRoot, PACKAGES_DIR), { withFileTypes: true });
  }
  catch {
    return [];
  }

  return dirents
    .filter(dirent => dirent.isDirectory())
    .flatMap((dirent) => {
      const dir = path.join(repoRoot, PACKAGES_DIR, dirent.name);
      let manifest;
      try {
        manifest = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'));
      }
      catch {
        return [];
      }
      if (manifest.private === true) {
        return [];
      }
      const entry = path.join(dir, ENTRY);
      try {
        if (!statSync(entry).isFile()) {
          return [];
        }
      }
      catch {
        return [];
      }
      return [{ slug: dirent.name, entry }];
    })
    .sort((a, b) => (a.slug < b.slug ? -1 : 1));
}

/** @returns {import('typescript').CompilerOptions} the site's own options */
function siteCompilerOptions() {
  try {
    return readCompilerOptions(ts, SITE_TSCONFIG);
  }
  catch (error) {
    return refuse(
      `${error.message}\n`
      + `  fix: restore ${path.relative(repoRoot, SITE_TSCONFIG)}. It is where the\n`
      + '       `@pineappleui/*` -> source `paths` live, and this extraction resolves the\n'
      + '       packages exactly as the site does. Without it every workspace import would\n'
      + '       resolve to `dist/` or not at all, and the props would be a table built on\n'
      + '       whatever the checker made of an unresolved program.',
    );
  }
}

/**
 * Whether a package declares `@radix-ui/themes` as a peer — i.e. whether its
 * props are expected to carry Radix's shared layout props at all. Used only to
 * decide whether "no layout prop anywhere" is a defect or a fact.
 *
 * @param {string} slug
 * @returns {boolean} whether its props should carry Radix's shared set
 */
function wrapsRadix(slug) {
  const manifest = JSON.parse(
    readFileSync(path.join(repoRoot, PACKAGES_DIR, slug, 'package.json'), 'utf8'),
  );
  return manifest.peerDependencies?.['@radix-ui/themes'] !== undefined;
}

const entries = listPublicPackages();

if (entries.length === 0) {
  refuse(
    `found no public package under ${PACKAGES_DIR}/ with a ${ENTRY}, so it would write an\n`
    + 'empty props directory and every package page would report "documents no props".\n'
    + `  fix: check the layout this walks — \`${PACKAGES_DIR}/<slug>/${ENTRY}\`, skipping private\n`
    + '       manifests. Matching nothing is inert, not clean.',
  );
}

const { docs, diagnostics } = extractPackageProps({
  ts,
  entries,
  compilerOptions: siteCompilerOptions(),
});

if (diagnostics.length > 0) {
  refuse(
    `${diagnostics.length} type error(s) in the packages this reads, so the props it would\n`
    + 'write are whatever the checker made of a broken program:\n'
    + `${diagnostics.slice(0, 5).map(diagnostic => `    ${
      path.relative(repoRoot, diagnostic.file.fileName)
    }: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`).join('\n')}\n`
    + '  fix: `npx turbo run typecheck` and fix them there. This refuses rather than emitting\n'
    + '       a table built on `any`, which reads exactly like a table built on real types.',
  );
}

const components = docs.flatMap(doc => doc.components);

if (components.length === 0) {
  refuse(
    `found no component in any of the ${entries.length} package(s) it read, so every Props\n`
    + 'section would say the package documents none.\n'
    + '  fix: see "WHAT IS A COMPONENT" in scripts/extract-props.mjs. The predicate is a\n'
    + '       capitalised export, callable with at most one argument, returning something\n'
    + '       assignable to React\'s `ReactNode` — teach it the shape the packages export now,\n'
    + '       or delete this pipeline rather than leaving it writing empty files.',
  );
}

const radixDocs = docs.filter(doc => doc.components.length > 0 && wrapsRadix(doc.slug));
const layoutProps = components.flatMap(component => component.props).filter(prop => prop.isLayout);

if (radixDocs.length > 0 && layoutProps.length === 0) {
  refuse(
    `extracted ${radixDocs.length} package(s) wrapping @radix-ui/themes and classified none of\n`
    + 'their props as layout props, which every Radix component has.\n'
    + '  fix: update SHARED_PROP_MODULES in scripts/extract-props.mjs — Radix has moved the\n'
    + '       modules that declare `m`, `p`, `width`, `position` and friends. Nothing else\n'
    + '       would report this: the props are all still extracted, so the tables would stay\n'
    + '       correct and grow by ~40 rows each, with the disclosure that keeps them out\n'
    + '       silently empty.',
  );
}

mkdirSync(OUT_DIR, { recursive: true });

const written = new Set(docs.map(doc => `${doc.slug}.json`));
for (const doc of docs) {
  writeFileSync(
    path.join(OUT_DIR, `${doc.slug}.json`),
    `${JSON.stringify(doc, null, 2)}\n`,
  );
}

// A package renamed or unpublished leaves its file behind otherwise, and a
// stale artifact is the one thing a generated directory cannot be trusted to
// notice about itself. Only `.json` files this run did not write, and only in
// the directory this script owns.
for (const name of readdirSync(OUT_DIR)) {
  if (name.endsWith('.json') && !written.has(name)) {
    rmSync(path.join(OUT_DIR, name));
  }
}

console.log(
  `${TOOL_NAME}: ${components.length} component(s) across ${entries.length} package(s)\n`
  + `  -> ${path.relative(repoRoot, OUT_DIR)}/\n`
  + `  ${components.reduce((total, component) => total + component.props.length, 0)} prop(s), `
  + `${layoutProps.length} of them layout props behind the page's disclosure\n`
  + `  no components (nothing to document): ${
    docs.filter(doc => doc.components.length === 0).map(doc => doc.slug).join(', ') || 'none'
  }`,
);
