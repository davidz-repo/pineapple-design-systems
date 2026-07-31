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
  external: ['react', 'react-dom', '@radix-ui/themes'],
});
