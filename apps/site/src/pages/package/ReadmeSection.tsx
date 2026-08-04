import { use, useId } from 'react';

import { Heading } from '@pineappleui/heading';
import { Stack } from '@pineappleui/stack';
import { Text } from '@pineappleui/text';

import { MarkdownView } from '../../components/MarkdownView';
import { readmeFor } from '../../content';

// The package's own README, which is the same text npm and GitHub show. The
// page header already carries the package name, so the README's own `# h1`
// would repeat it; cross-links to sibling packages become internal routes on
// the way through MarkdownView.
//
// The `## README` above it is the site's, not the file's, and it is what makes
// every package page have the SAME outline: h1 package name, h2 Examples, h2
// README, h2 Props when that lands. Without it the README's own `##` sections
// sat at the same level as "Examples" — a reader moving by heading heard a flat
// list of section names with nothing saying which of them was the README's.
// Those sections are demoted one level to sit under it (`headingOffset`), which
// the Changelog tab does not do: there the file IS the page.
export function ReadmeSection({ slug }: { slug: string }) {
  const readme = use(readmeFor(slug));
  const labelId = useId();

  return (
    <section aria-labelledby={labelId}>
      <Stack gap="2">
        <Heading as="h2" size="5" id={labelId}>README</Heading>
        {readme === null
          ? <Text as="p" size="3" color="gray">This package ships no README.</Text>
          : <MarkdownView markdown={readme} stripLeadingH1 headingOffset={1} />}
      </Stack>
    </section>
  );
}
