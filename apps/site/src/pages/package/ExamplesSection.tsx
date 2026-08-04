import { use, useId, useState } from 'react';

import { Button } from '@pineappleui/button';
import { Heading } from '@pineappleui/heading';
import { Inline } from '@pineappleui/inline';
import { Stack } from '@pineappleui/stack';
import { Text } from '@pineappleui/text';

import { CodeBlock } from '../../components/CodeBlock';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { storySourceFor } from '../../stories';
import { humanizeExportName } from './humanize';
import { orderByDeclaration, sourceOfExport } from './storySource';

import type { StoryExport } from '../../stories';

// Each named story export from the package's own *.stories.tsx, rendered as a
// titled canvas. The stories assume a Radix <Theme> is in scope — the site's
// DesignSystemProvider supplies the one and only.
//
// This opens the Overview, above the README, because "what does it look like"
// is the question a component's docs page is opened with, and it used to be a
// tab nobody clicked. The README follows; a props table will follow that.
export function ExamplesSection({
  slug,
  examples,
}: {
  slug: string;
  examples: Array<[string, StoryExport]>;
}) {
  // The story FILE, as text. The module next door is the same file compiled,
  // and a compiled module cannot show what it was written as — nor what ORDER
  // it was written in, which is why the text is read whether or not anyone
  // opens a disclosure.
  const source = use(storySourceFor(slug));
  const labelId = useId();

  return (
    <section aria-labelledby={labelId}>
      <Stack gap="5">
        <Heading as="h2" size="5" id={labelId}>Examples</Heading>
        {orderByDeclaration(examples, source).map(([name, Story]) => (
          <Example
            key={name}
            name={name}
            Story={Story}
            source={source === null ? undefined : sourceOfExport(source, name)}
          />
        ))}
      </Stack>
    </section>
  );
}

function Example({
  name,
  Story,
  source,
}: {
  name: string;
  Story: StoryExport;
  source: string | undefined;
}) {
  const [isSourceShown, setIsSourceShown] = useState(false);
  const sourceId = useId();
  const title = humanizeExportName(name);

  return (
    <Stack gap="2">
      <Heading as="h3" size="3">{title}</Heading>
      {/* A boundary per example, not per page: these are other packages' story
          files rendering live, and one of them throwing must cost its own
          canvas rather than every example below it and the README under those. */}
      <ErrorBoundary
        fallback={error => (
          <div className="example-canvas example-canvas-failed">
            <Stack gap="1">
              <Text as="p" size="2" weight="medium">This example failed to render.</Text>
              <Text as="p" size="1" color="gray">{error.message}</Text>
            </Stack>
          </div>
        )}
      >
        <div className="example-canvas">
          <Story />
        </div>
      </ErrorBoundary>
      {source !== undefined && (
        <>
          {/* Inline so the button keeps its own width: a Stack is a flex column
              and would stretch it across the page. */}
          <Inline gap="2">
            {/* The visible text is the same on every one of these, and a reader
                pulling up the page's buttons got a list of identical "Show
                code"s. The name says which example — starting with the visible
                text, so a voice-control user can still say what they read
                (WCAG 2.5.3). */}
            <Button
              size="1"
              variant="ghost"
              color="gray"
              aria-expanded={isSourceShown}
              aria-controls={sourceId}
              aria-label={`${isSourceShown ? 'Hide' : 'Show'} code for ${title}`}
              onClick={() => setIsSourceShown(shown => !shown)}
            >
              {isSourceShown ? 'Hide code' : 'Show code'}
            </Button>
          </Inline>
          {/* The region stays in the document so `aria-controls` always names
              something real; what it costs to draw — a full syntax highlight
              per example — happens only once someone asks for it. */}
          <div id={sourceId}>
            {isSourceShown && <CodeBlock code={source} language="tsx" subject={title} />}
          </div>
        </>
      )}
    </Stack>
  );
}
