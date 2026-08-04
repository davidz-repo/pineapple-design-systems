import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// apps/site/src/ -> repo root is three levels up.
export const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
);

// Directory names under packages/ whose manifest is not private — the set the
// registry and the alias fences must both cover exactly.
export function listPublicPackages(): string[] {
  return readdirSync(path.join(repoRoot, 'packages'), { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .filter((entry) => {
      const manifest = JSON.parse(
        readFileSync(path.join(repoRoot, 'packages', entry.name, 'package.json'), 'utf8'),
      ) as { private?: boolean };
      return manifest.private !== true;
    })
    .map(entry => entry.name)
    .sort();
}
