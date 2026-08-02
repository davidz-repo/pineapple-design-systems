#!/usr/bin/env node
// Publish-contract guard for every workspace the root manifest declares.
//
// Everything checked here is a SILENT failure without this script:
//
//   - A missing `publishConfig.access: "public"` does not fail review, does not
//     fail CI, and does not fail `changeset version`. It fails at `npm publish`,
//     hours later, on a scoped package that npm defaults to restricted.
//   - A missing `build`/`lint`/`test`/`typecheck` script is not an error to
//     `turbo run` — turbo skips packages that do not define the task and reports
//     success. A package can therefore be entirely unverified and look green.
//     This applies to PRIVATE packages just as much as publishable ones, so the
//     task-coverage check below runs for every workspace: a tooling package that
//     runs zero tasks is exactly as unverified as a published one. A workspace
//     may omit a task only by DECLARING it, with a reason, in its own manifest:
//
//       "pineapple": { "tasksNotApplicable": { "build": "<why it cannot apply>" } }
//
//     An omission is then deliberate and visible in review. An undeclared one
//     fails here, loudly, with the fix in the message.
//   - A `files` field that drifts (or a stray top-level file) ships source into
//     the tarball. Nothing in the build complains.
//   - An `exports` subpath pointing at a file the build no longer writes — say
//     `"./styles.css": "./dist/styles.css"` after the tsup loader that copies it
//     is dropped — publishes cleanly. `files: ["dist"]` is still honoured, the
//     tarball is still non-empty, and the failure is the consumer's
//     `import '@pineappleui/theme/styles.css'` throwing in their build.
//   - A runtime dependency on a SIBLING workspace written as `"*"` publishes
//     that `"*"`. Locally it is the shorthand npm resolves to the package next
//     door, so every build, test and typecheck here is correct — and changesets
//     never rewrites it, because its range check reads `"*"` as an empty range
//     and skips it. The tarball then tells every consumer "any version of
//     @pineappleui/tokens will do", which npm satisfies with whatever is newest
//     at install time. Nothing in this repo installs from the registry, so
//     nothing here can notice.
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
import { listWorkspaceDirs } from './workspace-globs.mjs';

const REQUIRED_SCRIPTS = ['build', 'lint', 'test', 'typecheck'];
const DIST_PREFIX = 'dist/';

// The manifest fields that TRAVEL: npm resolves both against the consumer's
// registry, so a range in either one is a promise made to somebody else.
// `devDependencies` do not travel, which is why `"*"` is the house style there.
const SHIPPED_DEPENDENCY_FIELDS = ['dependencies', 'peerDependencies'];

// A range this guard can certify: one concrete `major.minor.patch`, optionally
// carrying a prerelease/build tag, optionally prefixed by one comparator. That
// covers every range this repo writes (`^0.1.1`, `~5.2.9`, `19.0.0`) and
// deliberately nothing else — a compound range (`>=1 <2`, `1 || 2`) is a
// legitimate thing to want and not something a regex should quietly bless.
const PINNED_RANGE = /^(?:\^|~|>=|>|<=|<|=)?\d+\.\d+\.\d+(?:[-+][\w.]+)*$/;

// npm picks these up from the PACKAGE directory whatever `files` says — and only
// from the package directory. A LICENSE at the repo root does not reach any
// tarball, so an unlicensed package on npm renders as "proprietary" while the
// repo looks correctly licensed from the outside.
const LICENSE_FILE = 'LICENSE';
const README_FILE = 'README.md';

// Where a workspace declares a task it deliberately does not run, and why:
//   "pineapple": { "tasksNotApplicable": { "test": "<reason>" } }
const OPT_OUT_NAMESPACE = 'pineapple';
const OPT_OUT_FIELD = 'tasksNotApplicable';
const OPT_OUT_PATH = `${OPT_OUT_NAMESPACE}.${OPT_OUT_FIELD}`;

// A reason has to actually say something. "n/a" is an undeclared omission
// wearing a declaration's clothes.
const MIN_REASON_LENGTH = 20;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// The canonical licence text every publishable package must ship verbatim.
const rootLicense = readFileSync(path.join(repoRoot, LICENSE_FILE), 'utf8');

/** @type {string[]} */
const failures = [];

// Tally of every workspace × task slot, so the pass line states coverage
// instead of implying it. `defined` runs a script; `declared` is an
// explicit, reasoned opt-out. There is no third category — that is the point.
const taskSlots = { defined: 0, declared: 0 };

// Sibling-workspace ranges seen in a field that travels. Reported for the same
// reason as the stylesheet count in check-peer-externals: `@pineappleui/theme`
// is the only package with one today, so a count of 0 is this assertion having
// gone inert rather than the repo being clean.
/** @type {string[]} */
const shippedWorkspaceRanges = [];

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

}

/**
 * A sibling workspace named in a field that TRAVELS must carry a real range.
 *
 * `"*"` is the house style for a workspace `devDependency`, and it is correct
 * there: npm resolves it to the package next door and nothing is published. In
 * `dependencies` or `peerDependencies` the same three characters are shipped
 * verbatim to every consumer, and they mean "any version" — including the next
 * major, published years later, against an API this package was never compiled
 * against.
 *
 * The reason it needs a check rather than a reviewer: `changeset version` looks
 * like the thing that would fix it. It rewrites internal ranges on every bump
 * (`updateInternalDependencies` in .changeset/config.json), so a range that is
 * merely *stale* self-corrects — but its own range check treats `"*"` as empty
 * and passes over it, so that one value is the only one it never touches. The
 * release runs, the changelog is right, and the tarball ships `"*"`.
 *
 * @param {string} pkgName
 * @param {string} relDir
 * @param {object} manifest
 * @param {Map<string, string>} workspaceVersions package name -> current version
 */
function checkWorkspaceRanges(pkgName, relDir, manifest, workspaceVersions) {
  for (const field of SHIPPED_DEPENDENCY_FIELDS) {
    for (const [name, range] of Object.entries(manifest[field] ?? {})) {
      const version = workspaceVersions.get(name);
      if (version === undefined) continue; // Not a sibling; npm's problem, not this one's.

      shippedWorkspaceRanges.push(`${pkgName} ${field}["${name}"]=${range}`);
      if (typeof range === 'string' && PINNED_RANGE.test(range)) continue;

      fail(
        pkgName,
        `${field}["${name}"] is ${JSON.stringify(range)}, which is not a pinned semver range`,
        `write \`"${name}": "^${version}"\` in ${relDir}/package.json — the caret of the `
        + `version ${name} is at today. \`"*"\` is the right shorthand for a workspace `
        + 'devDependency and the wrong one here: devDependencies never travel, these two '
        + 'fields do, and npm resolves what ships against the REGISTRY. A consumer '
        + `installing this package would take whatever ${name} is newest at that moment, `
        + 'across majors this code has never been compiled against. `changeset version` '
        + 'does not save you: it rewrites internal ranges on every bump, but its range '
        + 'check reads `"*"` as empty and skips it, so that is the one value it leaves '
        + 'alone. If a compound range (`>=1 <2`) is really wanted, teach `PINNED_RANGE` in '
        + 'scripts/check-publish-contract.mjs to read it rather than loosening it to '
        + 'anything.',
      );
    }
  }
}

/**
 * Every workspace must either define all four task scripts or declare, in its
 * own manifest, which it omits and why. Runs for private packages too — see the
 * header: an unexercised tooling package reports green exactly like an
 * unexercised published one.
 *
 * @param {string} pkgName
 * @param {string} relDir
 * @param {object} manifest
 */
function checkTaskCoverage(pkgName, relDir, manifest) {
  const declared = manifest[OPT_OUT_NAMESPACE]?.[OPT_OUT_FIELD];
  const manifestPath = `${relDir}/package.json`;

  if (declared !== undefined
    && (typeof declared !== 'object' || declared === null || Array.isArray(declared))) {
    fail(
      pkgName,
      `${OPT_OUT_PATH} is ${JSON.stringify(declared)}, expected an object`,
      `write it as \`"${OPT_OUT_NAMESPACE}": { "${OPT_OUT_FIELD}": `
      + '{ "<task>": "<why it does not apply>" } }` in '
      + `${manifestPath}.`,
    );
    return;
  }

  const optOuts = declared ?? {};

  // A declaration that names a task nobody runs, or one the package *does*
  // define, is stale config that reads as a deliberate decision.
  for (const [task, reason] of Object.entries(optOuts)) {
    if (!REQUIRED_SCRIPTS.includes(task)) {
      fail(
        pkgName,
        `${OPT_OUT_PATH} declares "${task}", which is not one of the required tasks`,
        `remove it, or fix the spelling. Required tasks are: ${REQUIRED_SCRIPTS.join(', ')}. `
        + 'A declaration for a task that does not exist silences nothing and reads as if it does.',
      );
      continue;
    }
    if (manifest.scripts?.[task]) {
      fail(
        pkgName,
        `${OPT_OUT_PATH} declares "${task}" not applicable, but a "${task}" script exists`,
        `remove "${task}" from ${OPT_OUT_PATH} in ${manifestPath}. The script runs, so the `
        + 'declaration is stale and misdescribes what is verified.',
      );
      continue;
    }
    if (typeof reason !== 'string' || reason.trim().length < MIN_REASON_LENGTH) {
      fail(
        pkgName,
        `${OPT_OUT_PATH}.${task} is ${JSON.stringify(reason)}, which does not explain anything`,
        `give a real reason (at least ${MIN_REASON_LENGTH} characters) in ${manifestPath} saying `
        + `why "${task}" cannot apply here and where that surface is covered instead. The point of `
        + 'the declaration is that the next reader can tell a deliberate gap from an oversight.',
      );
    }
  }

  for (const task of REQUIRED_SCRIPTS) {
    if (manifest.scripts?.[task]) {
      taskSlots.defined++;
      continue;
    }
    if (Object.hasOwn(optOuts, task)) {
      taskSlots.declared++;
      continue;
    }
    fail(
      pkgName,
      `no "${task}" script, and no declared opt-out for it`,
      `either add a "${task}" script to ${manifestPath}, or declare the omission: `
      + `\`"${OPT_OUT_NAMESPACE}": { "${OPT_OUT_FIELD}": { "${task}": "<why it does not apply>" } }\`. `
      + `\`turbo run ${task}\` silently skips a package that does not define the task and still `
      + 'reports success — so an undeclared omission is not a failing check, it is no check at '
      + 'all, reported green. Do not add a script that runs nothing just to satisfy this; a '
      + 'declared opt-out is honest, a hollow script is not.',
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

/**
 * Every file path a manifest points a consumer at: `main`, `module`, `types`,
 * and every string leaf of `exports` — condition maps (`import`/`types`) and
 * subpaths (`"./styles.css"`) alike, since each leaf is a path npm will be
 * asked to resolve.
 *
 * @param {string} pkgName
 * @param {object} manifest
 * @returns {string[]|null} tarball-relative paths, null once a refusal is reported
 */
function listDeclaredEntryPoints(pkgName, manifest) {
  const targets = new Set();

  for (const field of ['main', 'module', 'types']) {
    if (typeof manifest[field] === 'string') targets.add(manifest[field]);
  }

  const collect = (value) => {
    if (typeof value === 'string') {
      targets.add(value);
      return;
    }
    if (value !== null && typeof value === 'object') {
      for (const nested of Object.values(value)) collect(nested);
    }
  };
  collect(manifest.exports ?? {});

  const patterns = [...targets].filter(target => target.includes('*'));
  if (patterns.length > 0) {
    // A subpath pattern is a legitimate thing to want; resolving one needs a
    // glob this guard does not do. Skipping it quietly would leave the entry
    // points it covers unchecked under a line that says the package is OK.
    fail(
      pkgName,
      `exports declares subpath pattern(s) (${patterns.join(', ')}), and this check `
      + 'compares literal paths against the tarball file list',
      'teach `listDeclaredEntryPoints()` in scripts/check-publish-contract.mjs to expand '
      + 'a pattern against the tarball entries, or write the subpaths out literally. '
      + 'Passing over the pattern would certify the entry points it covers without '
      + 'having looked at one.',
    );
    return null;
  }

  return [...targets].map(target => target.replace(/^\.\//, ''));
}

function checkTarball(pkgName, relDir, manifest) {
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

  // Assert the build output is PRESENT, not merely that the list is non-empty.
  // `npm pack` always emits package.json, so "empty tarball" is unreachable: a
  // package with no dist/ at all packs exactly one file and reads as fine. That
  // is the one thing this check exists to catch, so it has to name dist/.
  const distEntries = entries.filter(entry => entry.startsWith(DIST_PREFIX));
  if (distEntries.length === 0) {
    fail(
      pkgName,
      `the published tarball would contain no ${DIST_PREFIX} files (would ship: `
      + `${entries.join(', ')})`,
      'run `npm run build` before this check. A published package with no build '
      + 'output installs successfully and then fails at import — and because npm '
      + 'always packs package.json, the tarball is never literally empty, so '
      + 'nothing else notices.',
    );
  }

  const strays = entries.filter(
    entry => entry !== 'package.json'
      && entry !== LICENSE_FILE
      && entry !== README_FILE
      && !entry.startsWith(DIST_PREFIX),
  );
  if (strays.length > 0) {
    fail(
      pkgName,
      `the published tarball would contain unexpected file(s): ${strays.join(', ')}`,
      `tighten \`files\` back to ["dist"]. Anything outside package.json, ${LICENSE_FILE}, `
      + `${README_FILE} and ${DIST_PREFIX} ships source or local config to the public registry.`,
    );
  }

  // Every path the manifest points at has to be IN the tarball. `files` and the
  // dist/ check above only prove that something was packed; this proves the
  // specific files consumers import were. The gap it closes is a second entry
  // point — a stylesheet, a subpath export — that the build stopped writing.
  for (const target of listDeclaredEntryPoints(pkgName, manifest) ?? []) {
    if (entries.includes(target)) continue;
    fail(
      pkgName,
      `the manifest points at ${target}, which the published tarball would not contain `
      + `(it would ship: ${entries.join(', ')})`,
      `either build the file (check this package's tsup.config.ts — a second \`entry\`, or `
      + 'the loader that copies it, is what puts a non-JS file in dist/) or stop declaring '
      + 'it. A published package whose `exports` names a missing file installs cleanly and '
      + "fails at the consumer's import, which is the first place anything looks.",
    );
  }

  for (const required of [LICENSE_FILE, README_FILE]) {
    if (entries.includes(required)) continue;
    fail(
      pkgName,
      `the published tarball would not contain ${required}`,
      `add ${required} to ${relDir}/. npm only reads it from the package `
      + 'directory, so the repo-root copy does not travel; without it the npm page '
      + `renders ${required === LICENSE_FILE ? 'the package as "proprietary"' : 'as a bare file list'}.`,
    );
  }
}

/**
 * The per-package LICENSE is a copy, and copies drift — relicense at the root
 * and the published grant silently stays on the old terms. Cheap to assert, and
 * the assertion is the only thing standing between "copied once" and "correct".
 *
 * @param {string} pkgName
 * @param {string} relDir
 */
function checkLicenseMatchesRoot(pkgName, relDir) {
  const packageLicensePath = path.join(repoRoot, relDir, LICENSE_FILE);
  let packageLicense;
  try {
    packageLicense = readFileSync(packageLicensePath, 'utf8');
  }
  catch {
    return; // Absence is reported against the tarball, above.
  }

  if (packageLicense !== rootLicense) {
    fail(
      pkgName,
      `${relDir}/${LICENSE_FILE} differs from the repo-root ${LICENSE_FILE}`,
      `copy the root ${LICENSE_FILE} over ${relDir}/${LICENSE_FILE}. Two licence texts `
      + 'that disagree is worse than one: the published grant is whichever copy '
      + 'happened to ship.',
    );
  }
}

// Discovery — and the assertion that the root declares no workspace root it
// cannot walk — is shared with check-peer-externals.mjs, so the two can never
// disagree about what a workspace is. Task coverage is the assertion that most
// needs the full list: a workspace this guard never enumerates is a workspace
// free to run zero tasks, under a line that still says "N workspace(s) OK".
const packageDirs = listWorkspaceDirs('check-publish-contract');
if (packageDirs.length === 0) {
  console.error('check-publish-contract: found no workspaces in the root package.json '
    + 'globs. Run `npm install` so package-lock.json lists them.');
  process.exit(1);
}

// Read every manifest first: `checkWorkspaceRanges` needs to know which names
// are siblings, and one workspace's answer depends on all the others.
//
// Resolved from the workspace path itself, never by re-rooting its basename
// under packages/: `apps/gallery` would otherwise be read as `packages/gallery`
// — another package's manifest, or none at all.
const workspaces = packageDirs.map((relDir) => {
  const manifest = readJson(path.join(repoRoot, relDir, 'package.json'));
  return { relDir, manifest, pkgName: manifest.name ?? relDir };
});

/** Package name -> the version that workspace is at today. */
const workspaceVersions = new Map(
  workspaces
    .filter(({ manifest }) => manifest.name && manifest.version)
    .map(({ manifest }) => [manifest.name, manifest.version]),
);

for (const { relDir, manifest, pkgName } of workspaces) {
  // Runs for every workspace, private or not: turbo skips an undefined task
  // identically in both cases.
  checkTaskCoverage(pkgName, relDir, manifest);

  if (manifest.private) {
    checkPrivate(pkgName, manifest);
  }
  else {
    checkPublishable(pkgName, relDir, manifest);
    checkWorkspaceRanges(pkgName, relDir, manifest, workspaceVersions);
    checkTarball(pkgName, relDir, manifest);
    checkLicenseMatchesRoot(pkgName, relDir);
  }
}

if (failures.length > 0) {
  console.error(
    `\ncheck-publish-contract: ${failures.length} problem(s) across the workspaces\n\n`
    + `${failures.map(f => `  ✗ ${f}`).join('\n\n')}\n`,
  );
  process.exit(1);
}

const totalSlots = packageDirs.length * REQUIRED_SCRIPTS.length;
console.log(
  `check-publish-contract: ${packageDirs.length} workspace(s) OK `
  + `(${packageDirs.join(', ')})\n`
  + `  task coverage: ${taskSlots.defined}/${totalSlots} slots run a script, `
  + `${taskSlots.declared} declared not applicable, 0 undeclared.\n`
  + `  ${shippedWorkspaceRanges.length} shipped range(s) naming a sibling workspace: `
  + `${shippedWorkspaceRanges.join(', ') || 'none'}`,
);
