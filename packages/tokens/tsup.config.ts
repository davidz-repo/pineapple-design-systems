import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  // tsup defaults to `.js` for ESM when the package.json `type` is "module".
  // The package.json `exports`/`main`/`module` fields point at `.mjs`, so
  // force the extension to match — keeps the registry contract honest and
  // gives a single source of truth for "what does this package emit".
  outExtension: () => ({ js: '.mjs' }),
  dts: true,
  clean: true,
  treeshake: true,
  sourcemap: true,
  target: 'es2020',
  outDir: 'dist',
});
