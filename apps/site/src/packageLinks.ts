import { forSlug, manifests } from './content';
import { bySlug } from './registry';

import type { RadixReference } from './registry';

// Every off-site address a package page shows, derived from what the package
// already declares. `repository.url` + `repository.directory` in each manifest
// is the same pair npm renders as a package's "Repository" link, so the site
// reads it rather than keeping a second copy per package that nothing would
// fail on when it drifted.
//
// The one thing no manifest knows is which Radix component a wrapper wraps —
// `@radix-ui/themes` in peerDependencies says THAT it wraps one, never which
// (Stack and Inline are both Flex). That single fact lives in the registry, as
// a doc path, and the URL is still built here; registry.test.ts fails if a
// package peers on Radix Themes without it.

const NPM_PACKAGE_BASE = 'https://www.npmjs.com/package/';
const RADIX_DOCS_BASE = 'https://www.radix-ui.com/themes/docs/';

/**
 * Where this site is published — the custom domain GitHub Pages serves it from
 * (.github/workflows/deploy-site.yml). A README that links a page of this site
 * has to write the absolute URL, because it is also read on npm and on GitHub
 * where nothing else would resolve; read HERE, that URL is this page.
 */
const SITE_ORIGIN = 'https://designpineapple.com';

// `repository.directory` is a path in the default branch; GitHub needs the ref
// spelled out in a tree URL.
const REPO_BRANCH = 'main';

/**
 * `href` as a URL, or `undefined` when it is not an absolute one. Markdown
 * carries whatever an author wrote, including relative paths and `mailto:`;
 * "not a URL this can compare" is an answer here, not a swallowed failure.
 */
function absoluteUrl(href: string): URL | undefined {
  try {
    return new URL(href);
  }
  catch {
    return undefined;
  }
}

/** The repository's web URL: `git+`/`.git` are packaging, not addresses. */
function repositoryUrlOf(slug: string): URL | undefined {
  const repository = forSlug(manifests, slug)?.repository;
  if (repository?.url === undefined) {
    return undefined;
  }
  const url = absoluteUrl(repository.url.replace(/^git\+/, ''));
  if (url === undefined) {
    return undefined;
  }
  url.pathname = url.pathname.replace(/\.git$/, '');
  return url;
}

/** Where this package's source lives — the manifest's own repository entry. */
export function sourceUrlFor(slug: string): string | undefined {
  const directory = forSlug(manifests, slug)?.repository?.directory;
  const repository = repositoryUrlOf(slug);
  if (directory === undefined || repository === undefined) {
    return undefined;
  }
  return `${repository.href}/tree/${REPO_BRANCH}/${directory}`;
}

/** The package's npm page, from the name it publishes under. */
export function npmUrlFor(slug: string): string | undefined {
  const name = forSlug(manifests, slug)?.name;
  return name === undefined ? undefined : new URL(name, NPM_PACKAGE_BASE).href;
}

/** The Radix Themes doc a wrapper wraps. */
export function radixDocsUrl(reference: RadixReference): string {
  return new URL(reference.path, RADIX_DOCS_BASE).href;
}

// Every package's source URL, pointed back at its page here. The keys are
// produced by `sourceUrlFor`, so the URL a README links a sibling by and the
// URL this site would generate for that sibling are the same string by
// construction — there is no second pattern to keep in step.
const routeBySourceUrl = new Map<string, string>(
  [...bySlug.keys()].flatMap((slug) => {
    const url = sourceUrlFor(slug);
    return url === undefined ? [] : [[url, `/components/${slug}`] as const];
  }),
);

/**
 * The internal route for a link that already points somewhere on this site, or
 * `undefined` for every other href. READMEs are written to be read on npm and
 * GitHub, where a cross-link has to be a full URL; read here, two kinds of full
 * URL are addresses this router already owns.
 *
 *   - a sibling package's SOURCE on GitHub, which is a round trip out to GitHub
 *     and back for a page already here;
 *   - this site's own origin, which a README reaches for when it wants to point
 *     at the docs page for the thing it is describing. Untranslated that is a
 *     new browser tab onto the page the reader is standing on.
 *
 * The second is by origin rather than by a table of known routes: every address
 * on this host is this app's to answer, including the ones it answers with a
 * "page not found" — which is still the right answer to give in place, rather
 * than in a second tab.
 */
export function internalRouteFor(href: string): string | undefined {
  const url = absoluteUrl(href);
  if (url?.origin === SITE_ORIGIN) {
    return `${url.pathname}${url.search}${url.hash}`;
  }
  return routeBySourceUrl.get(href.replace(/\/$/, ''));
}
