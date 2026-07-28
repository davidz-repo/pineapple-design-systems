// Vitest factory for Pineapple workspace packages.
//
// Produces a Vitest config preloaded with React + jsdom + the shared setup
// file, then shallow-merges caller overrides on top. Future component
// packages (`@pineappleui/button`, etc.) will consume this so they all share
// the same testing environment.
//
// Usage:
//   // vitest.config.ts
//   import { definePineappleVitest } from '@pineappleui/vitest-preset';
//   export default definePineappleVitest({
//     test: { include: ['src/**/*.test.{ts,tsx}'] },
//   });

import react from '@vitejs/plugin-react';

import type { ViteUserConfig } from 'vitest/config';

// Vitest 4 renamed the user-config type from `UserConfig` to `ViteUserConfig`
// at `vitest/config` (the old name now resolves to `vite`'s `UserConfig`).
// `ViteUserConfig` is the Vite config with Vitest's `test` field extension —
// the right type for what `defineConfig` from `vitest/config` accepts.

/**
 * Build a Vitest config with the Pineapple defaults.
 *
 * Merges `overrides.plugins` and `overrides.test` shallowly with the
 * preset defaults. Any non-`plugins`/`test` keys are passed through
 * unchanged so callers can extend `resolve`, `define`, etc.
 */
export function definePineappleVitest(overrides: ViteUserConfig = {}): ViteUserConfig {
  const { plugins: overridePlugins, test: overrideTest, ...rest } = overrides;

  return {
    ...rest,
    plugins: [react(), ...(overridePlugins ?? [])],
    test: {
      environment: 'jsdom',
      setupFiles: ['@pineappleui/vitest-preset/setup'],
      css: true,
      ...overrideTest,
    },
  };
}
