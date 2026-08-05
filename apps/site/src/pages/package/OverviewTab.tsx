import { Suspense } from 'react';

import { Stack } from '@pineappleui/stack';

import { ExamplesSection } from './ExamplesSection';
import { PropsSection } from './PropsSection';
import { ReadmeSection } from './ReadmeSection';
import { SectionSkeleton } from './TabSkeleton';

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
// Props gets its own Suspense boundary, and the two above it do not: their
// chunks are what the tab's boundary (PackagePage) already waits on, while the
// props table is a separate lazy JSON that nothing above the fold needs. Held
// under the same boundary it would keep the examples and the README off the
// screen for a file that sits four screens down.
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
      <Suspense fallback={<SectionSkeleton />}>
        <PropsSection slug={slug} />
      </Suspense>
    </Stack>
  );
}
