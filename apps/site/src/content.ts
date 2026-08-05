// Every docs page is derived from files the packages already own: README.md
// for the overview, CHANGELOG.md for versions, package.json for the version
// badge. The site authors none of that content — it renders what shipped.
//
// Globs are relative to THIS file (src/ -> repo root is three levels up).

interface PackageManifest {
  name: string;
  version: string;
  description?: string;
  /** What npm renders as "Repository" — see packageLinks.ts. */
  repository?: { url?: string; directory?: string };
}

/**
 * One prop of one component, as `scripts/generate-props.mjs` writes it. The
 * generator's JSDoc typedefs are the same shape from the other side; this is
 * what the page reads, and `PropsSection.test.tsx` asserts the real artifact
 * against it so the two cannot drift silently.
 */
export interface PropDoc {
  name: string;
  /** Rendered by the TypeScript checker, `| undefined` trimmed. */
  type: string;
  required: boolean;
  /** A JS literal. Absent means the component declares no default. */
  default?: string;
  /**
   * JSDoc as plain text: whitespace collapsed, and the markdown emphasis and
   * code markers an author wrote (`**display**`) stripped down to their words.
   * The page prints this into a table cell, so it is a string rather than
   * markup. `''` when the source carries none.
   */
  description: string;
  /** Declared by Radix's shared layout props — every component takes these. */
  isLayout: boolean;
}

export interface ComponentDoc {
  /** `Button`, or `TextField.Root` for a member of a compound component. */
  name: string;
  description: string;
  props: PropDoc[];
}

export interface PackagePropsDoc {
  slug: string;
  components: ComponentDoc[];
}

// Lazy: each package page pulls only its own markdown chunk.
export const readmeLoaders = import.meta.glob<string>(
  '../../../packages/*/README.md',
  { query: '?raw', import: 'default' },
);

export const changelogLoaders = import.meta.glob<string>(
  '../../../packages/*/CHANGELOG.md',
  { query: '?raw', import: 'default' },
);

// Eager: versions appear on the home grid and every package header, and a
// manifest is a few hundred bytes.
export const manifests = import.meta.glob<PackageManifest>(
  '../../../packages/*/package.json',
  { eager: true, import: 'default' },
);

// The props tables, generated from each package's own TypeScript types by the
// site's `props` task (scripts/generate-props.mjs) and written to
// `generated/props/<slug>.json`. The directory is GITIGNORED — a committed copy
// is a second source of truth that goes stale between the commit that changes a
// prop and the commit that regenerates it — so on a tree where that task has
// not run this glob is EMPTY and every page would quietly report that its
// package documents no props. `scripts/check-props-coverage.mjs` is what fails
// on that; PropsSection says which of the two happened.
export const propsLoaders = import.meta.glob<PackagePropsDoc>(
  '../generated/props/*.json',
  { import: 'default' },
);

export function forSlug<T>(record: Record<string, T>, slug: string): T | undefined {
  return Object.entries(record).find(([p]) => p.includes(`/packages/${slug}/`))?.[1];
}

/**
 * The generated props file for a slug. Its own finder because it is the one
 * per-package record NOT keyed by a `packages/<slug>/…` path: the artifact is
 * written by the site, named for the package it describes.
 */
function propsForSlug<T>(record: Record<string, T>, slug: string): T | undefined {
  return Object.entries(record).find(([p]) => p.endsWith(`/${slug}.json`))?.[1];
}

// Stable per-slug promises so components can `use()` them under Suspense —
// `use` needs the same promise instance across render retries, so the
// returned function MUST stay synchronous: an async wrapper would mint a
// fresh (uncached) promise per call and the component would suspend forever.
//
// Exported because stories.ts loads the packages' stories the same way, and a
// second hand-written cache is a second place for that `async` to creep back
// in. Every lazily loaded per-package thing on this site comes through here.
//
// `findLoader` is how a record keyed some other way joins in — the generated
// props files are named for their slug rather than sitting under
// `packages/<slug>/` — so there is still one cache, one `use()` contract, and
// one place that `async` could be reintroduced.
export function cachedLoader<T>(
  loaders: Record<string, () => Promise<T>>,
  findLoader: (
    record: Record<string, () => Promise<T>>,
    slug: string,
  ) => (() => Promise<T>) | undefined = forSlug,
): (slug: string) => Promise<T | null> {
  const cache = new Map<string, Promise<T | null>>();
  // eslint-disable-next-line ts/promise-function-async -- hands back the cached promise itself; async would break `use()` identity
  return (slug) => {
    let promise = cache.get(slug);
    if (promise === undefined) {
      const loader = findLoader(loaders, slug);
      promise = loader === undefined ? Promise.resolve(null) : loader();
      cache.set(slug, promise);
    }
    return promise;
  };
}

export const readmeFor = cachedLoader(readmeLoaders);
export const changelogFor = cachedLoader(changelogLoaders);
export const propsFor = cachedLoader(propsLoaders, propsForSlug);
