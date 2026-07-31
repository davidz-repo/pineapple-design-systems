// Shared precondition for the two dependency guards: they only know one shape
// of workspace layout, and they have to say so out loud.
//
// Both discover workspaces by matching `packages/<name>` keys in
// package-lock.json. That filter is not a narrowing — it is the whole model. Add
// a second workspace root to the root manifest (`apps/*`, which the Ladle
// gallery workspace brings) and nothing here errors: `check-peer-externals`
// keeps walking the same four packages and prints "4 bundled package(s) OK",
// and `check-toolchain-hoist` keeps reporting the root's slots while a whole
// tree of newly declared dependencies sits outside anything it looked at. A
// smaller set, checked green, reported in the same words as the full one.
//
// So the glob list is an assertion rather than a comment. Extending the
// discovery is a small edit; noticing that it was never extended is not.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/** The workspace globs both guards' discovery actually implements. */
const UNDERSTOOD_GLOBS = ['packages/*'];

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
    `\n${guardName}: the root package.json declares workspace glob(s) this guard's\n`
    + `discovery does not implement: ${unknown.join(', ')}.\n`
    + `  fix: extend the discovery in scripts/check-peer-externals.mjs and\n`
    + `       scripts/check-toolchain-hoist.mjs (and the list in\n`
    + `       scripts/workspace-globs.mjs) to cover the new workspace root, or drop the\n`
    + `       glob. Both guards filter package-lock.json keys to \`${UNDERSTOOD_GLOBS.join('`, `')}\`, so a\n`
    + '       workspace outside that is not checked and not reported — the count they\n'
    + '       print stays green while covering less of the repo than it did before.\n',
  );
  process.exit(1);
}
