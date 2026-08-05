import react from '@vitejs/plugin-react';
import { copyFileSync } from 'node:fs';
import path from 'node:path';

import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// With the extension, and this file is the reason the shared tsconfig turns
// `allowImportingTsExtensions` on: Vite's native config loader resolves this
// import itself, and it will not add one. Extensionless, it loads today and
// warns that it is scheduled to stop.
import { SITE_ACCENT_COLOR, SITE_SCALING } from './src/site-theme.ts';

import type { Plugin } from 'vite';

// `__dirname` does not exist in an ESM module, and this workspace is
// `"type": "module"` — same shim as the gallery's config.
const siteDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(siteDir, '../..');

// Injects the theme package's first-paint script into index.html. The import
// is dynamic and lives inside the hook, not at top level: it resolves through
// node_modules → the theme's `dist/` (the src aliases below configure the app
// module graph, not this config process), so @pineappleui/theme must be built
// before this runs — the `dev` script pre-builds it via turbo, and CI's
// `^build` dependency guarantees it for `vite build`. `injectTo: 'body'` is
// load-bearing: the script paints `#root` and returns silently when the
// element is not parsed yet, so head placement would be a permanent no-op;
// end-of-body still executes before the deferred module script.
//
// `accentColor` is passed here AND to <DesignSystemProvider> in main.tsx, from
// the same constant: this script paints first and React paints second, so a
// pair that disagrees is one frame of the wrong accent — the flash the script
// exists to remove. Pinning it is what makes the site's palette reach a
// returning visitor who still has another accent in localStorage from before
// the picker was removed.
function foucScriptPlugin(): Plugin {
  return {
    name: 'pineapple-fouc-script',
    async transformIndexHtml() {
      const { getFoucScript } = await import('@pineappleui/theme');
      return [{
        tag: 'script',
        children: getFoucScript({
          accentColor: SITE_ACCENT_COLOR,
          scaling: SITE_SCALING,
        }),
        injectTo: 'body',
      }];
    },
  };
}

// GitHub Pages serves 404.html for unknown paths; a copy of the built
// index.html (fouc script and asset tags included) boots the SPA there, and
// the router then resolves the deep link client-side.
function spaFallbackPlugin(): Plugin {
  return {
    name: 'pineapple-spa-fallback',
    apply: 'build',
    closeBundle() {
      copyFileSync(
        path.join(siteDir, 'dist/index.html'),
        path.join(siteDir, 'dist/404.html'),
      );
    },
  };
}

export default defineConfig({
  // The site is served from the root of its custom domain
  // (https://designpineapple.com — repo Settings → Pages → Custom domain), so
  // the base is '/'. If the custom domain ever comes off, Pages falls back to
  // the project path and this must become '/pineapple-design-systems/'.
  base: '/',
  plugins: [react(), foucScriptPlugin(), spaFallbackPlugin()],
  server: {
    // Ports are allocated per app: Ladle owns 6006 (apps/gallery).
    port: 6007,
    // The README/CHANGELOG/story globs in src/lib/ read packages/*/ directly.
    fs: { allow: [repoRoot] },
  },
  resolve: {
    // Every @pineappleui/* package resolves to its SOURCE, not to `dist/`, so
    // a component or story edit shows up on reload with no build in between —
    // same rationale and same fence markers as apps/gallery/vite.config.ts.
    //
    // The bare key matches subpaths too (vite appends a trailing slash before
    // testing), so the more-specific subpath key must come FIRST or
    // `@pineappleui/text/x` rewrites to `.../src/index.ts/x`.
    //
    // Tooling packages (eslint-config, tsconfig, vitest-preset) are absent by
    // design: nothing the site renders imports them. Keep this block in sync
    // with `paths` in tsconfig.json — src/alias-fences.test.ts asserts both
    // fences and the manifest's devDependencies cover every public package.
    alias: {
      // @pineappleui-aliases:start
      '@pineappleui/badge/': `${path.resolve(siteDir, '../../packages/badge/src')}/`,
      '@pineappleui/badge': path.resolve(siteDir, '../../packages/badge/src/index.ts'),
      '@pineappleui/box/': `${path.resolve(siteDir, '../../packages/box/src')}/`,
      '@pineappleui/box': path.resolve(siteDir, '../../packages/box/src/index.ts'),
      '@pineappleui/button/': `${path.resolve(siteDir, '../../packages/button/src')}/`,
      '@pineappleui/button': path.resolve(siteDir, '../../packages/button/src/index.ts'),
      '@pineappleui/card/': `${path.resolve(siteDir, '../../packages/card/src')}/`,
      '@pineappleui/card': path.resolve(siteDir, '../../packages/card/src/index.ts'),
      '@pineappleui/heading/': `${path.resolve(siteDir, '../../packages/heading/src')}/`,
      '@pineappleui/heading': path.resolve(siteDir, '../../packages/heading/src/index.ts'),
      '@pineappleui/icon-button/': `${path.resolve(siteDir, '../../packages/icon-button/src')}/`,
      '@pineappleui/icon-button': path.resolve(siteDir, '../../packages/icon-button/src/index.ts'),
      '@pineappleui/icons/': `${path.resolve(siteDir, '../../packages/icons/src')}/`,
      '@pineappleui/icons': path.resolve(siteDir, '../../packages/icons/src/index.ts'),
      '@pineappleui/inline/': `${path.resolve(siteDir, '../../packages/inline/src')}/`,
      '@pineappleui/inline': path.resolve(siteDir, '../../packages/inline/src/index.ts'),
      '@pineappleui/live-region/': `${path.resolve(siteDir, '../../packages/live-region/src')}/`,
      '@pineappleui/live-region': path.resolve(siteDir, '../../packages/live-region/src/index.ts'),
      '@pineappleui/stack/': `${path.resolve(siteDir, '../../packages/stack/src')}/`,
      '@pineappleui/stack': path.resolve(siteDir, '../../packages/stack/src/index.ts'),
      '@pineappleui/text/': `${path.resolve(siteDir, '../../packages/text/src')}/`,
      '@pineappleui/text': path.resolve(siteDir, '../../packages/text/src/index.ts'),
      '@pineappleui/text-area/': `${path.resolve(siteDir, '../../packages/text-area/src')}/`,
      '@pineappleui/text-area': path.resolve(siteDir, '../../packages/text-area/src/index.ts'),
      '@pineappleui/text-field/': `${path.resolve(siteDir, '../../packages/text-field/src')}/`,
      '@pineappleui/text-field': path.resolve(siteDir, '../../packages/text-field/src/index.ts'),
      '@pineappleui/theme/': `${path.resolve(siteDir, '../../packages/theme/src')}/`,
      '@pineappleui/theme': path.resolve(siteDir, '../../packages/theme/src/index.ts'),
      '@pineappleui/tokens/': `${path.resolve(siteDir, '../../packages/tokens/src')}/`,
      '@pineappleui/tokens': path.resolve(siteDir, '../../packages/tokens/src/index.ts'),
      '@pineappleui/use-local-storage/': `${path.resolve(siteDir, '../../packages/use-local-storage/src')}/`,
      '@pineappleui/use-local-storage': path.resolve(siteDir, '../../packages/use-local-storage/src/index.ts'),
      // @pineappleui-aliases:end
    },
  },
});
