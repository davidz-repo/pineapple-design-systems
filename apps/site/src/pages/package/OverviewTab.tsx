import { Stack } from '@pineappleui/stack';

import { ExamplesSection } from './ExamplesSection';
import { PropsSection } from './PropsSection';
import { ReadmeSection } from './ReadmeSection';

import type { StoryExport } from '../../stories';

// The tab a package page opens on, in the order the questions get asked:
//
//   1. Examples — what does it look like, running, with the code that made it;
//   2. README   — what does it do, in the package's own words;
//   3. Props    — the whole surface, generated from the package's own types.
//
// Examples were their own tab until this section existed. A tab is a place a
// reader has to decide to go, and the live component is the reason the page is
// open — so it is the page, not a destination inside it.
//
// Props carries its own Suspense and error boundaries, and the two above it do
// not: their chunks are what the tab's boundary (PackagePage) already waits on,
// while the props table is a separate lazy JSON that nothing above the fold
// needs. Both live INSIDE PropsSection rather than here, so that its `<section>`
// and its h2 can sit outside them — the page's heading outline is a guarantee
// (docs/plan.md) and a heading that disappears for the length of an import is
// not one.
export function OverviewTab({
  slug,
  examples,
}: {
  slug: string;
  examples: Array<[string, StoryExport]>;
}) {
  return (
    <Stack gap="6">
      {examples.length > 0 && <ExamplesSection slug={slug} examples={examples} />}
      <ReadmeSection slug={slug} />
      <PropsSection slug={slug} />
    </Stack>
  );
}
