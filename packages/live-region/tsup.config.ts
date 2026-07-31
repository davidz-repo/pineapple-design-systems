import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  outExtension: () => ({ js: '.mjs' }),
  dts: true,
  clean: true,
  treeshake: true,
  sourcemap: true,
  target: 'es2020',
  outDir: 'dist',
  // React stays a peer — consumers supply one copy via the hoist. No Radix here:
  // LiveRegion is a pure aria wrapper.
  external: ['react', 'react-dom'],
});
