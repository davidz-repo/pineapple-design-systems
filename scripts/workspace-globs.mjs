// Shared precondition for every guard that makes a repo-wide claim: they only
// know one shape of workspace layout, and they have to say so out loud.
//
// The guards that need a workspace list discover it by matching `<root>/<name>`
// keys in package-lock.json. That filter is not a narrowing — it is the whole
// model. Add a workspace root to the root manifest that the discovery does not
// implement and nothing errors: `check-peer-externals` keeps walking the same
// packages and prints "N bundled package(s) OK", `check-publish-contract` keeps
// printing "N workspace(s) OK" while a whole workspace runs zero tasks, and
// `check-toolchain-hoist` keeps reporting the root's slots while a tree of newly
// declared dependencies sits outside anything it looked at. A smaller set,
// checked green, reported in the same words as the full one.
//
// So the glob list is an assertion rather than a comment, and the discovery it
// describes lives HERE rather than once per guard. One implementation cannot
// drift from another, and `UNDERSTOOD_GLOBS` is true by construction instead of
// by everyone remembering to extend three files.
//
// `apps/*` joined the list with the Ladle gallery workspace (`apps/gallery`).
//
// Who imports what, and why it differs:
//
//   - `check-peer-externals` and `check-publish-contract` walk a workspace list:
//     they take `listWorkspaceDirs()`, which calls the assertion for them.
//   - `check-toolchain-hoist` reads the ROOT manifest's declarations, so it has
//     no list to walk — it takes the assertion alone, because a new workspace
//     root is exactly the event that widens what it does not cover.
//   - `check-token-drift` scans `git ls-files`, which is layout-agnostic and
//     therefore cannot shrink when a workspace root is added. It takes the
//     assertion anyway, so that "which layouts does this repo's tooling
//     understand?" has exactly one answer and every guard reads it from here.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/** The workspace globs the discovery below actually implements. */
const UNDERSTOOD_GLOBS = ['packages/*', 'apps/*'];

// Every understood glob is one directory of single-segment children. The
// discovery slices on that shape, so a glob of any other shape (`apps/**`,
// `docs/site`) would be mis-parsed rather than rejected — assert the shape here
// so the mis-parse is impossible instead of merely unlikely.
const GLOB_SHAPE = /^[^/*]+\/\*$/;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * The root manifest's workspace globs, in either form npm accepts.
 *
 * @param {unknown} workspaces
 * @returns {string[]|null} null when the field is absent or a shape npm accepts
 * and this reader does not.
 */
function readGlobs(workspaces) {
  if (Array.isArray(workspaces)) return workspaces;
  if (workspaces && Array.isArray(workspaces.packages)) return workspaces.packages;
  return null;
}

/**
 * Exits non-zero when the root declares a workspace glob the guards cannot
 * walk. Called before either guard reports anything, so a new workspace root is
 * a failed build with the fix in it rather than a quietly smaller check.
 *
 * @param {string} guardName the calling script, for the message
 */
export function assertWorkspaceGlobsUnderstood(guardName) {
  const manifest = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  const globs = readGlobs(manifest.workspaces);

  if (globs === null) {
    console.error(
      `\n${guardName}: the root package.json declares no readable \`workspaces\` field, so\n`
      + 'this guard cannot tell which trees it is supposed to cover.\n'
      + '  fix: declare `"workspaces": ["packages/*"]` at the root. The guards discover\n'
      + '       workspaces from package-lock.json and check that list against this field;\n'
      + '       with nothing to check against, "found everything" and "found what I know\n'
      + '       how to look for" are the same green.\n',
    );
    process.exit(1);
  }

  const unknown = globs.filter(glob => !UNDERSTOOD_GLOBS.includes(glob));
  if (unknown.length === 0) return;

  console.error(
    `\n${guardName}: the root package.json declares workspace glob(s) the shared\n`
    + `discovery does not implement: ${unknown.join(', ')}.\n`
    + `  fix: add the glob to UNDERSTOOD_GLOBS in scripts/workspace-globs.mjs — which is\n`
    + `       where the discovery lives, so extending the list extends every guard at\n`
    + '       once — or drop the glob. Discovery filters package-lock.json keys to\n'
    + `       \`${UNDERSTOOD_GLOBS.join('`, `')}\`, so a workspace outside that is not checked and not\n`
    + '       reported — the count the guards print stays green while covering less of\n'
    + '       the repo than it did before.\n',
  );
  process.exit(1);
}

/**
 * Every workspace directory, repo-root-relative and sorted, read from
 * package-lock.json so every guard sees exactly the set npm installed — a folder
 * npm does not treat as a workspace would otherwise be checked (or missed)
 * inconsistently with the build.
 *
 * Asserts the root's globs first: a list built from globs the caller cannot walk
 * is the silently-smaller check this module exists to prevent.
 *
 * @param {string} guardName the calling script, for the assertion's message
 * @returns {string[]} e.g. `['apps/gallery', 'packages/badge', ...]`
 */
export function listWorkspaceDirs(guardName) {
  assertWorkspaceGlobsUnderstood(guardName);

  const malformed = UNDERSTOOD_GLOBS.filter(glob => !GLOB_SHAPE.test(glob));
  if (malformed.length > 0) {
    console.error(
      `\n${guardName}: UNDERSTOOD_GLOBS in scripts/workspace-globs.mjs contains a glob this\n`
      + `discovery cannot parse: ${malformed.join(', ')}.\n`
      + '  fix: every entry must be `<dir>/*` — one directory of single-segment children,\n'
      + '       which is what the package-lock filter below implements. A deeper or\n'
      + '       narrower pattern would be silently mismatched here rather than walked.\n',
    );
    process.exit(1);
  }

  const roots = UNDERSTOOD_GLOBS.map(glob => glob.slice(0, -1)); // 'packages/*' -> 'packages/'
  const lock = JSON.parse(readFileSync(path.join(repoRoot, 'package-lock.json'), 'utf8'));

  return Object.keys(lock.packages ?? {})
    .filter(key => key.split('/').length === 2 && roots.some(root => key.startsWith(root)))
    .sort();
}
