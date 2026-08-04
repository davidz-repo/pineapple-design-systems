import { Stack } from '@pineappleui/stack';

import { ExamplesSection } from './ExamplesSection';
import { ReadmeSection } from './ReadmeSection';

import type { StoryExport } from '../../stories';

// The tab a package page opens on, in the order the questions get asked:
//
//   1. Examples — what does it look like, running, with the code that made it;
//   2. README   — what does it do, in the package's own words;
//   3. Props    — the table, once it is generated from the source (not yet;
//                 it slots in below with no other change to this file).
//
// Examples were their own tab until this section existed. A tab is a place a
// reader has to decide to go, and the live component is the reason the page is
// open — so it is the page, not a destination inside it.
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
    </Stack>
  );
}
