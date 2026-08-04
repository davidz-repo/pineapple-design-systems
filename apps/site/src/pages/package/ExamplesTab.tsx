import { Heading } from '@pineappleui/heading';
import { Stack } from '@pineappleui/stack';

import { humanizeExportName } from './humanize';

import type { StoryExport } from '../../stories';

// Each named story export from the package's own *.stories.tsx, rendered as
// a titled canvas. The stories assume a Radix <Theme> is in scope — the
// site's DesignSystemProvider supplies the one and only.
export function ExamplesTab({ examples }: { examples: Array<[string, StoryExport]> }) {
  return (
    <Stack gap="5">
      {examples.map(([name, Story]) => (
        <Stack key={name} gap="2">
          <Heading as="h2" size="4">{humanizeExportName(name)}</Heading>
          <div className="example-canvas">
            <Story />
          </div>
        </Stack>
      ))}
    </Stack>
  );
}
