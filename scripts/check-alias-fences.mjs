#!/usr/bin/env node
// Alias-fence guard: the gallery's `@pineappleui/*` list is written out in three
// files, and all three must name the same packages.
//
//   - `resolve.alias` in apps/gallery/vite.config.ts — what the bundler resolves
//   - `paths` in apps/gallery/tsconfig.json — what the compiler resolves
//   - the `@pineappleui/*` devDependencies in apps/gallery/package.json — what
//     turbo treats as an edge, and therefore what makes a story edit change the
//     gallery build's hash
//
// Upstream generates the first two from a `sync-aliases.mjs`. That script is not
// ported, so the lists are maintained by hand — and every one of the three ways
// they can drift is silent:
//
//   - MISSING FROM vite.config.ts: the story still renders. Its own imports are
//     relative, so nothing errors — it is only that a cross-package
//     `@pineappleui/*` import resolves through `exports` to `dist/`, i.e. to the
//     last build, and the gallery quietly stops showing the working tree. That is
//     the one thing the gallery exists to do.
//   - MISSING FROM tsconfig.json: `tsc --noEmit` reads the built `.d.ts` while
//     vite bundles `src/`. Both pass. They are checking different files.
//   - MISSING FROM package.json: turbo's task graph loses the edge. `ladle build`
//     still compiles that package's stories (Ladle globs them off disk), but
//     turbo cannot see a file outside the gallery's own directory, so editing a
//     story does not change the gallery build's hash and a warm cache replays the
//     previous build. CI reports a green `build` for a story it never compiled.
//
// So the fences are an assertion rather than a convention. Also asserted: every
// `packages/*` directory that owns a story file appears in the set — a new
// package's stories are picked up by Ladle's glob the moment the file exists,
// with no registration to forget, which is exactly what makes forgetting the
// alias easy.
//
// Needs no build output: it reads configs and directory names only, so it runs
// before `turbo run build` — a fence that lost a package explains the build
// result that follows it.
//
//   node scripts/check-alias-fences.mjs

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { listWorkspaceDirs } from './workspace-globs.mjs';

const GUARD_NAME = 'check-alias-fences';

const GALLERY_DIR = 'apps/gallery';
const VITE_CONFIG = `${GALLERY_DIR}/vite.config.ts`;
const TSCONFIG = `${GALLERY_DIR}/tsconfig.json`;
const MANIFEST = `${GALLERY_DIR}/package.json`;
const LADLE_CONFIG = `${GALLERY_DIR}/.ladle/config.mjs`;

// The marker comments both generated blocks sit between, upstream's shape.
const FENCE_START = '@pineappleui-aliases:start';
const FENCE_END = '@pineappleui-aliases:end';

const SCOPE = '@pineappleui/';

// An alias KEY, in either file and either form: `'@pineappleui/text'`,
// `'@pineappleui/text/'` (vite's subpath key) and `"@pineappleui/text/*"`
// (tsconfig's). Anchored on the `:` that follows, so the right-hand side — which
// holds `packages/<name>/src/...` paths — is never read as a key.
const ALIAS_KEY = /["']@pineappleui\/([a-z0-9-]+)(?:\/\*?)?["']\s*:/g;

// What an alias points AT. A package with no such file cannot be aliased at all,
// which is what structurally exempts the tooling packages (`tsconfig` ships JSON,
// `eslint-config` ships a root `index.mjs`) from the manifest comparison — rather
// than a list of names here, which is where drift hides.
const ALIAS_ENTRY_POINT = 'src/index.ts';

// The story glob this guard implements, asserted against the one Ladle actually
// uses rather than assumed to match it. Ladle finding stories somewhere this
// guard does not look is a package whose alias nothing checks.
const STORY_GLOB = '../../packages/*/src/**/*.stories.{ts,tsx}';
const STORY_ROOT = 'packages';
const STORY_SRC = 'src';
const STORY_FILE = /\.stories\.tsx?$/;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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

/** Exits non-zero: nothing below is meaningful once a file cannot be read. */
function refuse(message) {
  console.error(`\n${GUARD_NAME}: ${message}\n`);
  process.exit(1);
}

/**
 * The package names named by alias keys between the marker comments.
 *
 * Refuses a file whose fence is absent or empty rather than returning a short
 * set: an empty fence would read here as "every package is missing", which is
 * loud, but a renamed marker would read as "both files agree on nothing", which
 * is not the report anyone needs.
 *
 * @param {string} relPath
 * @returns {Set<string>}
 */
function readFencedPackages(relPath) {
  const source = readFileSync(path.join(repoRoot, relPath), 'utf8');
  const start = source.indexOf(FENCE_START);
  const end = source.indexOf(FENCE_END);

  if (start === -1 || end === -1 || end < start) {
    refuse(
      `${relPath} has no \`${FENCE_START}\` … \`${FENCE_END}\` block.\n`
      + '  fix: restore the marker comments around the alias list. They are what makes\n'
      + '       the list machine-readable, and this guard is the only thing that compares\n'
      + `       ${VITE_CONFIG}, ${TSCONFIG} and\n`
      + `       ${MANIFEST} to each other.`,
    );
  }

  const names = new Set(
    [...source.slice(start, end).matchAll(ALIAS_KEY)].map(match => match[1]),
  );

  if (names.size === 0) {
    refuse(
      `${relPath}'s \`${FENCE_START}\` block names no ${SCOPE}* package.\n`
      + '  fix: the block is empty, or its entries are written in a form this guard\n'
      + `       cannot read — it matches a quoted \`${SCOPE}<name>\` key followed by a\n`
      + '       colon. An unreadable block passes as an empty one, and an empty one is\n'
      + '       the whole list gone missing.',
    );
  }

  return names;
}

/** `packages/badge` -> `badge`, via the workspace list rather than by assuming the layout. */
function readWorkspaceDirsByPackageName() {
  /** @type {Map<string, string>} */
  const byName = new Map();
  for (const relDir of listWorkspaceDirs(GUARD_NAME)) {
    const manifest = JSON.parse(readFileSync(path.join(repoRoot, relDir, 'package.json'), 'utf8'));
    if (manifest.name) byName.set(manifest.name, relDir);
  }
  return byName;
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

/** @param {string} dir absolute @returns {boolean} */
function hasStoryFile(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  }
  catch {
    return false;
  }
  return entries.some(entry => (entry.isDirectory()
    ? hasStoryFile(path.join(dir, entry.name))
    : STORY_FILE.test(entry.name)));
}

/**
 * Every `packages/*` directory Ladle would find a story in.
 *
 * The glob is read from the Ladle config and asserted to be the one shape
 * implemented here. A changed glob is a legitimate thing to want; a changed glob
 * this guard silently kept scanning `packages/*` for is a set of stories nothing
 * checks the aliases of.
 */
async function listStoryOwningPackages() {
  const { default: ladleConfig } = await import(pathToFileURL(path.join(repoRoot, LADLE_CONFIG)));
  const stories = ladleConfig?.stories;

  if (!Array.isArray(stories) || stories.length !== 1 || stories[0] !== STORY_GLOB) {
    refuse(
      `${LADLE_CONFIG} globs stories as ${JSON.stringify(stories)}, and this guard\n`
      + `implements exactly one pattern: ${STORY_GLOB}.\n`
      + `  fix: teach \`listStoryOwningPackages()\` in scripts/${path.basename(fileURLToPath(import.meta.url))}\n`
      + '       the new pattern, or restore the old one. Ladle finds stories wherever the\n'
      + '       glob says; a tree this guard does not walk is a set of stories whose\n'
      + '       aliases nothing compares against the three files.',
    );
  }

  return readdirSync(path.join(repoRoot, STORY_ROOT), { withFileTypes: true })
    .filter(entry => entry.isDirectory()
      && hasStoryFile(path.join(repoRoot, STORY_ROOT, entry.name, STORY_SRC)))
    .map(entry => entry.name)
    .sort();
}

const inVite = readFencedPackages(VITE_CONFIG);
const inTsconfig = readFencedPackages(TSCONFIG);

const galleryManifest = JSON.parse(readFileSync(path.join(repoRoot, MANIFEST), 'utf8'));
const workspaceDirsByName = readWorkspaceDirsByPackageName();

// Only the devDependencies an alias could express. A workspace with no
// `src/index.ts` has nothing for `resolve.alias` to point at, so its absence
// from the fences is structural rather than an omission — derived from the
// layout, never from a list of exempt names.
const declared = new Set(
  Object.keys(galleryManifest.devDependencies ?? {})
    .filter(name => name.startsWith(SCOPE))
    .filter((name) => {
      const relDir = workspaceDirsByName.get(name);
      return relDir === undefined || exists(path.join(repoRoot, relDir, ALIAS_ENTRY_POINT));
    })
    .map(name => name.slice(SCOPE.length)),
);

const storyOwners = await listStoryOwningPackages();

const WHY_EACH_FILE = {
  [VITE_CONFIG]: 'without it the gallery bundles that package from dist/ — the last build — '
    + 'instead of src/, which is the one thing the gallery exists to show',
  [TSCONFIG]: 'without it `tsc --noEmit` checks that package\'s built .d.ts while vite '
    + 'bundles its source, so the two green results are about different files',
  [MANIFEST]: 'without it turbo has no edge to that package, so editing one of its stories '
    + 'does not change this build\'s hash and a warm cache replays a build that never '
    + 'compiled the edit',
};

for (const name of [...new Set([...inVite, ...inTsconfig, ...declared, ...storyOwners])].sort()) {
  const presence = [
    [VITE_CONFIG, inVite.has(name)],
    [TSCONFIG, inTsconfig.has(name)],
    [MANIFEST, declared.has(name)],
  ];
  const absent = presence.filter(([, present]) => !present).map(([file]) => file);
  if (absent.length === 0) continue;

  const present = presence.filter(([, isPresent]) => isPresent).map(([file]) => file);
  const ownsStories = storyOwners.includes(name);

  fail(
    `${SCOPE}${name}`,
    `is ${present.length > 0 ? `named in ${present.join(' and ')} but ` : ''}`
    + `missing from ${absent.join(' and ')}`
    + (ownsStories && present.length === 0
      ? `, and ${STORY_ROOT}/${name} owns a story file the gallery compiles`
      : ''),
    `add ${SCOPE}${name} to ${absent.join(' and ')}`
    + (present.length > 0
      ? `, or remove it from ${present.join(' and ')} if it does not belong in the gallery`
      : `. Ladle globs its stories off disk the moment the file exists — there is nothing `
        + 'to register per package, which is exactly what makes the alias easy to forget')
    + `. The three lists are one decision written three times, inside the \`${FENCE_START}\` `
    + `fences in the two configs: ${absent.map(file => `${file} — ${WHY_EACH_FILE[file]}`).join('; ')}. `
    + 'Each of those passes every other check in this repo.',
  );
}

if (failures.length > 0) {
  console.error(
    `\n${GUARD_NAME}: ${failures.length} package(s) drifted across the gallery's three alias lists\n\n`
    + `${failures.map(f => `  ✗ ${f}`).join('\n\n')}\n`,
  );
  process.exit(1);
}

console.log(
  `${GUARD_NAME}: ${inVite.size} aliased package(s) OK, agreeing across `
  + `${VITE_CONFIG}, ${TSCONFIG} and ${MANIFEST}\n`
  + `  ${storyOwners.length} of them own a story file the gallery build compiles: `
  + `${storyOwners.join(', ')}`,
);
