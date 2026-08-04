import type { ComponentType } from 'react';

// The site renders the packages' own Ladle stories: named exports become the
// Examples section, and the `Playground` export (args + argTypes attached)
// drives the playground. The types below are a local mirror of the slice of
// Ladle's `Story` shape those stories use — the site deliberately does not
// depend on @ladle/react. The stories import it type-only, so nothing of
// Ladle's reaches this bundle; a story that ever imports a VALUE from
// @ladle/react would drag its runtime in here (it would resolve — it is
// installed for the gallery), which is why docs/plan.md calls that out.

export interface StoryArgType {
  options?: readonly (string | number)[];
  control?: { type: string };
  defaultValue?: unknown;
}

export type StoryExport = ComponentType<Record<string, unknown>> & {
  args?: Record<string, unknown>;
  argTypes?: Record<string, StoryArgType>;
};

export type StoryModule = Record<string, unknown>;

// Lazy on purpose: each package page pulls only its own story chunk. Path is
// relative to THIS file (src/ -> repo root is three levels up).
const storyModules = import.meta.glob<StoryModule>(
  '../../../packages/*/src/**/*.stories.{ts,tsx}',
);

// Stable per-slug promises so components can `use()` them under Suspense.
// Synchronous on purpose: `use` needs the same promise instance across render
// retries, and an async wrapper would mint a fresh (uncached) promise per
// call, suspending the component forever.
const storyCache = new Map<string, Promise<StoryModule | null>>();

// eslint-disable-next-line ts/promise-function-async -- hands back the cached promise itself; async would break `use()` identity
export function storyModuleFor(slug: string): Promise<StoryModule | null> {
  let promise = storyCache.get(slug);
  if (promise === undefined) {
    const loader = Object.entries(storyModules)
      .find(([p]) => p.includes(`/packages/${slug}/src/`))?.[1];
    promise = loader === undefined ? Promise.resolve(null) : loader();
    storyCache.set(slug, promise);
  }
  return promise;
}

// Filters out non-story exports such as live-region's `export default
// { title }` object — a story is always a render function.
export function isStoryExport(value: unknown): value is StoryExport {
  return typeof value === 'function';
}
