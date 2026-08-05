import { definePineappleVitest } from '@pineappleui/vitest-preset';

export default definePineappleVitest({
  // `scripts/**/*.test.mjs` is the props extractor's own suite. It drives the
  // TypeScript compiler API over real files, so it declares
  // `@vitest-environment node` per file rather than the jsdom the components
  // need — and it is `.mjs` because the thing it tests IS the plain ESM script
  // the `props` task runs.
  test: { include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.mjs'] },
});
