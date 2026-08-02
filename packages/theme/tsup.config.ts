import { defineConfig } from 'tsup';

export default defineConfig({
  // Two entries, and only one of them is JavaScript: the stylesheet ships
  // alongside the module as `@pineappleui/theme/styles.css`.
  entry: ['src/index.ts', 'src/styles.css'],
  format: ['esm'],
  outExtension: () => ({ js: '.mjs' }),
  // Scoped to the JS entry. With a bare `dts: true` tsup tries to emit a .d.ts
  // for the CSS entry too, and the build fails.
  dts: { entry: 'src/index.ts' },
  clean: true,
  treeshake: true,
  sourcemap: true,
  target: 'es2020',
  outDir: 'dist',
  // Ship the stylesheet verbatim: esbuild's `copy` loader neither parses nor
  // bundles it, so the `@import`s inside stay `@import`s and are resolved by
  // the CONSUMER's bundler against their own tree — which is why the packages
  // those imports name are runtime `dependencies` of this package rather than
  // anything tsup has to know about.
  loader: { '.css': 'copy' },
  // React + Radix stay peers; tokens + use-local-storage are workspace
  // dependencies. All five stay external so the consumer installs one copy of
  // each rather than receiving a second one inlined here.
  external: [
    'react',
    'react-dom',
    '@radix-ui/themes',
    '@pineappleui/tokens',
    '@pineappleui/use-local-storage',
  ],
});
