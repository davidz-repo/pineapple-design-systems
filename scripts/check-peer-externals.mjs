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
// Run it *after* `turbo run build` — assertions B and C read `dist/`.
//
//   node scripts/check-peer-externals.mjs

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire, isBuiltin } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

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
const packagesDir = path.join(repoRoot, 'packages');

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

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

/**
 * Every workspace folder under `packages/`, read from the root package-lock so
 * this guard sees exactly the set npm installed — same source of truth as
 * check-publish-contract.mjs, so the two can never disagree about what a
 * workspace is.
 */
function listPackageDirs() {
  const lock = readJson(path.join(repoRoot, 'package-lock.json'));
  return Object.keys(lock.packages ?? {})
    .filter(key => key.startsWith('packages/') && key.split('/').length === 2)
    .sort();
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

/**
 * Comments hold example imports and explanations of why something is external.
 * Neither is code, and reading one as an import would make the guard report on
 * prose.
 *
 * @param {string} source
 */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
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
function collectSourceImports(files) {
  const imported = new Set();
  const runtime = new Set();
  let hasJsx = false;

  for (const file of files) {
    const source = stripComments(readFileSync(file, 'utf8'));
    if (JSX_EXTENSIONS.has(path.extname(file)) && /<[A-Za-z][\w.:-]*[\s/>]/.test(source)) {
      hasJsx = true;
    }

    for (const match of source.matchAll(FROM_IMPORT)) {
      const { clause, specifier } = match.groups;
      if (!isBareSpecifier(specifier)) continue;
      const pkg = packageOfSpecifier(specifier);
      imported.add(pkg);
      if (!isTypeOnlyClause(clause)) runtime.add(pkg);
    }

    for (const pattern of [SIDE_EFFECT_IMPORT, DYNAMIC_IMPORT]) {
      for (const match of source.matchAll(pattern)) {
        const { specifier } = match.groups;
        if (!isBareSpecifier(specifier)) continue;
        imported.add(packageOfSpecifier(specifier));
        runtime.add(packageOfSpecifier(specifier));
      }
    }
  }

  return { imported, runtime, hasJsx };
}

/** Bare package names imported by a built entry point. */
function collectBuiltImports(entryPath) {
  const source = readFileSync(entryPath, 'utf8');
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
  const source = stripComments(readFileSync(configPath, 'utf8'));
  // Negative lookbehind so `noExternal:` is not mistaken for `external:`.
  const hasExternalKey = /(?<![\w$])external\s*:/.test(source);
  const arrayMatch = source.match(/(?<![\w$])external\s*:\s*\[(?<body>[^\]]*)\]/);

  if (!hasExternalKey) return new Set(); // No externals declared: an empty list.

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
 * @param {string} pkgDir absolute
 * @returns {{ jsx?: string, jsxImportSource?: string }}
 */
function resolveJsxOptions(pkgDir) {
  /** @type {Record<string, unknown>} */
  const merged = {};
  let configPath = path.join(pkgDir, 'tsconfig.json');
  const seen = new Set();

  while (exists(configPath) && !seen.has(configPath)) {
    seen.add(configPath);
    const config = readJson(configPath);
    // Nearest config wins, so only fill what an inner one has not already set.
    for (const key of ['jsx', 'jsxImportSource']) {
      if (config.compilerOptions?.[key] !== undefined && merged[key] === undefined) {
        merged[key] = config.compilerOptions[key];
      }
    }
    if (typeof config.extends !== 'string') break;
    configPath = config.extends.startsWith('.')
      ? path.resolve(path.dirname(configPath), config.extends)
      : createRequire(configPath).resolve(config.extends);
  }

  return merged;
}

function checkPackage(relDir) {
  const pkgDir = path.join(packagesDir, path.basename(relDir));
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
      'run `npx turbo run build` first. Two of the three assertions here read the '
      + 'built output, because what the config asks for and what the bundler emitted '
      + 'are different facts.',
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

  const { imported, runtime, hasJsx } = collectSourceImports(sourceFiles);

  // The compiler-inserted JSX import. Without this, a package whose sources
  // name no React identifier — every Radix wrapper in Phase 2 — looks as though
  // it does not use React at all, and dropping `react` from `external` inlines
  // the runtime with nothing to notice.
  const { jsx, jsxImportSource = DEFAULT_JSX_IMPORT_SOURCE } = resolveJsxOptions(pkgDir);
  const usesAutomaticJsx = hasJsx && AUTOMATIC_JSX.has(jsx);
  // True when JSX is the ONLY thing tying this package to the import source —
  // the case a reader is most likely to mistake for "we don't use React here".
  const jsxIsSoleUse = usesAutomaticJsx && !imported.has(jsxImportSource);
  if (usesAutomaticJsx) {
    imported.add(jsxImportSource);
    runtime.add(jsxImportSource);
  }

  const built = collectBuiltImports(entryPath);
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
      + 'The two halves of docs/plan.md principle 3 are one rule: the declaration keeps '
      + "npm from installing a second copy into the consumer's tree, `external` keeps "
      + 'tsup from inlining one into dist/. With only the declaration, the bundle ships '
      + 'its own copy and the consumer gets two — which surfaces as an "invalid hook '
      + 'call" in THEIR app, not a failure here.',
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
      + `A stale dist/ explains this innocently; anything else means the config says `
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

const packageDirs = listPackageDirs();
if (packageDirs.length === 0) {
  console.error(
    '\ncheck-peer-externals: found no workspaces under packages/.\n'
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
    `\ncheck-peer-externals: ${failures.length} problem(s) in packages/*\n\n`
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
