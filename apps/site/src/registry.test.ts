import { expect, it } from 'vitest';

import { CATEGORIES, REGISTRY } from './registry';
import { listPublicPackages, readPackageManifest } from './test-helpers';

const RADIX_THEMES = '@radix-ui/themes';

// Guard-shaped: a new public package fails this until it gets a registry
// entry (and with it a sidebar link, home card and docs page), and a package
// that leaves the repo fails it until its stale entry is removed. One
// assertion over sorted lists shows both diffs at once.
it('every public package has a registry entry, and every entry a package', () => {
  const onDisk = listPublicPackages();
  const inRegistry = REGISTRY.map(entry => entry.slug).sort();
  expect(inRegistry).toEqual(onDisk);
});

it('slugs are unique', () => {
  const slugs = REGISTRY.map(entry => entry.slug);
  expect(new Set(slugs).size).toBe(slugs.length);
});

it('every entry belongs to a listed category', () => {
  for (const entry of REGISTRY) {
    expect(CATEGORIES).toContain(entry.category);
  }
});

// Guard-shaped, like the first test and for the same reason: which Radix
// component a wrapper wraps is the one link on a package page that cannot be
// derived (Stack and Inline are both Flex), so it is the one that would go
// missing on a new wrapper with nothing to show for it. Peering on Radix Themes
// is what makes a package a wrapper, so the manifests are the other list.
// Asserted in both directions: an entry claiming a Radix reference for a
// package that does not wrap one is the same drift the other way round.
it('every package that wraps Radix Themes carries its Radix reference', () => {
  const wrapsRadix = listPublicPackages()
    .filter(slug => RADIX_THEMES in (readPackageManifest(slug).peerDependencies ?? {}));
  const referenced = REGISTRY
    .filter(entry => entry.radix !== undefined)
    .map(entry => entry.slug)
    .sort();
  expect(referenced).toEqual(wrapsRadix);
});

// A path, never a URL: packageLinks.ts owns the host, and an absolute URL here
// would silently win over the base it is resolved against.
it('every Radix reference is a relative docs path', () => {
  for (const { radix } of REGISTRY) {
    if (radix !== undefined) {
      expect(radix.path).not.toMatch(/^\w+:|^\/\//);
    }
  }
});
