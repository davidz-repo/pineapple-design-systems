// Pineapple shared ESLint factory.
//
// Wraps `@antfu/eslint-config` with the defaults we use across every
// `@pineappleui/*` workspace package: React + TypeScript on, stylistic semis.
//
// Also layers in two project-wide rule blocks:
//   1. `perfectionist/sort-imports` with a custom group layout
//      (external → @pineappleui/* → parent → sibling, types separate at bottom)
//   2. `no-restricted-syntax` bans for `export *` and `import * as X`
//      (use named re-exports / named imports; escape hatch via inline
//      `// eslint-disable-next-line no-restricted-syntax`)
//
// The rule data is exported as `SORT_IMPORTS_CONFIG` and
// `NO_RESTRICTED_SYNTAX_BANS` so surfaces that don't go through the
// `pineapple()` factory can reuse the same source of truth.
//
// Note on missing import-discipline rules: an earlier iteration aspired to
// layer `import/no-cycle` and `import/no-extraneous-dependencies` on top.
// Antfu v8 ships `eslint-plugin-import-lite` which does NOT include those
// two rules — they live in the full `eslint-plugin-import` (or the
// maintained `eslint-plugin-import-x`). Adding either plugin just for these
// rules is more weight than the rules earn at this stage.
//
// Note on dependencies: `@eslint-react/eslint-plugin` and
// `eslint-plugin-react-refresh` are real `dependencies` here, not peers.
// Antfu v8's react preset calls `ensurePackages()` and then dynamically
// imports both. `ensurePackages` does not install anything in a
// non-interactive environment (CI), so the dynamic import throws unless the
// packages are already on disk. Declaring them as deps is what puts them
// there. Only `eslint` itself stays a peer.
//
// Usage:
//   // eslint.config.mjs
//   import pineapple from '@pineappleui/eslint-config';
//   export default pineapple();
//
// Pass overrides to merge into the antfu factory options:
//   export default pineapple({ typescript: { tsconfigPath: './tsconfig.lib.json' } });

import antfu from '@antfu/eslint-config';

const DEFAULTS = {
  react: true,
  typescript: {
    tsconfigPath: 'tsconfig.json',
  },
  stylistic: {
    semi: true,
  },
};

/**
 * Layout for `perfectionist/sort-imports`:
 *
 *   import { useEffect } from 'react';               // 1. react framework (alone)
 *
 *   import { x } from '@ladle/react';                // 2. everything else from npm
 *   import { Button } from '@pineappleui/button';    //    (third-party + @pineappleui/*)
 *
 *   import { foo } from '../parent';                 // 3. parent
 *   import { bar } from './sibling';                 // 4. sibling / CSS modules
 *   import styles from './x.module.css';
 *
 *   import type { Foo } from 'react';                // 5. type-* grouped at bottom
 *   import type { Bar } from './sibling';
 */
export const SORT_IMPORTS_CONFIG = {
  customGroups: [
    {
      groupName: 'react',
      elementNamePattern: '^(react|react-dom)(/.+)?$',
    },
  ],
  groups: [
    'react',
    { newlinesBetween: 1 },
    ['value-builtin', 'value-external', 'value-internal'],
    { newlinesBetween: 1 },
    'value-parent',
    { newlinesBetween: 0 },
    ['value-sibling', 'value-style', 'value-index'],
    { newlinesBetween: 1 },
    [
      'type-builtin',
      'type-external',
      'type-internal',
      'type-parent',
      'type-sibling',
      'type-index',
      'type-style',
    ],
    'side-effect',
    'ts-equals-import',
    'unknown',
  ],
  internalPattern: ['^@pineappleui/.+'],
  newlinesBetween: 'ignore',
  newlinesInside: 'ignore',
  order: 'asc',
  type: 'natural',
  fallbackSort: { type: 'type-import-first', order: 'asc' },
};

/**
 * Project-wide `no-restricted-syntax` entries: ban `export *` re-exports and
 * `import * as X` namespace imports. Both have explicit-named alternatives
 * (named re-exports / named imports) that are friendlier to tree-shaking and
 * tooling.
 *
 * Per-file escape hatch (use sparingly — e.g. vitest `vi.spyOn(module, ...)`):
 *   // eslint-disable-next-line no-restricted-syntax
 *   import * as token from '../auth/token';
 */
export const NO_RESTRICTED_SYNTAX_BANS = [
  {
    selector: 'ExportAllDeclaration',
    message:
      'Use named re-exports (`export { Foo } from \'./foo\'`) instead of `export *`. Barrel re-exports hurt tree-shaking and obscure the public surface.',
  },
  {
    selector: 'ImportNamespaceSpecifier',
    message:
      'Use named imports (`import { foo } from \'lib\'`) instead of `import * as X from \'lib\'`. If the library is namespace-style (e.g. Sentry) or this is a test mock, add an inline `// eslint-disable-next-line no-restricted-syntax`.',
  },
];

/**
 * Build a Pineapple-flavoured antfu config.
 *
 * @param {Parameters<typeof antfu>[0]} [options]
 *   Overrides merged into the antfu factory options. Shallow-merged: pass
 *   `{ typescript: false }` to opt out of TS entirely, or a partial object
 *   to extend.
 * @returns {ReturnType<typeof antfu>}
 */
export default function pineappleConfig(options) {
  const merged = { ...DEFAULTS, ...(options ?? {}) };
  return antfu(merged, {
    files: ['**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}'],
    rules: {
      'perfectionist/sort-imports': ['error', SORT_IMPORTS_CONFIG],
      'no-restricted-syntax': ['error', ...NO_RESTRICTED_SYNTAX_BANS],
    },
  });
}
