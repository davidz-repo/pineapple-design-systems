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
// Three things are asserted, and each of them fails LOUDLY in a place where the
// alternative is a smaller check reported in the same words as the full one:
//
//   1. the root's globs and `UNDERSTOOD_GLOBS` are the same SET, both
//      directions — a glob only the root declares is a tree nothing walks, and a
//      glob only this file keeps is a tree npm has stopped installing
//   2. `UNDERSTOOD_GLOBS` is parseable at all, checked at module scope so the
//      importers that take only the assertion refuse it too
//   3. the lock-derived workspace list matches what is on disk — the lockfile is
//      the right source and a stale one is invisible
//
// `apps/*` joined the list with the Ladle gallery workspace (`apps/gallery`).
//
// Who imports what, and why it differs:
//
//   - `check-peer-externals`, `check-publish-contract` and `check-ref-tests` walk
//     a workspace list: they take `listWorkspaceDirs()`, which calls the
//     assertion for them. `check-ref-tests` is the one of the three whose subject
//     is a SUBSET of that list — the packages whose sources forward a ref — and
//     it takes the whole list for exactly that reason: the subset has to be
//     derived from every workspace npm installs, or the guard's required set
//     shrinks with the discovery and reports the same pass over less.
//   - `check-toolchain-hoist` reads the ROOT manifest's declarations, so it has
//     no list to walk — it takes the assertion alone, because a new workspace
//     root is exactly the event that widens what it does not cover.
//   - `check-token-drift` scans `git ls-files`, which is layout-agnostic and
//     therefore cannot shrink when a workspace root is added. It takes the
//     assertion anyway, so that "which layouts does this repo's tooling
//     understand?" has exactly one answer and every guard reads it from here.
//   - `check-ci-invariants` is the one guard that takes NEITHER, and the reason
//     is the first line above: it makes no claim over the workspace SET. Its
//     subject is three named things — the CI workflow, the root `verify` chain,
//     and the `scripts/` directory — none of which a new glob can shrink, and
//     importing the assertion would only give it a second, unrelated way to
//     fail. It does read a cache `key` that literally lists workspace globs,
//     but says nothing about which globs belong there: whether that list covers
//     a new tree is turbo's own re-hash concern, argued where the key is
//     written.

import { readdirSync, readFileSync, statSync } from 'node:fs';
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

// Checked at MODULE scope, not inside `listWorkspaceDirs()`: a malformed entry
// in the constant above is a defect in this file, and it is just as wrong for
// the two guards that import only the assertion — they would otherwise be
// certified against a glob list that cannot be parsed, which is the same
// silently-smaller check by a different route. Named for the module rather than
// the caller for the same reason: no guard did this, and every guard gets it.
const malformedGlobs = UNDERSTOOD_GLOBS.filter(glob => !GLOB_SHAPE.test(glob));
if (malformedGlobs.length > 0) {
  console.error(
    '\nworkspace-globs: UNDERSTOOD_GLOBS in scripts/workspace-globs.mjs contains a glob\n'
    + `this discovery cannot parse: ${malformedGlobs.join(', ')}.\n`
    + '  fix: every entry must be `<dir>/*` — one directory of single-segment children,\n'
    + '       which is what the package-lock filter below implements. A deeper or\n'
    + '       narrower pattern would be silently mismatched here rather than walked.\n',
  );
  process.exit(1);
}

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
 * Exits non-zero unless the root's workspace globs and `UNDERSTOOD_GLOBS` are
 * the SAME set. Called before either guard reports anything, so a new workspace
 * root is a failed build with the fix in it rather than a quietly smaller check.
 *
 * Both directions, because both are silent. A glob the root declares and this
 * module does not implement is a tree no guard walks; a glob this module keeps
 * after the root drops it is the mirror image — npm stops installing that tree
 * as a workspace, its keys leave package-lock.json, and the discovery below
 * returns a shorter list under the same green count. Neither one is an error to
 * anything else in the build.
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
  if (unknown.length > 0) {
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

  const unclaimed = UNDERSTOOD_GLOBS.filter(glob => !globs.includes(glob));
  if (unclaimed.length > 0) {
    console.error(
      `\n${guardName}: UNDERSTOOD_GLOBS in scripts/workspace-globs.mjs names workspace\n`
      + `glob(s) the root package.json no longer declares: ${unclaimed.join(', ')}.\n`
      + '  fix: restore the glob in the root `workspaces` field, or drop it from\n'
      + '       UNDERSTOOD_GLOBS — the two are one decision written twice, and this is the\n'
      + '       direction that shrinks silently. npm stops treating that tree as\n'
      + '       workspaces, so its keys leave package-lock.json, so the discovery returns\n'
      + '       fewer directories and every guard checks fewer workspaces — under the same\n'
      + '       "N workspace(s) OK" line it printed when it checked them all.\n',
    );
    process.exit(1);
  }
}

/**
 * Every directory an understood glob matches that holds a package.json — read
 * from DISK, which is the other half of the answer package-lock.json gives.
 *
 * A root that does not exist yet is an empty list rather than a throw: a glob
 * may legitimately be declared before its tree has anything in it.
 *
 * @returns {string[]} repo-root-relative, sorted
 */
function listWorkspaceDirsOnDisk() {
  const found = [];

  for (const glob of UNDERSTOOD_GLOBS) {
    const root = glob.slice(0, -2); // 'packages/*' -> 'packages'
    let entries;
    try {
      entries = readdirSync(path.join(repoRoot, root), { withFileTypes: true });
    }
    catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const relDir = `${root}/${entry.name}`;
      try {
        statSync(path.join(repoRoot, relDir, 'package.json'));
      }
      catch {
        continue; // A directory with no manifest is not a workspace to npm either.
      }
      found.push(relDir);
    }
  }

  return found.sort();
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
 * Then asserts that the lockfile and the working tree agree about what exists.
 * The lockfile is the right SOURCE — it is what `npm ci` installs, in CI and on
 * a fresh clone — but it is a build artifact, and a stale one answers every
 * question here confidently and wrongly. Create `packages/thing/package.json`,
 * commit without running `npm install`, and the lockfile has no key for it: the
 * discovery does not return it, `check-publish-contract` never asks whether it
 * defines its four tasks, `turbo run` runs zero tasks for it, and the guards
 * print the same "N workspace(s) OK" they printed the day before. The directory
 * on disk is the thing a reader would say is obviously there.
 *
 * @param {string} guardName the calling script, for the assertion's message
 * @returns {string[]} e.g. `['apps/gallery', 'packages/badge', ...]`
 */
export function listWorkspaceDirs(guardName) {
  assertWorkspaceGlobsUnderstood(guardName);

  const roots = UNDERSTOOD_GLOBS.map(glob => glob.slice(0, -1)); // 'packages/*' -> 'packages/'
  const lock = JSON.parse(readFileSync(path.join(repoRoot, 'package-lock.json'), 'utf8'));

  const fromLock = Object.keys(lock.packages ?? {})
    .filter(key => key.split('/').length === 2 && roots.some(root => key.startsWith(root)))
    .sort();

  const onDisk = listWorkspaceDirsOnDisk();
  const missingFromLock = onDisk.filter(relDir => !fromLock.includes(relDir));
  const missingFromDisk = fromLock.filter(relDir => !onDisk.includes(relDir));

  if (missingFromLock.length > 0 || missingFromDisk.length > 0) {
    console.error(
      `\n${guardName}: package-lock.json and the working tree disagree about which\n`
      + 'workspaces exist.\n'
      + (missingFromLock.length > 0
        ? `  on disk with a package.json, absent from the lockfile: ${missingFromLock.join(', ')}\n`
        : '')
      + (missingFromDisk.length > 0
        ? `  in the lockfile, absent from disk: ${missingFromDisk.join(', ')}\n`
        : '')
      + '  fix: run `npm install` and commit package-lock.json.\n'
      + '       Every guard discovers workspaces from the lockfile, because that is what\n'
      + '       `npm ci` installs in CI. A workspace the lockfile has never heard of is\n'
      + '       therefore one that runs zero tasks and is checked by nothing, while the\n'
      + '       counts below stay green — the directory is plainly there, which is exactly\n'
      + '       why nobody looks for it.\n',
    );
    process.exit(1);
  }

  return fromLock;
}
