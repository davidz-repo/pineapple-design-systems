import { use } from 'react';

import { Text } from '@pineappleui/text';

import { MarkdownView } from '../../components/MarkdownView';
import { readmeFor } from '../../content';

export function OverviewTab({ slug }: { slug: string }) {
  const readme = use(readmeFor(slug));
  if (readme === null) {
    return <Text as="p" size="3" color="gray">This package ships no README.</Text>;
  }
  // The page header already shows the package name; the README's own `# h1`
  // would repeat it.
  return <MarkdownView markdown={readme} stripLeadingH1 />;
}
