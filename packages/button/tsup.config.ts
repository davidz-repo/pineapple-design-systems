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
  // React + Radix stay peers — consumers supply one copy via the hoist.
  external: ['react', 'react-dom', '@radix-ui/themes'],
});
