#!/usr/bin/env node
// Publish-contract guard for every workspace under `packages/*`.
//
// Everything checked here is a SILENT failure without this script:
//
//   - A missing `publishConfig.access: "public"` does not fail review, does not
//     fail CI, and does not fail `changeset version`. It fails at `npm publish`,
//     hours later, on a scoped package that npm defaults to restricted.
//   - A missing `build`/`lint`/`test`/`typecheck` script is not an error to
//     `turbo run` — turbo skips packages that do not define the task and reports
//     success. A package can therefore be entirely unverified and look green.
//   - A `files` field that drifts (or a stray top-level file) ships source into
//     the tarball. Nothing in the build complains.
//
// Every failure below prints the fix, not just the symptom.
//
// Run it *after* `turbo run build` — the tarball check reads `dist/`.
//
//   node scripts/check-publish-contract.mjs

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const REQUIRED_SCRIPTS = ['build', 'lint', 'test', 'typecheck'];
const DIST_PREFIX = 'dist/';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packagesDir = path.join(repoRoot, 'packages');

/** @type {string[]} */
const failures = [];

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
 * Every workspace folder under `packages/`, discovered from the root
 * package-lock so the guard sees exactly what npm installed — a folder that
 * npm does not treat as a workspace would otherwise be checked (or missed)
 * inconsistently with the build.
 */
function listPackageDirs() {
  const lock = readJson(path.join(repoRoot, 'package-lock.json'));
  return Object.keys(lock.packages ?? {})
    .filter(key => key.startsWith('packages/') && key.split('/').length === 2)
    .sort();
}

/**
 * `npm pack --dry-run --json` reports the exact file list npm would upload.
 * Run from the repo root with `--workspace`: `--prefix` does NOT change the
 * cwd `npm pack` resolves against.
 *
 * @param {string} pkgName
 * @returns {string[]} tarball entry paths
 */
function listTarballEntries(pkgName) {
  const stdout = execFileSync(
    'npm',
    ['pack', '--dry-run', '--json', '--workspace', pkgName],
    { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  const [report] = JSON.parse(stdout);
  return (report?.files ?? []).map(entry => entry.path);
}

function checkPublishable(pkgName, relDir, manifest) {
  const access = manifest.publishConfig?.access;
  if (access !== 'public') {
    fail(
      pkgName,
      `publishConfig.access is ${JSON.stringify(access ?? null)}, expected "public"`,
      'add `"publishConfig": { "access": "public" }` to package.json. npm defaults '
      + 'scoped packages to "restricted"; without this the first `npm publish` fails '
      + 'with E402/E403 long after review.',
    );
  }
  if (manifest.publishConfig?.registry) {
    fail(
      pkgName,
      'publishConfig.registry is set',
      'remove it. The scope is mapped to public npm once, in the root .npmrc; '
      + 'a per-package registry silently overrides that.',
    );
  }
  if (!manifest.license) {
    fail(
      pkgName,
      'no license field',
      'add `"license": "MIT"`. npm renders a missing license as "proprietary", '
      + "which trips consumers' license scanners.",
    );
  }
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
    fail(
      pkgName,
      'no files array',
      'add `"files": ["dist"]` so the tarball ships build output only.',
    );
  }
  if (!manifest.exports) {
    fail(
      pkgName,
      'no exports field',
      'add an `exports` map pointing at ./dist/index.mjs and ./dist/index.d.ts.',
    );
  }

  for (const field of ['main', 'module', 'types']) {
    const value = manifest[field];
    if (typeof value !== 'string') {
      fail(pkgName, `no ${field} field`, `add "${field}" pointing into ./dist/.`);
      continue;
    }
    if (!value.replace(/^\.\//, '').startsWith(DIST_PREFIX)) {
      fail(
        pkgName,
        `${field} is ${JSON.stringify(value)}, which is not under dist/`,
        `point "${field}" at the built output under ./dist/ — publishing a path `
        + 'into src/ ships an unbuilt entry point.',
      );
    }
  }

  if (manifest.repository?.directory !== relDir) {
    fail(
      pkgName,
      `repository.directory is ${JSON.stringify(manifest.repository?.directory ?? null)}, `
      + `expected ${JSON.stringify(relDir)}`,
      `set \`"repository": { ..., "directory": "${relDir}" }\` so npm links the `
      + 'package page at its own folder rather than the repo root.',
    );
  }

  const missingScripts = REQUIRED_SCRIPTS.filter(s => !manifest.scripts?.[s]);
  if (missingScripts.length > 0) {
    fail(
      pkgName,
      `missing script(s): ${missingScripts.join(', ')}`,
      '`turbo run <task>` silently skips a package that does not define the task, '
      + 'so a missing script reports no check at all. Define all of: '
      + `${REQUIRED_SCRIPTS.join(', ')}.`,
    );
  }
}

function checkPrivate(pkgName, manifest) {
  if (manifest.publishConfig) {
    fail(
      pkgName,
      'private package declares publishConfig',
      'remove `publishConfig` — a private package is never published, so the field '
      + 'is dead config that reads as intent to publish.',
    );
  }
  if (manifest.version !== '0.0.0') {
    fail(
      pkgName,
      `private package is version ${JSON.stringify(manifest.version ?? null)}, expected "0.0.0"`,
      'set `"version": "0.0.0"`. A private package has no release line; a real '
      + 'version number implies one exists.',
    );
  }
}

function checkTarball(pkgName) {
  let entries;
  try {
    entries = listTarballEntries(pkgName);
  }
  catch (error) {
    throw new Error(
      `Could not run \`npm pack --dry-run\` for ${pkgName}. Run \`npx turbo run build\` `
      + 'first — this check reads the built dist/.',
      { cause: error },
    );
  }

  if (entries.length === 0) {
    fail(
      pkgName,
      'the published tarball would be empty',
      'run `npx turbo run build` before this check, and confirm `files` matches '
      + 'the build output.',
    );
    return;
  }

  const strays = entries.filter(
    entry => entry !== 'package.json' && !entry.startsWith(DIST_PREFIX),
  );
  if (strays.length > 0) {
    fail(
      pkgName,
      `the published tarball would contain non-dist file(s): ${strays.join(', ')}`,
      'tighten `files` back to ["dist"]. Anything outside package.json and dist/ '
      + 'ships source or local config to the public registry.',
    );
  }
}

const packageDirs = listPackageDirs();
if (packageDirs.length === 0) {
  console.error('check-publish-contract: found no workspaces under packages/. '
    + 'Run `npm install` so package-lock.json lists them.');
  process.exit(1);
}

for (const relDir of packageDirs) {
  const manifestPath = path.join(packagesDir, path.basename(relDir), 'package.json');
  const manifest = readJson(manifestPath);
  const pkgName = manifest.name ?? relDir;

  if (manifest.private) {
    checkPrivate(pkgName, manifest);
  }
  else {
    checkPublishable(pkgName, relDir, manifest);
    checkTarball(pkgName);
  }
}

if (failures.length > 0) {
  console.error(
    `\ncheck-publish-contract: ${failures.length} problem(s) in packages/*\n\n`
    + `${failures.map(f => `  ✗ ${f}`).join('\n\n')}\n`,
  );
  process.exit(1);
}

console.log(
  `check-publish-contract: ${packageDirs.length} workspace(s) OK `
  + `(${packageDirs.join(', ')})`,
);
