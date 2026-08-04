import type { ComponentType } from 'react';

import { cachedLoader } from './content';

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

// The same files again, as text. Two globs of one pattern rather than one:
// `?raw` is a different module (the source string) from the compiled one, and
// Vite emits each as its own lazy chunk — so the text is fetched alongside the
// module rather than inside it.
//
// A page that shows any example reads this, expanded disclosures or not: it is
// what "Show code" discloses AND what puts the examples in the order their file
// declares them (ExamplesSection.tsx), which is a decision made before anything
// is drawn. The chunk is the story file's own source, next to the story chunk
// that was compiled from it.
const storySources = import.meta.glob<string>(
  '../../../packages/*/src/**/*.stories.{ts,tsx}',
  { query: '?raw', import: 'default' },
);

// Stable per-slug promises so components can `use()` them under Suspense —
// see content.ts for why the returned function must stay synchronous.
export const storyModuleFor = cachedLoader(storyModules);
export const storySourceFor = cachedLoader(storySources);

// Filters out non-story exports such as live-region's `export default
// { title }` object — a story is always a render function.
export function isStoryExport(value: unknown): value is StoryExport {
  return typeof value === 'function';
}
