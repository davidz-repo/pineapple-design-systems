#!/usr/bin/env node
// Props-coverage guard: every package the reference site documents must have a
// generated props table, every package that ships a component must have at
// least one component IN it, and every prop the packages declare themselves
// must carry a description.
//
// The artifact this checks — `apps/site/generated/props/<slug>.json` — is
// written by the site's `props` turbo task and is GITIGNORED, which is what
// makes a guard necessary rather than nice. Every way it can be absent or
// half-written is silent:
//
//   - the directory is empty (a fresh clone, a `vite build` run by hand, the
//     turbo edge from `build`/`test` to `props` deleted). The site's glob over
//     it matches nothing, every package page renders "this build has no
//     generated props table", and the build, the tests and the deploy are all
//     green. Nothing in a bundler's job is to notice that a glob matched zero
//     files, and there is no test that could tell an intentionally empty
//     package from an un-run generator.
//   - the generator's component predicate stops matching a package's exports —
//     a React types upgrade, a package that starts exporting its component some
//     other way. That package's file is still written, still valid JSON, and
//     holds `"components": []`: the page then says the package exports no
//     components, in the same words it uses for `tokens`, which genuinely does
//     not.
//
// WHAT IS REQUIRED, AND HOW IT IS DERIVED
//
// Nothing here is enumerated. Two derived sets, both read off the repo:
//
//   1. FILE REQUIRED — every non-private workspace under `packages/*`. That is
//      the set the site gives a page to (`src/registry.test.ts` asserts the
//      registry against exactly it, in both directions), so it is the set whose
//      Props section has to be answering from a real file rather than from an
//      absent one.
//   2. COMPONENT REQUIRED — of those, the ones that hold a `.tsx` under `src/`
//      that is neither a test nor a story. The same signal
//      `scripts/check-ref-tests.mjs` calls "looks like a component package",
//      and it is derived rather than shared with the generator on purpose: a
//      guard that asked the generator which packages have components would
//      agree with it by construction, and the failure being guarded is the
//      generator finding nothing.
//
// WHY A BLANK DESCRIPTION IS A FAILURE
//
// The wrapper packages inherit their prop surface from Radix and re-state each
// prop purely to hang a sentence on it — which means a prop RADIX ADDS arrives
// through the intersection undescribed, correctly and by design. The cell is
// then blank, the Description column stays (its siblings are filled), and
// nothing anywhere reports it: the artifact is valid, the page renders, and the
// table has one row that says nothing under a heading claiming it does. The
// convention that a new prop gets a sentence is written in seven source
// comments, and a convention cannot catch an absence.
//
// So it is asserted, over the props a package DECLARES — `isLayout` ones are
// Radix's shared set and carry Radix's own JSDoc, which is a different question
// (see the provenance sentence on the page). The one package that legitimately
// describes none is allow-listed BY NAME with its reason in the message, so the
// exemption is a decision a reader can see and argue with rather than a gap the
// numbers imply. The allow-list is asserted in both directions: an entry whose
// package now describes everything is removed, or the next real regression hides
// behind it.
//
// WHY "ZERO PROPS" IS COVERED AND "ZERO COMPONENTS" IS NOT
//
// A component whose whole prop surface is React plumbing is a real answer —
// `@pineappleui/theme`'s `DesignSystemProvider` takes `children` and nothing
// else, and the page says "declares no props of its own", which is true. A
// component package whose file names NO component is not an answer at all: it
// is indistinguishable, in the artifact and on the page, from the extraction
// having quietly stopped working. So the requirement is one component named,
// not one prop found. The line the page prints for an empty component is
// checked by the site's own suite, where a rendering claim belongs.
//
// Reads the generated directory, so it runs AFTER `turbo run build lint test
// typecheck` in both `verify` and CI — that run is what produces it, through
// the site's `build` and `test` tasks depending on its `props` task.
//
//   node scripts/check-props-coverage.mjs

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { listWorkspaceDirs } from './workspace-globs.mjs';

const GUARD_NAME = 'check-props-coverage';

// Where the artifact lives, and the task that writes it — named together
// because every message below has to hand back the command that fixes it.
const GENERATED_DIR = 'apps/site/generated/props';
const GENERATOR = 'apps/site/scripts/generate-props.mjs';
const TASK = 'npx turbo run props --filter=@pineappleui/site';

// Only `packages/*`: `apps/*` are the gallery and the site itself, which
// publish no component and have no page on the site to document one.
const PACKAGES_PREFIX = 'packages/';

const SOURCE_DIR = 'src';
const COMPONENT_EXTENSION = '.tsx';

// Neither a test nor a story defines a package's component — the same exclusion
// check-ref-tests makes, for the same reason.
const NOT_A_SOURCE = /\.(?:test|stories)\.[cm]?[jt]sx?$/;

// The packages whose own props are allowed to carry no description, and why —
// by slug, so the exemption is one line a reader can see, and with the reason
// carried into the failure message, so removing a package from this list tells
// the next reader what they are taking on.
//
// Exactly one entry today, and it is a STRUCTURAL exemption rather than an
// unfinished one: `text-field` re-exports Radix's compound namespace whole,
// which is what keeps `TextField.RootProps` and `TextField.SlotProps` resolving
// for consumers, and a re-export has no props type of its own to write JSDoc
// into. An alternative exists (an `export namespace` whose members are annotated
// to a local intersection) and costs the package its pure re-export emit; that
// is a product call, and this list is where it is recorded either way.
const UNDESCRIBED_BY_DESIGN = new Map([
  [
    'text-field',
    're-exports Radix\'s compound `TextField` namespace whole — which is what keeps '
    + '`TextField.RootProps` and `TextField.SlotProps` resolving for consumers — so it has no '
    + 'props type of its own to hang JSDoc on',
  ],
]);

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @type {string[]} */
const failures = [];

// Counted while walking, so the pass line states the description coverage
// instead of implying it: "85 of 98" is a number a reader can watch move.
let ownPropCount = 0;
let describedCount = 0;

/**
 * @param {string} subject the package or file the problem is about
 * @param {string} problem
 * @param {string} fix
 */
function fail(subject, problem, fix) {
  failures.push(`${subject}: ${problem}\n    fix: ${fix}`);
}

/**
 * A condition under which this guard cannot report on the repo at all: it exits
 * immediately rather than printing a pass over what it could not classify.
 *
 * @param {string} message problem and fix, already formatted
 * @returns {never} the process is gone before a caller resumes
 */
function refuse(message) {
  console.error(`\n${GUARD_NAME}: ${message}\n`);
  process.exit(1);
}

/**
 * Every file under a directory, recursively, repo-root-relative.
 *
 * @param {string} relDir
 * @returns {string[]} sorted; empty when the directory does not exist
 */
function listFilesUnder(relDir) {
  /** @type {string[]} */
  const found = [];

  /** @param {string} current */
  function walk(current) {
    let entries;
    try {
      entries = readdirSync(path.join(repoRoot, current), { withFileTypes: true });
    }
    catch {
      return;
    }
    for (const entry of entries) {
      const relPath = `${current}/${entry.name}`;
      if (entry.isDirectory()) {
        walk(relPath);
      }
      else if (entry.isFile()) {
        found.push(relPath);
      }
    }
  }

  walk(relDir);
  return found.sort();
}

const packageDirs = listWorkspaceDirs(GUARD_NAME).filter(
  relDir => relDir.startsWith(PACKAGES_PREFIX),
);

/**
 * Every package the site documents, with whether it looks like a component
 * package.
 *
 * @type {{ slug: string, name: string, hasComponentSource: boolean }[]}
 */
const packages = [];

for (const relDir of packageDirs) {
  const manifest = JSON.parse(readFileSync(path.join(repoRoot, relDir, 'package.json'), 'utf8'));
  if (manifest.private === true) {
    continue;
  }
  packages.push({
    slug: relDir.slice(PACKAGES_PREFIX.length),
    name: manifest.name ?? relDir,
    hasComponentSource: listFilesUnder(`${relDir}/${SOURCE_DIR}`).some(
      relPath => path.extname(relPath) === COMPONENT_EXTENSION && !NOT_A_SOURCE.test(relPath),
    ),
  });
}

if (packages.length === 0) {
  refuse(
    `found no public package under ${PACKAGES_PREFIX} across `
    + `${packageDirs.length} workspace(s), so it would require a props table of nobody\n`
    + 'and report success.\n'
    + `  fix: if the packages moved, teach PACKAGES_PREFIX in scripts/${GUARD_NAME}.mjs where\n`
    + '       they are now. An empty required set agrees with an empty generated directory,\n'
    + '       which is the exact state this guard exists to fail on.',
  );
}

const componentPackages = packages.filter(entry => entry.hasComponentSource);

if (componentPackages.length === 0) {
  refuse(
    `none of the ${packages.length} public package(s) holds a component source — a `
    + `${COMPONENT_EXTENSION} under\n`
    + `  ${SOURCE_DIR}/ that is neither a test nor a story — so nothing would be required to\n`
    + '  document a component.\n'
    + `  fix: teach the component-source test in scripts/${GUARD_NAME}.mjs the shape the\n`
    + '       packages are written in now. Matching none of them is inert, not clean: every\n'
    + '       package would pass on an artifact naming zero components.',
  );
}

let generatedFiles;
try {
  generatedFiles = readdirSync(path.join(repoRoot, GENERATED_DIR));
}
catch (error) {
  if (error.code !== 'ENOENT') {
    throw error;
  }
  // Refused as one message rather than reported per package: "16 packages have
  // no props table" is a list; "the generator has not run" is the fact.
  generatedFiles = refuse(
    `${GENERATED_DIR}/ does not exist, so no package has a props table and every package\n`
    + 'page would say so.\n'
    + `  fix: run \`${TASK}\`, or \`npm run verify\`, which reaches it through the site's\n`
    + `       \`build\` and \`test\` tasks. The directory is gitignored and generated by\n`
    + `       ${GENERATOR}; if that wiring was removed, this guard is what is\n`
    + '       left saying so — nothing else in the build fails when the glob that reads it\n'
    + '       matches nothing.',
  );
}

if (generatedFiles.length === 0) {
  refuse(
    `${GENERATED_DIR}/ is empty, which reads to the site exactly like a repo with no\n`
    + 'packages in it: the glob matches nothing and every page reports no props table.\n'
    + `  fix: run \`${TASK}\`. If it ran and wrote nothing, the failure is in\n`
    + `       ${GENERATOR} — which refuses on an empty extraction rather than\n`
    + '       writing one, so an empty directory means it never ran at all.',
  );
}

for (const entry of packages) {
  const relPath = `${GENERATED_DIR}/${entry.slug}.json`;

  let doc;
  try {
    doc = JSON.parse(readFileSync(path.join(repoRoot, relPath), 'utf8'));
  }
  catch (error) {
    fail(
      entry.name,
      error.code === 'ENOENT'
        ? `has no props table — ${relPath} does not exist`
        : `has an unreadable props table (${relPath}): ${error.message}`,
      `run \`${TASK}\`. The generator writes one file per non-private package under `
      + `${PACKAGES_PREFIX}, so a package missing from that directory while its siblings are `
      + 'there is a package the extraction walked past — not a stale run.',
    );
    continue;
  }

  if (!Array.isArray(doc.components)) {
    fail(
      entry.name,
      `${relPath} carries no \`components\` array, so the page has nothing to read`,
      `run \`${TASK}\` to rewrite it. If the artifact's shape changed on purpose, this guard `
      + `and \`PackagePropsDoc\` in apps/site/src/content.ts both name the old one.`,
    );
    continue;
  }

  // The requirement is a component NAMED, not a prop found — see the header on
  // why zero props is a real answer and zero components is not.
  if (entry.hasComponentSource && doc.components.length === 0) {
    fail(
      entry.name,
      `ships a component source under ${entry.slug}/${SOURCE_DIR}/ and its props table names `
      + 'no component',
      'check what this package exports, and the component predicate in '
      + 'apps/site/scripts/extract-props.mjs — a capitalised export, callable with at most one '
      + 'argument, returning something assignable to React\'s `ReactNode`. This direction is '
      + 'silent: the file is valid, the page renders, and it tells the reader the package '
      + 'exports no components, in the same words it uses for the packages that genuinely do '
      + 'not.',
    );
  }

  // Own props only: the layout ones are Radix's shared set carrying Radix's own
  // JSDoc, and whether the site should republish that prose at all is a
  // different question, argued where the extractor answers it.
  const ownProps = doc.components.flatMap(
    component => (component.props ?? [])
      .filter(prop => prop.isLayout !== true)
      .map(prop => ({ component: component.name, ...prop })),
  );
  const undescribed = ownProps.filter(prop => prop.description === '');
  const exemption = UNDESCRIBED_BY_DESIGN.get(entry.slug);

  ownPropCount += ownProps.length;
  describedCount += ownProps.length - undescribed.length;

  if (exemption === undefined && undescribed.length > 0) {
    fail(
      entry.name,
      `declares ${undescribed.length} prop(s) with no description: ${
        undescribed.map(prop => `${prop.component}.${prop.name}`).join(', ')}`,
      'write the JSDoc beside the prop in the package\'s own source. A prop Radix ADDS arrives '
      + 'through the intersection undescribed — which is the pattern working as intended — and '
      + 'then sits as a blank cell under a Description column its siblings keep filled, with '
      + 'nothing failing anywhere. If a package legitimately cannot describe its props, add its '
      + `slug to UNDESCRIBED_BY_DESIGN in scripts/${GUARD_NAME}.mjs WITH the reason: an `
      + 'exemption a reader can see and argue with, rather than a gap the numbers imply.',
    );
  }

  if (exemption !== undefined && ownProps.length > 0 && undescribed.length === 0) {
    fail(
      entry.name,
      `is allow-listed as describing none of its props, and now describes all ${ownProps.length}`,
      `remove its entry from UNDESCRIBED_BY_DESIGN in scripts/${GUARD_NAME}.mjs. The reason `
      + `recorded there — it ${exemption} — no longer holds, and a stale exemption is where the `
      + 'next real regression hides: every prop this package loses a description to would pass '
      + 'under it, silently.',
    );
  }
}

// A file for a package that is not there any more. The generator removes its
// own strays, so one surviving means something wrote this directory other than
// the generator — and a page reading it would be documenting a package the repo
// no longer has.
const expected = new Set(packages.map(entry => `${entry.slug}.json`));
const strays = generatedFiles.filter(name => name.endsWith('.json') && !expected.has(name)).sort();

if (strays.length > 0) {
  fail(
    `${GENERATED_DIR}/`,
    `holds ${strays.length} file(s) for no package here: ${strays.join(', ')}`,
    `run \`${TASK}\` — it deletes the .json files it did not write. A stray means the `
    + 'directory was written by something else, or by a generator that no longer removes them.',
  );
}

if (failures.length > 0) {
  console.error(
    `\n${GUARD_NAME}: ${failures.length} package(s) without usable props coverage\n\n`
    + `${failures.map(entry => `  ✗ ${entry}`).join('\n\n')}\n`,
  );
  process.exit(1);
}

const documented = packages.reduce((total, entry) => {
  const doc = JSON.parse(
    readFileSync(path.join(repoRoot, `${GENERATED_DIR}/${entry.slug}.json`), 'utf8'),
  );
  return total + doc.components.length;
}, 0);

console.log(
  `${GUARD_NAME}: ${packages.length} package(s) with a generated props table\n`
  + `  ${componentPackages.length} ship a component source and name ${documented} component(s) `
  + `between them\n`
  + `  ${describedCount} of ${ownPropCount} own prop(s) described; describing none by design: ${
    [...UNDESCRIBED_BY_DESIGN.keys()].join(', ') || 'none'
  }\n`
  + `  no component source, nothing required of them: ${
    packages.filter(entry => !entry.hasComponentSource).map(entry => entry.name).join(', ') || 'none'
  }`,
);
