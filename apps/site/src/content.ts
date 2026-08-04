// Every docs page is derived from files the packages already own: README.md
// for the overview, CHANGELOG.md for versions, package.json for the version
// badge. The site authors none of that content — it renders what shipped.
//
// Globs are relative to THIS file (src/ -> repo root is three levels up).

interface PackageManifest {
  name: string;
  version: string;
  description?: string;
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

export function forSlug<T>(record: Record<string, T>, slug: string): T | undefined {
  return Object.entries(record).find(([p]) => p.includes(`/packages/${slug}/`))?.[1];
}

// Stable per-slug promises so components can `use()` them under Suspense —
// `use` needs the same promise instance across render retries, so the
// returned function MUST stay synchronous: an async wrapper would mint a
// fresh (uncached) promise per call and the component would suspend forever.
function cachedLoader<T>(
  loaders: Record<string, () => Promise<T>>,
): (slug: string) => Promise<T | null> {
  const cache = new Map<string, Promise<T | null>>();
  // eslint-disable-next-line ts/promise-function-async -- hands back the cached promise itself; async would break `use()` identity
  return (slug) => {
    let promise = cache.get(slug);
    if (promise === undefined) {
      const loader = forSlug(loaders, slug);
      promise = loader === undefined ? Promise.resolve(null) : loader();
      cache.set(slug, promise);
    }
    return promise;
  };
}

export const readmeFor = cachedLoader(readmeLoaders);
export const changelogFor = cachedLoader(changelogLoaders);
