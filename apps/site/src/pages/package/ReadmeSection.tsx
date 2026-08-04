import { use } from 'react';

import { Text } from '@pineappleui/text';

import { MarkdownView } from '../../components/MarkdownView';
import { readmeFor } from '../../content';

// The package's own README, which is the same text npm and GitHub show. The
// page header already carries the package name, so the README's own `# h1`
// would repeat it; cross-links to sibling packages become internal routes on
// the way through MarkdownView.
export function ReadmeSection({ slug }: { slug: string }) {
  const readme = use(readmeFor(slug));
  if (readme === null) {
    return <Text as="p" size="3" color="gray">This package ships no README.</Text>;
  }
  return <MarkdownView markdown={readme} stripLeadingH1 />;
}
