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
  // React stays a peer; lucide-react stays external so only the icons actually
  // referenced by the name map bundle into the consumer (no dead icon weight).
  external: ['react', 'react-dom', 'lucide-react'],
});
