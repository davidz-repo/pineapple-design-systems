import { expect, it } from 'vitest';

import { CATEGORIES, REGISTRY } from './registry';
import { listPublicPackages } from './test-helpers';

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
