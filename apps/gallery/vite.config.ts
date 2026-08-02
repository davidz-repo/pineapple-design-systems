import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// `__dirname` does not exist in an ESM module, and this workspace is
// `"type": "module"` — so the upstream config's `path.resolve(__dirname, ...)`
// becomes the same call against a dirname derived from `import.meta.url`.
const galleryDir = path.dirname(fileURLToPath(import.meta.url));

// No `plugins: [react()]` here on purpose: Ladle already applies its own React
// plugin to every story, and a second copy in the merged config transforms each
// file twice. Vite's `mergeConfig` concatenates plugin arrays rather than
// deduplicating them, so this is a real double-transform, not a no-op.
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
      '@pineappleui/tokens/': `${path.resolve(galleryDir, '../../packages/tokens/src')}/`,
      '@pineappleui/tokens': path.resolve(galleryDir, '../../packages/tokens/src/index.ts'),
      '@pineappleui/use-local-storage/': `${path.resolve(galleryDir, '../../packages/use-local-storage/src')}/`,
      '@pineappleui/use-local-storage': path.resolve(galleryDir, '../../packages/use-local-storage/src/index.ts'),
      // @pineappleui-aliases:end
    },
  },
});
