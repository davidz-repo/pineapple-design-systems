import { definePineappleVitest } from '@pineappleui/vitest-preset';

export default definePineappleVitest({
  test: {
    // `scripts/**/*.test.mjs` is the props extractor's own suite. It drives the
    // TypeScript compiler API over real files, so it declares
    // `@vitest-environment node` per file rather than the jsdom the components
    // need — and it is `.mjs` because the thing it tests IS the plain ESM script
    // the `props` task runs.
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.mjs'],

    // Above `SUSPENSE_TIMEOUT`, which is the point.
    //
    // `src/test-helpers.tsx` gives every wait on a lazily imported story,
    // README or story source a 10s ceiling, deliberately, because those are
    // real dynamic imports that had already missed testing-library's 1s default
    // twice on a loaded CI runner. Vitest's own default `testTimeout` is 5000ms
    // — so a 10s wait budget was sitting inside a 5s test budget and could
    // never be reached. The test is killed at 5s while its `findBy*` still
    // believes it has another five seconds to wait, and the failure reads
    // `Test timed out in 5000ms` rather than naming the query that was still
    // pending. `retitles the document per page and per tab` awaits four of
    // those 10s waits in sequence.
    //
    // This is not headroom for a slow suite; it is the value that makes the
    // ceiling the helper already declares mean what it says. Raise
    // SUSPENSE_TIMEOUT and this has to move with it. It costs nothing on a
    // passing run, which resolves these in milliseconds.
    testTimeout: 20_000,
  },
});
