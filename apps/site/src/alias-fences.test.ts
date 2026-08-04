import { readFileSync } from 'node:fs';
import path from 'node:path';

import { expect, it } from 'vitest';

import { listPublicPackages, repoRoot } from './test-helpers';

// The site keeps three lists of @pineappleui packages: vite `resolve.alias`
// (what the bundler serves from src/), tsconfig `paths` (what tsc checks) and
// the manifest's devDependencies (the turbo edges that invalidate the site's
// build hash when a package changes). `scripts/check-alias-fences.mjs` guards
// the gallery's copies of these lists but is hard-coded to apps/gallery, so
// the site guards its own here — same fence markers, same failure modes: a
// missing vite alias bundles a stale dist/, a missing tsconfig path makes tsc
// check different files than vite bundles, a missing devDependency lets a
// warm turbo cache replay a build that never saw the edit.

const FENCE_START = '@pineappleui-aliases:start';
const FENCE_END = '@pineappleui-aliases:end';
const ALIAS_KEY = /["']@pineappleui\/([a-z0-9-]+)/g;

function fencedPackages(relPath: string): string[] {
  const source = readFileSync(path.join(repoRoot, relPath), 'utf8');
  const start = source.indexOf(FENCE_START);
  const end = source.indexOf(FENCE_END);
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`${relPath}: missing or malformed ${FENCE_START}/${FENCE_END} fence`);
  }
  const fenced = source.slice(start + FENCE_START.length, end);
  const names = [...fenced.matchAll(ALIAS_KEY)].map(match => match[1]);
  if (names.length === 0) {
    throw new Error(`${relPath}: alias fence is empty`);
  }
  return [...new Set(names)].sort();
}

it('vite aliases and tsconfig paths agree and cover every public package', () => {
  const publicPackages = listPublicPackages();
  expect(fencedPackages('apps/site/vite.config.ts')).toEqual(publicPackages);
  expect(fencedPackages('apps/site/tsconfig.json')).toEqual(publicPackages);
});

it('every public package is a devDependency (turbo edge)', () => {
  const manifest = JSON.parse(
    readFileSync(path.join(repoRoot, 'apps/site/package.json'), 'utf8'),
  ) as { devDependencies?: Record<string, string> };
  const scoped = Object.keys(manifest.devDependencies ?? {})
    .filter(name => name.startsWith('@pineappleui/'))
    .map(name => name.slice('@pineappleui/'.length));
  // Superset is fine: tooling packages (eslint-config, tsconfig,
  // vitest-preset) are devDependencies too but private, so not in this list.
  for (const pkg of listPublicPackages()) {
    expect(scoped).toContain(pkg);
  }
});
