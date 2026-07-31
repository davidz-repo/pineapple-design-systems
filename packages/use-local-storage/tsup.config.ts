import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  // tsup defaults to `.js` for ESM when package.json `type` is "module".
  // Force `.mjs` so the registry contract matches the `exports` field.
  outExtension: () => ({ js: '.mjs' }),
  dts: true,
  clean: true,
  treeshake: true,
  sourcemap: true,
  target: 'es2020',
  outDir: 'dist',
  // React must stay a peer dep — without `external`, tsup would inline
  // `useState` into the published .mjs and consumers would end up with
  // two React copies (the classic "invalid hook call" footgun).
  external: ['react'],
});
