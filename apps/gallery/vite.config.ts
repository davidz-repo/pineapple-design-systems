import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// `__dirname` does not exist in an ESM module, and this workspace is
// `"type": "module"` — so the upstream config's `path.resolve(__dirname, ...)`
// becomes the same call against a dirname derived from `import.meta.url`.
const galleryDir = path.dirname(fileURLToPath(import.meta.url));

// Ladle is what loads this file, and Ladle's own vite is what consumes it:
// `@ladle/react@5` depends on `vite@^6`, which npm keeps at
// `node_modules/@ladle/react/node_modules/vite` because the root's `vite@^8`
// owns the shared top slot (that hoist is asserted by
// `scripts/check-toolchain-hoist.mjs`). So every option below must be valid for
// **vite 6**, not for the vite 8 this file imports from — `defineConfig` is an
// identity function, so the root's copy contributes types and nothing else.
//
// No `plugins: [react()]` here because none is needed: Ladle appends its own
// React plugin whenever the user config does not supply one —
// `!hasReactPlugin && !hasReactSwcPlugin && react()` in
// `@ladle/react/lib/cli/vite-base.js`. Those two flags come from scanning this
// config's `plugins` for the names `vite:react-babel` and `vite:react-swc`, so
// adding a React plugin here would not double-transform anything either: Ladle
// would detect it and skip its own. It would simply be a line with nothing to do.
export default defineConfig({
  resolve: {
    // Every @pineappleui/* package resolves to its SOURCE, not to `dist/`. The
    // gallery is where you look at a change before it is built, so pointing at
    // `exports` (which is `dist/`) would show the last build instead of the
    // working tree, and would need a rebuild between every edit.
    //
    // The bare key matches subpaths too (vite appends a trailing slash before
    // testing), so the more-specific subpath key must come FIRST or
    // `@pineappleui/text/x` rewrites to `.../src/index.ts/x`.
    //
    // Tooling packages (eslint-config, tsconfig, vitest-preset) are absent by
    // design: nothing a story renders imports them. Keep this block in sync
    // with `paths` in tsconfig.json.
    alias: {
      // @pineappleui-aliases:start
      '@pineappleui/badge/': `${path.resolve(galleryDir, '../../packages/badge/src')}/`,
      '@pineappleui/badge': path.resolve(galleryDir, '../../packages/badge/src/index.ts'),
      '@pineappleui/box/': `${path.resolve(galleryDir, '../../packages/box/src')}/`,
      '@pineappleui/box': path.resolve(galleryDir, '../../packages/box/src/index.ts'),
      '@pineappleui/button/': `${path.resolve(galleryDir, '../../packages/button/src')}/`,
      '@pineappleui/button': path.resolve(galleryDir, '../../packages/button/src/index.ts'),
      '@pineappleui/card/': `${path.resolve(galleryDir, '../../packages/card/src')}/`,
      '@pineappleui/card': path.resolve(galleryDir, '../../packages/card/src/index.ts'),
      '@pineappleui/heading/': `${path.resolve(galleryDir, '../../packages/heading/src')}/`,
      '@pineappleui/heading': path.resolve(galleryDir, '../../packages/heading/src/index.ts'),
      '@pineappleui/icon-button/': `${path.resolve(galleryDir, '../../packages/icon-button/src')}/`,
      '@pineappleui/icon-button': path.resolve(galleryDir, '../../packages/icon-button/src/index.ts'),
      '@pineappleui/icons/': `${path.resolve(galleryDir, '../../packages/icons/src')}/`,
      '@pineappleui/icons': path.resolve(galleryDir, '../../packages/icons/src/index.ts'),
      '@pineappleui/inline/': `${path.resolve(galleryDir, '../../packages/inline/src')}/`,
      '@pineappleui/inline': path.resolve(galleryDir, '../../packages/inline/src/index.ts'),
      '@pineappleui/live-region/': `${path.resolve(galleryDir, '../../packages/live-region/src')}/`,
      '@pineappleui/live-region': path.resolve(galleryDir, '../../packages/live-region/src/index.ts'),
      '@pineappleui/stack/': `${path.resolve(galleryDir, '../../packages/stack/src')}/`,
      '@pineappleui/stack': path.resolve(galleryDir, '../../packages/stack/src/index.ts'),
      '@pineappleui/text/': `${path.resolve(galleryDir, '../../packages/text/src')}/`,
      '@pineappleui/text': path.resolve(galleryDir, '../../packages/text/src/index.ts'),
      '@pineappleui/text-area/': `${path.resolve(galleryDir, '../../packages/text-area/src')}/`,
      '@pineappleui/text-area': path.resolve(galleryDir, '../../packages/text-area/src/index.ts'),
      '@pineappleui/text-field/': `${path.resolve(galleryDir, '../../packages/text-field/src')}/`,
      '@pineappleui/text-field': path.resolve(galleryDir, '../../packages/text-field/src/index.ts'),
      '@pineappleui/theme/': `${path.resolve(galleryDir, '../../packages/theme/src')}/`,
      '@pineappleui/theme': path.resolve(galleryDir, '../../packages/theme/src/index.ts'),
      '@pineappleui/tokens/': `${path.resolve(galleryDir, '../../packages/tokens/src')}/`,
      '@pineappleui/tokens': path.resolve(galleryDir, '../../packages/tokens/src/index.ts'),
      '@pineappleui/use-local-storage/': `${path.resolve(galleryDir, '../../packages/use-local-storage/src')}/`,
      '@pineappleui/use-local-storage': path.resolve(galleryDir, '../../packages/use-local-storage/src/index.ts'),
      // @pineappleui-aliases:end
    },
  },
});
